/// <reference lib="dom" />
/**
 * Visual baselines: every demo page (catalogue, theme builder, layouts,
 * admin) at 1440 and 375, light and dark, reduced to a perceptual hash and
 * compared with examples/tests/visual-baseline.json. A page that drifts
 * past the tolerance fails, naming the page, the distance and the
 * screenshot to look at. `--update` (deno task test:visual:update)
 * rewrites the baseline from the current build.
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
import { launch } from "./browser.ts";

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

const pages = [
  "index.html",
  "forms.html",
  "data.html",
  "charts.html",
  "cards.html",
  "navigation.html",
  "actions.html",
  "feedback.html",
  "marketing.html",
  "theme-builder.html",
  "layouts/index.html",
  "layouts/stacked.html",
  "layouts/sidebar.html",
  "layouts/rail.html",
  "layouts/split.html",
  "layouts/article.html",
  "layouts/docs.html",
  "layouts/auth.html",
  "layouts/focus.html",
  "admin/dashboard.html",
  "admin/projects.html",
  "admin/team.html",
  "admin/profile.html",
  "admin/invoice.html",
  "admin/tables.html",
  "admin/forms.html",
  "admin/settings.html",
  "admin/lock-screen.html",
  "admin/404.html",
];
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
  await new Promise((r) => setTimeout(r, path === "charts.html" || path === "admin/dashboard.html" ? 1500 : 500));
}

/** Renders one page at one width in both themes; returns key → { hash, png }. */
async function render(path: string, width: number): Promise<Record<string, { hash: string; png: string }> | string> {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.setViewport({ width, height: width < 768 ? 812 : 900 });
  await page.evaluateOnNewDocument(() => localStorage.clear());
  try {
    await page.goto(`file://${root}/${path}`, { waitUntil: "networkidle0", timeout: 30000 });
  } catch (e) {
    await page.close();
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
  await page.close();
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

for (const path of pages) {
  if (only.length && !only.some((o) => path.includes(o))) continue;
  for (const width of widths) {
    let renders = await render(path, width);
    if (typeof renders === "string") {
      issues.push(renders);
      continue;
    }
    const drifted = Object.entries(renders).filter(([key, r]) => drift(key, r.hash));
    if (drifted.length) {
      // A capture can land on a one-off state (a list measured before layout,
      // a late-decoded image). One fresh render decides; a drift that repeats
      // is a real change.
      const again = await render(path, width);
      if (typeof again !== "string") renders = again;
    }
    for (const [key, r] of Object.entries(renders)) {
      current[key] = r.hash;
      if (saveAll) await keep(key, r.png);
      if (!update && baseline[platform]?.[key]) compared++;
      const d = drift(key, r.hash);
      if (d) issues.push(`${d} — ${await keep(key, r.png)}`);
    }
  }
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
if (issues.length) {
  console.log(issues.map((i) => `  - ${i}`).join("\n"));
  console.log("A wanted change: review the screenshot, then `deno task test:visual:update` and commit the baseline.");
  exit(1);
}
