/// <reference lib="dom" />
/**
 * Every layout at every viewport band: 375 (phone), 667×375 (phone
 * landscape), 768 (tablet), 1024 (laptop), 1440 and 1920 (wide). Per
 * band it asserts: no horizontal page overflow; the main content region
 * exists and is within its width cap; the navigation is reachable (a
 * visible nav, or a drawer toggle that actually opens it); and no console
 * errors. Screenshots per band land in .test-output/layouts/.
 */
import { ensureDir, realPath } from "@tundralibs/compat/file";
import { exit } from "@tundralibs/compat/runtime";
import { isNetworkNoise, launch } from "./browser.ts";

const outDir = ".test-output/layouts";
await ensureDir(outDir);
const root = await realPath("demo/layouts");

const layouts = ["stacked", "sidebar", "rail", "split", "article", "docs", "auth", "focus"];
const bands = [
  { name: "phone", width: 375, height: 740 },
  { name: "phone-landscape", width: 667, height: 375 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "wide", width: 1440, height: 900 },
  { name: "ultrawide", width: 1920, height: 1080 },
];

const issues: string[] = [];
const fail = (s: string) => issues.push(s);
const pause = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const browser = await launch();

for (const name of layouts) {
  for (const band of bands) {
    const page = await browser.newPage();
    const tag = `${name}@${band.name}`;
    page.on("pageerror", (e) => fail(`${tag}: pageerror ${e}`));
    page.on(
      "console",
      (m) =>
        (m.type() === "error" || m.type() === "warn") && !isNetworkNoise(m) &&
        fail(`${tag}: console.${m.type()} ${m.text()}`),
    );
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.setViewport({ width: band.width, height: band.height });
    await page.goto(`file://${root}/${name}.html`, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await pause();

    // 1. No horizontal overflow of the page itself.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 0) fail(`${tag}: page overflows by ${overflow}px`);

    // 2. Content region exists and respects its cap.
    const content = await page.evaluate(() => {
      const el = document.getElementById("main-content");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { width: r.width, maxWidth: cs.maxWidth, right: r.right };
    });
    if (!content) fail(`${tag}: no #main-content region`);
    else {
      if (content.right > band.width + 1) fail(`${tag}: #main-content extends past the viewport (${content.right}px)`);
      if (band.width >= 1440 && ["article", "docs", "focus", "stacked"].includes(name)) {
        // Reading/boxed frames must not grow without bound.
        const inner = await page.evaluate(() => {
          // Most specific first — a comma list would return the container
          // itself by document order.
          for (
            const sel of [
              "#main-content > .layout__article",
              "#main-content > .grid",
              "#main-content > .card",
              "#main-content",
            ]
          ) {
            const el = document.querySelector(sel);
            if (el) return el.getBoundingClientRect().width;
          }
          return 0;
        });
        if (inner >= band.width - 16) fail(`${tag}: content column is full-bleed (${inner}px) on a wide screen`);
      }
    }

    // 3. Navigation reachable.
    const nav = await page.evaluate(() => {
      const visible = (el: Element | null) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.right > 0 && r.left < innerWidth;
      };
      return {
        sidebar: visible(document.querySelector(".sidebar")),
        navbarNav: visible(document.querySelector(".navbar__nav")),
        navbarToggle: visible(document.querySelector(".navbar__toggle:not(.navbar__toggle--sidebar)")),
        drawerToggle: visible(document.querySelector(".navbar__toggle--sidebar")),
        rail: visible(document.querySelector(".layout__rail")),
        pane: visible(document.querySelector(".layout__pane")),
        isAuthOrFocus: !!document.querySelector(".layout--auth, .layout--focus"),
      };
    });
    const reachable = nav.sidebar || nav.navbarNav || nav.navbarToggle || nav.drawerToggle || nav.rail || nav.pane ||
      nav.isAuthOrFocus;
    if (!reachable) fail(`${tag}: no reachable navigation (${JSON.stringify(nav)})`);

    // Drawer: the toggle must open a sidebar that is actually on screen.
    if (nav.drawerToggle) {
      await page.click(".navbar__toggle--sidebar");
      await pause(400);
      const open = await page.evaluate(() => {
        const el = document.querySelector(".sidebar")!;
        const r = el.getBoundingClientRect();
        return { vis: getComputedStyle(el).visibility, left: r.left, open: el.classList.contains("is-open") };
      });
      if (!open.open || open.vis !== "visible" || open.left !== 0) {
        fail(`${tag}: drawer did not open (${JSON.stringify(open)})`);
      }
      await page.screenshot({ path: `${outDir}/${name}-${band.name}-drawer.png` });
      await page.keyboard.press("Escape");
      await pause(400);
      const closed = await page.evaluate(() => document.querySelector(".sidebar")!.classList.contains("is-open"));
      if (closed) fail(`${tag}: Escape did not close the drawer`);
    }

    // Rail: bottom tab bar on phones must not cover the last content.
    if (name === "rail" && band.width < 768) {
      const ok = await page.evaluate(() => {
        const rail = document.querySelector(".layout__rail")!.getBoundingClientRect();
        return rail.bottom >= innerHeight - 1 && rail.width >= innerWidth - 1;
      });
      if (!ok) fail(`${tag}: rail is not a full-width bottom bar`);
    }

    // Split: exactly one pane visible on phones.
    if (name === "split" && band.width < 768) {
      const v = await page.evaluate(() => ({
        pane: getComputedStyle(document.querySelector(".layout__pane")!).display !== "none",
        detail: getComputedStyle(document.getElementById("main-content")!).display !== "none",
      }));
      if (v.pane === v.detail) fail(`${tag}: split shows ${v.pane && v.detail ? "both" : "neither"} panes on a phone`);
    }

    // Article/docs: aside below content on narrow, beside on wide.
    if ((name === "article" || name === "docs")) {
      const sel = name === "article" ? ".layout__aside" : ".layout__toc";
      const pos = await page.evaluate((sel) => {
        const aside = document.querySelector(sel);
        const art = document.querySelector(".layout__article");
        if (!aside || !art) return null;
        const a = aside.getBoundingClientRect(), c = art.getBoundingClientRect();
        return {
          beside: Math.abs(a.top - c.top) < 40 && a.left >= c.right - 1,
          below: a.top >= c.bottom - 1,
          above: a.bottom <= c.top + 1,
        };
      }, sel);
      const threshold = name === "article" ? 992 : 1200;
      if (pos) {
        if (band.width >= threshold && !pos.beside) fail(`${tag}: aside should sit beside the content`);
        if (band.width < threshold && !(pos.below || pos.above)) {
          fail(`${tag}: aside should stack (above/below) the content`);
        }
      }
    }

    await page.screenshot({ path: `${outDir}/${name}-${band.name}.png`, fullPage: band.width < 768 ? false : true });
    await page.close();
  }
}

await browser.close();
console.log(
  `\n${issues.length} issue(s) across ${layouts.length} layouts × ${bands.length} bands. Screenshots in ${outDir}/`,
);
if (issues.length) {
  console.log(issues.map((i) => `  - ${i}`).join("\n"));
  exit(1);
}
