/// <reference lib="dom" />
/**
 * Sweeps every demo page listed in demo/pages.json (the site, the layout
 * and error frames, the admin example app): screenshots it, captures
 * console/page errors and failed requests, and asserts the computed
 * background actually changes under data-theme=dark (not just that the
 * attribute flips — see examples/tests/test-admin.ts's own note on why
 * that distinction matters).
 *
 * On the site pages it also holds the navigation rule: the collapsible
 * sidebar is the only navigation. No links in the header, no breadcrumb,
 * no in-page link index; the current page is marked in the sidebar with
 * every group above it open; every site page is linked from the sidebar
 * exactly once and every sidebar link leads to a page that exists. Once,
 * on the overview, it drives the chrome: collapse to the rail and back
 * (and that it persists), a rail flyout, the theme and density switches,
 * and the phone drawer.
 */
import { ensureDir, pathExists, readTextFile, realPath } from "@tundralibs/compat/file";
import { exit } from "@tundralibs/compat/runtime";
import type { Page } from "puppeteer-core";
import { isBlockedRequest, isNetworkNoise, launch } from "./browser.ts";

const outDir = ".test-output/all-pages";
await ensureDir(outDir);

const root = await realPath("demo");
const manifest = JSON.parse(await readTextFile("demo/pages.json")) as {
  site: string[];
  frames: string[];
  admin: string[];
};
const sitePages = new Set(manifest.site);
const pages = [...manifest.site, ...manifest.frames, ...manifest.admin];

type Issue = { page: string; kind: string; detail: string };
const issues: Issue[] = [];
const fail = (page: string, kind: string, detail: string) => issues.push({ page, kind, detail });
const pause = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const browser = await launch();

/** Where every sidebar link points, from every site page: each target must be linked once and exist. */
const linkedFrom: Record<string, string[]> = {};

async function siteChrome(page: Page, path: string): Promise<void> {
  const nav = await page.evaluate(() => {
    const sidebar = document.getElementById("site-sidebar");
    const current = sidebar?.querySelectorAll('.menu__link[aria-current="page"]') ?? [];
    const hrefs = [...(sidebar?.querySelectorAll("a.menu__link") ?? [])].map((a) => a.getAttribute("href"));
    // Every sublist that holds the current link must be open, and its toggle say so.
    const closedAbove = current.length === 1
      ? (() => {
        const bad: string[] = [];
        let sub = current[0]!.closest(".menu__sublist");
        while (sub) {
          const toggle = document.querySelector(`[data-toggle="#${CSS.escape(sub.id)}"]`);
          if (sub.hasAttribute("hidden") || toggle?.getAttribute("aria-expanded") !== "true") bad.push(sub.id);
          sub = sub.parentElement!.closest(".menu__sublist");
        }
        return bad;
      })()
      : [];
    const header = document.querySelector(".layout__header");
    return {
      sidebar: Boolean(sidebar),
      collapsible: Boolean(sidebar?.querySelector("[data-collapse]")),
      current: current.length,
      currentHref: current[0]?.getAttribute("href") ?? null,
      closedAbove,
      hrefs,
      headerLinks: header ? [...header.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")) : [],
      breadcrumbs: document.querySelectorAll(".layout__header .breadcrumb, .site-page > .page-header .breadcrumb")
        .length,
      linkIndex: document.querySelectorAll(".cat-nav").length,
      depth: Math.max(
        0,
        ...[...(sidebar?.querySelectorAll(".menu__link") ?? [])].map((l) => {
          let n = 0;
          for (let s = l.closest(".menu__sublist"); s; s = s.parentElement!.closest(".menu__sublist")) n++;
          return n;
        }),
      ),
    };
  });
  if (!nav.sidebar) {
    fail(path, "nav", "no #site-sidebar");
    return;
  }
  if (!nav.collapsible) fail(path, "nav", "the sidebar has no collapse toggle");
  if (nav.current !== 1) fail(path, "nav", `${nav.current} sidebar links marked current, expected 1`);
  if (nav.closedAbove.length) {
    fail(path, "nav", `groups above the current page are closed: ${nav.closedAbove.join(", ")}`);
  }
  if (nav.headerLinks.length) fail(path, "nav", `the header carries links (${nav.headerLinks.join(", ")})`);
  if (nav.breadcrumbs) fail(path, "nav", "a breadcrumb in the page chrome");
  if (nav.linkIndex) fail(path, "nav", "an in-page link index (.cat-nav)");
  if (nav.depth < 2) fail(path, "nav", `the sidebar nests ${nav.depth} level(s) deep, expected sub-groups`);
  // Hrefs are relative to the page; resolve them against the demo root.
  const target = (href: string | null) => new URL(href ?? "", `file:///demo/${path}`).pathname.slice("/demo/".length);
  if (target(nav.currentHref) !== path) fail(path, "nav", `the current link points at ${nav.currentHref}`);
  const seen = new Set<string>();
  for (const href of nav.hrefs) {
    const t = target(href);
    if (seen.has(t)) fail(path, "nav", `the sidebar links ${t} twice`);
    seen.add(t);
    (linkedFrom[t] ??= []).push(path);
  }
}

for (const path of pages) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.clear());
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 1440, height: 900 });

  page.on("console", (msg) => {
    if ((msg.type() === "error" || msg.type() === "warn") && !isNetworkNoise(msg)) {
      fail(path, `console.${msg.type()}`, msg.text());
    }
  });
  page.on("pageerror", (err) => fail(path, "pageerror", String(err)));
  page.on(
    "requestfailed",
    (req) => !isBlockedRequest(req) && fail(path, "requestfailed", `${req.url()} — ${req.failure()?.errorText}`),
  );

  try {
    await page.goto(`file://${root}/${path}`, { waitUntil: "networkidle0", timeout: 20000 });
  } catch (e) {
    fail(path, "load-failed", String(e));
    await page.close();
    continue;
  }
  await pause(200);

  const html = await readTextFile(`demo/${path}`);
  if (/ style="/.test(html)) fail(path, "csp", "markup contains an inline style attribute (§9)");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 0) fail(path, "overflow", `page overflows horizontally by ${overflow}px`);
  if (sitePages.has(path)) await siteChrome(page, path);

  const fileSlug = path.replace(/\//g, "_").replace(".html", "");
  await page.screenshot({ path: `${outDir}/${fileSlug}-light.png` });

  const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await pause();
  const bgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.screenshot({ path: `${outDir}/${fileSlug}-dark.png` });
  if (bgAfter === bgBefore) {
    fail(path, "dark-mode-no-op", `body background-color unchanged after data-theme=dark (${bgBefore})`);
  }
  await page.close();
}

/* Every site page is in the sidebar once; every sidebar link exists. */
for (const path of manifest.site) {
  if (!linkedFrom[path]) fail(path, "nav", "not linked from the sidebar");
}
for (const target of Object.keys(linkedFrom)) {
  if (!(await pathExists(`demo/${target}`))) {
    fail(target, "nav", `sidebar link to a missing page (from ${linkedFrom[target]![0]})`);
  }
}

/* ------------------------------------------------- the chrome, driven */
{
  const path = "index.html";
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 1440, height: 900 });
  page.on("pageerror", (err) => fail(path, "pageerror", String(err)));
  // Clear storage once, then load clean: the reload below must keep what
  // the page stores (sessionStorage is not a reliable flag on file:// —
  // CI's Chrome dropped it across the reload, so a guarded clear wiped
  // the collapsed state it was meant to keep).
  await page.goto(`file://${root}/${path}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });

  // Collapse to the rail: narrower, labels hidden, persisted across a reload.
  const width = () => page.$eval("#site-sidebar", (el) => el.getBoundingClientRect().width);
  /** The sidebar's width once its width transition has finished (two equal reads in a row). */
  const settledWidth = async () => {
    let last = await width();
    for (let i = 0; i < 40; i++) {
      await pause(100);
      const now = await width();
      if (now === last) return now;
      last = now;
    }
    return last;
  };
  const full = await settledWidth();
  await page.click("#site-sidebar [data-collapse]");
  const rail = await settledWidth();
  if (!(rail < full / 2)) fail(path, "chrome", `collapse did not shrink the sidebar (${full} → ${rail})`);
  // A rail parent opens its group as a flyout.
  await page.hover("#site-sidebar .menu__link[data-toggle]");
  await pause(300);
  const flyout = await page.$eval("#site-sidebar", (el) => {
    const f = el.querySelector(".menu__sublist--flyout") as HTMLElement | null;
    return f ? { shown: !f.hidden, width: f.getBoundingClientRect().width } : null;
  });
  if (!flyout?.shown || flyout.width < 120) fail(path, "chrome", `no rail flyout on hover (${JSON.stringify(flyout)})`);
  await page.mouse.move(900, 500);
  await page.reload({ waitUntil: "networkidle0" });
  const restored = await settledWidth();
  if (!(restored < full / 2)) {
    fail(path, "chrome", `the collapsed rail did not persist across a reload (${full} → ${restored})`);
  }
  await page.click("#site-sidebar [data-collapse]");
  const expanded = await settledWidth();
  if (Math.abs(expanded - full) > 2) {
    fail(path, "chrome", `expanding the rail did not restore the sidebar (${expanded}, expected ${full})`);
  }

  // Theme: the header switch loads one stylesheet after the bundle and repaints.
  const canvas = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const before = await canvas();
  await page.select("#site-theme-native", "console");
  await pause(600);
  const themed = await page.evaluate(() => ({
    href: document.getElementById("theme-css")?.getAttribute("href"),
    shown: document.getElementById("site-theme")?.textContent?.trim(),
  }));
  if (!themed.href?.endsWith("examples/themes/console.css")) fail(path, "chrome", `theme href ${themed.href}`);
  if (themed.shown !== "Console") fail(path, "chrome", `the theme select shows "${themed.shown}"`);
  if ((await canvas()) === before) fail(path, "chrome", "the Console theme did not change the canvas");
  await page.select("#site-theme-native", "base");
  await pause(300);
  if (await page.$eval("#theme-css", (el) => el.hasAttribute("href"))) fail(path, "chrome", "Base kept a theme sheet");

  // Density: data-density on <html> rescales every control.
  const control = () => page.$eval("#site-theme", (el) => el.getBoundingClientRect().height);
  const h = await control();
  await page.select("#site-density-native", "compact");
  await pause(300);
  const compact = await control();
  const density = await page.evaluate(() => document.documentElement.dataset.density);
  if (density !== "compact" || !(compact < h)) {
    fail(path, "chrome", `compact density did not apply (${density}, ${h} → ${compact})`);
  }
  await page.select("#site-density-native", "default");
  await page.close();

  // Phone: the sidebar is a drawer behind the header's toggle.
  const phone = await browser.newPage();
  await phone.evaluateOnNewDocument(() => localStorage.clear());
  await phone.setViewport({ width: 375, height: 740 });
  await phone.goto(`file://${root}/components/select.html`, { waitUntil: "networkidle0" });
  const onScreen = () =>
    phone.$eval("#site-sidebar", (el) => {
      const r = el.getBoundingClientRect();
      return r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== "hidden";
    });
  if (await onScreen()) fail("components/select.html", "chrome", "the phone drawer starts open");
  await phone.click(".layout__drawer-toggle");
  await pause(500);
  if (!(await onScreen())) fail("components/select.html", "chrome", "the drawer toggle did not open the sidebar");
  const current = await phone.$eval(
    '#site-sidebar .menu__link[aria-current="page"]',
    (el) => el.getBoundingClientRect().height > 0,
  );
  if (!current) fail("components/select.html", "chrome", "the current page is not visible in the open drawer");
  await phone.keyboard.press("Escape");
  await pause(500);
  if (await onScreen()) fail("components/select.html", "chrome", "Escape did not close the drawer");
  await phone.close();
}

await browser.close();

if (issues.length > 0) console.log(JSON.stringify(issues, null, 2));
console.log(`\n${issues.length} issue(s) found across ${pages.length} pages. Screenshots in ${outDir}/`);
if (issues.length > 0) exit(1);
