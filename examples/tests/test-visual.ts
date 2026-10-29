/// <reference lib="dom" />
/**
 * Visual baselines: every demo page listed in demo/pages.json (the site,
 * the layout and error frames, the admin example app) at 1440 and 375,
 * light and dark, reduced to a perceptual hash and compared with
 * examples/tests/visual-baseline.json. A page that drifts
 * past the tolerance fails, naming the page, the distance and the
 * screenshot to look at. `--update` (deno task test:visual:update)
 * rewrites the baseline from the current build.
 *
 * Renders run CONCURRENCY at a time (`TEST_CONCURRENCY`, default 4), each in a
 * browser context of its own; results are kept in page order, so the baseline
 * file is the same whatever order the renders finish in.
 *
 * The hash is a block average: the full-page screenshot is drawn onto a
 * 16-column canvas whose row count follows the page's aspect (16–96 rows),
 * each cell's average grey is quantised to 16 levels — one hex digit per
 * cell. A cell counts as changed when it moved two levels or more. Coarse
 * on purpose: anti-aliasing, a spinner's angle or a font hinting
 * difference never moves a cell that far, a component that lost its
 * styling or a layout that collapsed moves many. Hashes are stored per
 * browser platform (fonts differ between macOS and Linux and so do line
 * wraps); a platform with no baseline passes with a note until someone
 * runs the update there.
 */
import { ensureDir, pathExists, readTextFile, realPath, writeFile, writeTextFile } from "@tundralibs/compat/file";
import { exit, getEnv } from "@tundralibs/compat/runtime";
import { closeIsolated, CONCURRENCY, isolatedPage, launch, pool } from "./browser.ts";

const env = getEnv();
const args = (globalThis as { Deno?: { args: string[] } }).Deno?.args ??
  (globalThis as { process?: { argv: string[] } }).process?.argv?.slice(2) ?? [];
const update = args.includes("--update") || env.VISUAL_UPDATE === "1";
/** Fraction of differing cells a page may drift before it fails (default 5%). */
const tolerance = Number(env.VISUAL_TOLERANCE ?? "0.05");
/** `VISUAL_PAGES=navigation,admin/forms` renders only the pages whose path contains one of these. */
const only = (env.VISUAL_PAGES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
/** `VISUAL_SAVE=1` keeps every screenshot in .test-output/visual/, not only the failing ones. */
const saveAll = env.VISUAL_SAVE === "1";

const BASELINE = "examples/tests/visual-baseline.json";
const outDir = ".test-output/visual";
await ensureDir(outDir);
const root = await realPath("demo");

/** Every page the demo build lists (demo/pages.json): the site, the frames, the admin example app. */
const manifest = JSON.parse(await readTextFile("demo/pages.json")) as {
  site: string[];
  frames: string[];
  admin: string[];
};
const pages = [...manifest.site, ...manifest.frames, ...manifest.admin];
const widths = [1440, 375];
const themes = ["light", "dark"] as const;

type Baseline = Record<string, Record<string, string>>; // platform → key → hash
const baseline: Baseline = (await pathExists(BASELINE)) ? JSON.parse(await readTextFile(BASELINE)) : {};

const browser = await launch();
const hasher = await browser.newPage();
await hasher.goto("about:blank");
const platform = await hasher.evaluate(() => navigator.platform || "unknown");
const current: Record<string, string> = {};
const issues: string[] = [];
let compared = 0;

/**
 * 16 columns × 16–96 rows; each cell is its average grey quantised to 16
 * levels, one hex digit. Levels rather than above/below-the-mean bits: a
 * mostly white page sits close to its mean everywhere, and a hairline
 * moving would flip half the cells of a bit hash.
 */
async function hashOf(pngBase64: string): Promise<string> {
  return await hasher.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const cols = 16;
    const rows = Math.max(16, Math.min(96, Math.round(cols * img.naturalHeight / img.naturalWidth)));
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, cols, rows);
    const { data } = ctx.getImageData(0, 0, cols, rows);
    let hex = "";
    for (let i = 0; i < data.length; i += 4) {
      const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      hex += Math.min(15, Math.floor(grey / 16)).toString(16);
    }
    return hex;
  }, pngBase64);
}

/** Cells whose grey moved by two levels or more (≥ 32/255 — never anti-aliasing, always a change). */
function distance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (Math.abs(parseInt(a[i], 16) - parseInt(b[i], 16)) >= 2) d++;
  return d;
}

async function settle(path: string): Promise<void> {
  // Charts animate their first draw whatever the motion preference.
  await new Promise((r) =>
    setTimeout(r, path === "components/chart.html" || path === "admin/dashboard.html" ? 1500 : 500)
  );
}

/** Renders one page at one width in both themes; returns key → { hash, png }. */
async function render(path: string, width: number): Promise<Record<string, { hash: string; png: string }> | string> {
  // Its own context: renders run side by side (pool), and no tab's storage may reach another's.
  const page = await isolatedPage(browser);
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.setViewport({ width, height: width < 768 ? 812 : 900 });
  await page.evaluateOnNewDocument(() => localStorage.clear());
  try {
    await page.goto(`file://${root}/${path}`, { waitUntil: "networkidle0", timeout: 30000 });
  } catch (e) {
    await closeIsolated(page);
    return `${path}@${width}: load failed: ${e}`;
  }
  const out: Record<string, { hash: string; png: string }> = {};
  for (const theme of themes) {
    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "dark";
      });
    }
    await settle(path);
    // Two frames after fonts and layout settled, so a render never lands mid-paint.
    await page.evaluate(() =>
      document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    );
    const png = await page.screenshot({ encoding: "base64", fullPage: true });
    out[`${path}@${width}-${theme}`] = { hash: await hashOf(png), png };
  }
  await closeIsolated(page);
  return out;
}

async function keep(key: string, png: string): Promise<string> {
  const shot = `${outDir}/${key.replace(/[/@]/g, "_")}.png`;
  await writeFile(shot, Uint8Array.from(atob(png), (c) => c.charCodeAt(0)));
  return shot;
}

/** The drift of one render against the baseline, or undefined when within tolerance. */
function drift(key: string, hash: string): string | undefined {
  const expected = baseline[platform]?.[key];
  if (update || !expected) return undefined;
  if (expected.length !== hash.length) {
    return `${key}: page height changed (${expected.length / 16} → ${hash.length / 16} rows)`;
  }
  const d = distance(expected, hash);
  const cells = hash.length;
  if (d / cells > tolerance) {
    return `${key}: drifted ${d}/${cells} cells (${(100 * d / cells).toFixed(1)}%, tolerance ${100 * tolerance}%)`;
  }
  return undefined;
}

/** One render job per page × width, run CONCURRENCY at a time; results land in job order. */
const jobs = pages.filter((path) => !only.length || only.some((o) => path.includes(o)))
  .flatMap((path) => widths.map((width) => ({ path, width })));
type Outcome = { hashes: [string, string][]; issues: string[] };
const outcomes: Outcome[] = new Array(jobs.length);
console.log(`${jobs.length} page × width renders, ${CONCURRENCY} at a time.`);
await pool(jobs, async ({ path, width }, i) => {
  let renders = await render(path, width);
  if (typeof renders === "string") {
    outcomes[i] = { hashes: [], issues: [renders] };
    return;
  }
  const drifted = Object.entries(renders).filter(([key, r]) => drift(key, r.hash));
  if (drifted.length) {
    // A capture can land on a one-off state (a list measured before layout,
    // a late-decoded image). One fresh render decides; a drift that repeats
    // is a real change.
    const again = await render(path, width);
    if (typeof again !== "string") renders = again;
  }
  const outcome: Outcome = { hashes: [], issues: [] };
  for (const [key, r] of Object.entries(renders)) {
    outcome.hashes.push([key, r.hash]);
    if (saveAll) await keep(key, r.png);
    const d = drift(key, r.hash);
    if (d) outcome.issues.push(`${d} — ${await keep(key, r.png)}`);
  }
  outcomes[i] = outcome;
});
for (const { hashes, issues: found } of outcomes) {
  for (const [key, hash] of hashes) {
    current[key] = hash;
    if (!update && baseline[platform]?.[key]) compared++;
  }
  issues.push(...found);
}

await browser.close();

const total = Object.keys(current).length;
if (update) {
  baseline[platform] = only.length ? { ...baseline[platform], ...current } : current;
  await writeTextFile(BASELINE, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`Baseline updated: ${total} hashes for ${platform} in ${BASELINE}`);
} else if (!baseline[platform]) {
  console.log(
    `No visual baseline for ${platform} (${total} pages rendered). Run \`deno task test:visual:update\` here to create one.`,
  );
} else {
  const missing = total - compared;
  console.log(
    `${issues.length} issue(s). ${compared} of ${total} renders compared with the ${platform} baseline${
      missing ? ` (${missing} new, not yet in it)` : ""
    }.`,
  );
}
// Every hash this run computed, for the artifact: the committed baseline is
// CI's Linux Chrome, which a contributor's machine cannot reproduce.
await writeTextFile(`${outDir}/current.json`, JSON.stringify({ [platform]: current }, null, 2) + "\n");
if (issues.length) {
  console.log(issues.map((i) => `  - ${i}`).join("\n"));
  // One line per drifted render, `VISUAL-HASH <platform>|<key> <hash>`: the
  // new hashes straight from the job log, to merge into the baseline when
  // the change is wanted (no artifact download needed).
  for (const [key, hash] of Object.entries(current)) {
    if (drift(key, hash)) console.log(`VISUAL-HASH ${platform}|${key} ${hash}`);
  }
  console.log("A wanted change: review the screenshot, then `deno task test:visual:update` and commit the baseline.");
  exit(1);
}
