/// <reference lib="dom" />
/**
 * Sweeps every demo page: screenshots it, captures console/page errors,
 * and for themed pages that carry dark-mode blocks, asserts the
 * computed background actually changes under data-theme=dark (not just
 * that the attribute flips — see examples/tests/test-admin.ts's own note on
 * why that distinction matters).
 */
import { ensureDir, realPath } from "@tundralibs/compat/file";
import { exit } from "@tundralibs/compat/runtime";
import { isBlockedRequest, isNetworkNoise, launch } from "./browser.ts";

const outDir = ".test-output/all-pages";
await ensureDir(outDir);

const root = await realPath("demo");

const pages = [
  { path: "index.html", darkMode: true },
  { path: "forms.html", darkMode: true },
  { path: "data.html", darkMode: true },
  { path: "charts.html", darkMode: true },
  { path: "cards.html", darkMode: true },
  { path: "navigation.html", darkMode: true },
  { path: "actions.html", darkMode: true },
  { path: "feedback.html", darkMode: true },
  { path: "admin/dashboard.html", darkMode: true },
  { path: "admin/projects.html", darkMode: true },
  { path: "admin/team.html", darkMode: true },
  { path: "admin/profile.html", darkMode: true },
  { path: "admin/invoice.html", darkMode: true },
  { path: "admin/tables.html", darkMode: true },
  { path: "admin/forms.html", darkMode: true },
  { path: "admin/settings.html", darkMode: true },
  { path: "admin/lock-screen.html", darkMode: true },
  { path: "admin/404.html", darkMode: true },
  { path: "layouts/index.html", darkMode: true },
  { path: "layouts/stacked.html", darkMode: true },
  { path: "layouts/sidebar.html", darkMode: true },
  { path: "layouts/rail.html", darkMode: true },
  { path: "layouts/split.html", darkMode: true },
  { path: "layouts/article.html", darkMode: true },
  { path: "layouts/docs.html", darkMode: true },
  { path: "layouts/auth.html", darkMode: true },
  { path: "layouts/focus.html", darkMode: true },
];

type Issue = { page: string; kind: string; detail: string };
const issues: Issue[] = [];

const browser = await launch();

for (const { path, darkMode } of pages) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 1440, height: 900 });

  page.on("console", (msg) => {
    if ((msg.type() === "error" || msg.type() === "warn") && !isNetworkNoise(msg)) {
      issues.push({ page: path, kind: `console.${msg.type()}`, detail: msg.text() });
    }
  });
  page.on("pageerror", (err) => issues.push({ page: path, kind: "pageerror", detail: String(err) }));
  page.on(
    "requestfailed",
    (req) =>
      !isBlockedRequest(req) &&
      issues.push({ page: path, kind: "requestfailed", detail: `${req.url()} — ${req.failure()?.errorText}` }),
  );

  try {
    await page.goto(`file://${root}/${path}`, { waitUntil: "networkidle0", timeout: 15000 });
  } catch (e) {
    issues.push({ page: path, kind: "load-failed", detail: String(e) });
    await page.close();
    continue;
  }
  await page.evaluate(() => localStorage.clear());
  await new Promise((r) => setTimeout(r, 300));

  const fileSlug = path.replace(/\//g, "_").replace(".html", "");
  await page.screenshot({ path: `${outDir}/${fileSlug}-light.png`, fullPage: true });

  if (darkMode) {
    const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await new Promise((r) => setTimeout(r, 250));
    const bgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.screenshot({ path: `${outDir}/${fileSlug}-dark.png`, fullPage: true });
    if (bgAfter === bgBefore) {
      issues.push({
        page: path,
        kind: "dark-mode-no-op",
        detail: `body background-color unchanged after data-theme=dark (${bgBefore})`,
      });
    }
  }

  await page.close();
}

await browser.close();

if (issues.length > 0) console.log(JSON.stringify(issues, null, 2));
console.log(`\n${issues.length} issue(s) found across ${pages.length} pages. Screenshots in ${outDir}/`);
if (issues.length > 0) exit(1);
