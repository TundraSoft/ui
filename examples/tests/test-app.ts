/// <reference lib="dom" />
/**
 * End-to-end: boots the example rAPId app (examples/app/) on an OS-assigned
 * port and drives it with a real Chrome — asserting that every
 * server-driven piece swaps IN PLACE (no navigation), that every layout
 * page stands at phone and desktop widths, that the form round-trips
 * rAPId's error shape, and that the error templates answer 404/500.
 * `UI_ASSETS=cdn` runs the same suite against the published CDN bundle.
 */
import { ensureDir } from "@tundralibs/compat/file";
import { exit, getEnv } from "@tundralibs/compat/runtime";
import type { ElementHandle, Page } from "puppeteer-core";
import { createApp } from "../app/app.ts";
import { layoutNames } from "../shared/layout-samples.ts";
import { chartTypes } from "../../components/chart/chart.ts";
import { isNetworkNoise, launch } from "./browser.ts";

const env = getEnv();
const assets = env.UI_ASSETS === "cdn" ? "cdn" : "/ui";
const outDir = ".test-output/app";
await ensureDir(outDir);

const app = await createApp({ port: 0, assets, quiet: true });
await app.start();
const base = `http://127.0.0.1:${app.port}`;

const issues: string[] = [];
const fail = (s: string) => issues.push(s);
const ok = (cond: unknown, s: string) => {
  if (!cond) fail(s);
};
const pause = (ms = 300) => new Promise((r) => setTimeout(r, ms));
/** Replace an input's value by typing (select-all, then keystrokes). */
async function retype(page: Page, selector: string, text: string) {
  await click(page, selector);
  await page.$eval(selector, (el) => (el as HTMLInputElement).select());
  await page.keyboard.type(text);
}
/** Centre the element first — Puppeteer's own scroll can park it under the sticky header. */
async function click(page: Page, target: string | ElementHandle<Element>) {
  const el = typeof target === "string" ? await page.$(target) : target;
  if (!el) throw new Error(`No element for ${target}`);
  await page.evaluate((e) => e.scrollIntoView({ block: "center" }), el);
  await el.click();
}

const browser = await launch();

/** A fresh page that records console/page errors and a navigation marker. */
async function open(path: string, width = 1280): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  page.on("pageerror", (e) => fail(`${path}: pageerror ${e}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !isNetworkNoise(m)) fail(`${path}: console.error ${m.text()}`);
  });
  const res = await page.goto(`${base}${path}`, { waitUntil: "networkidle0" });
  ok(res?.ok(), `${path}: status ${res?.status()}`);
  // Survives only while no full navigation happens.
  await page.evaluate(() => {
    (globalThis as unknown as { __alive: number }).__alive = 1;
    document.addEventListener("rapid:swapped", () => {
      const g = globalThis as unknown as { __swaps: number };
      g.__swaps = (g.__swaps ?? 0) + 1;
    });
    // Count regions that wore the busy veil (busy.js) while a swap was in flight.
    const g = globalThis as unknown as { __busy: number };
    g.__busy = 0;
    new MutationObserver((ms) => {
      for (const m of ms) if ((m.target as Element).hasAttribute("data-busy")) g.__busy++;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-busy"], subtree: true });
  });
  return page;
}
const stillSamePage = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as { __alive?: number }).__alive === 1);
const swaps = (page: Page) => page.evaluate(() => (globalThis as unknown as { __swaps?: number }).__swaps ?? 0);
async function waitForSwaps(page: Page, n: number, label: string) {
  try {
    await page.waitForFunction((n) => ((globalThis as unknown as { __swaps?: number }).__swaps ?? 0) >= n, {
      timeout: 5000,
    }, n);
  } catch {
    fail(`${label}: expected ${n} rapid:swapped event(s), got ${await swaps(page)}`);
  }
  // Every swap rides a View Transition; while it animates the page is
  // covered by the transition pseudo-elements and a click lands nowhere.
  await page.evaluate(async () => {
    const t = (document as unknown as { activeViewTransition?: { finished: Promise<void> } }).activeViewTransition;
    if (t) await t.finished.catch(() => {});
  });
  await pause(150);
}

/* --------------------------------------------------------------- home */
{
  const page = await open("/");
  const head = await page.evaluate(() => ({
    css: document.querySelector('link[rel="stylesheet"]')?.getAttribute("href") ?? "",
    integrity: document.querySelector('link[rel="stylesheet"]')?.getAttribute("integrity") ?? "",
    scripts: [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src") ?? ""),
    rapid: typeof (globalThis as unknown as { rapid?: unknown }).rapid,
    history: typeof (globalThis as unknown as { rapid?: { history?: unknown } }).rapid?.history,
    js: document.documentElement.classList.contains("js"),
    skip: !!document.querySelector('.skip-link[href="#main-content"]') && !!document.getElementById("main-content"),
    toastRegion: !!document.getElementById("toast-region"),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  if (assets === "cdn") {
    ok(
      head.css.startsWith("https://cdn.jsdelivr.net/npm/@tundralibs/ui@"),
      `home: CDN stylesheet expected, got ${head.css}`,
    );
    ok(head.integrity.startsWith("sha384-"), "home: CDN stylesheet has no integrity attribute");
    ok(
      head.scripts.some((s) => s.startsWith("https://cdn.jsdelivr.net/") && s.endsWith("/ui.js")),
      "home: CDN script missing",
    );
  } else {
    ok(
      /^\/ui\/ui\.css\?v=[0-9a-f]+$/.test(head.css),
      `home: self-hosted stylesheet should be fingerprinted, got ${head.css}`,
    );
    ok(
      head.scripts.some((s) => /^\/ui\/ui\.js\?v=[0-9a-f]+$/.test(s)),
      `home: self-hosted script should be fingerprinted, got ${head.scripts}`,
    );
  }
  ok(head.scripts.includes("/__rapid/ui.js"), "home: rAPId runtime script missing");
  ok(head.scripts.includes("/__rapid/history.js"), "home: history module script missing");
  ok(head.rapid === "object", "home: window.rapid not defined — runtime did not load");
  ok(head.history === "object", "home: rapid.history not defined");
  ok(head.js, "home: enhance.js did not add html.js — ui.js not loaded");
  ok(head.skip, "home: skip link / #main-content missing");
  ok(head.toastRegion, "home: core did not render the toast region");
  ok(head.bodyBg !== "rgba(0, 0, 0, 0)", "home: ui.css did not apply (body has no canvas colour)");

  // Lazy region replaced its skeleton with server stats.
  const lazy = await page.waitForSelector("#stats .stat", { timeout: 5000 }).catch(() => null);
  ok(lazy, "home: data-load region never received the stats fragment");
  ok(!(await page.$("#stats .skeleton")), "home: skeleton still present after lazy load");

  // Toast appended from the server, page intact.
  const before = await swaps(page);
  await click(page, '[data-action="/fragments/toast"]');
  await waitForSwaps(page, before + 1, "home toast");
  await click(page, '[data-action="/fragments/toast"]');
  await waitForSwaps(page, before + 2, "home toast");
  const toasts = await page.$$eval("#toast-region .toast", (els) => els.map((e) => e.textContent?.trim() ?? ""));
  ok(
    toasts.length === 2 && toasts[1].includes("from the server"),
    `home: expected 2 server toasts, got ${JSON.stringify(toasts)}`,
  );
  ok(await stillSamePage(page), "home: toast click caused a full navigation");
  await page.screenshot({ path: `${outDir}/home.png`, fullPage: true });
  await page.close();
}

/* ------------------------------------------------------------ layouts */
for (const name of layoutNames) {
  for (const width of [375, 1440]) {
    const page = await open(`/layouts/${name}`, width);
    await pause(200);
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      main: !!document.getElementById("main-content"),
      frame: document.querySelector(".layout")?.className ?? "",
    }));
    ok(r.overflow <= 0, `layouts/${name}@${width}: page overflows by ${r.overflow}px`);
    ok(r.main, `layouts/${name}@${width}: no #main-content`);
    ok(r.frame.includes(`layout--${name}`), `layouts/${name}@${width}: frame class missing (${r.frame})`);
    if (width === 1440) await page.screenshot({ path: `${outDir}/layout-${name}.png` });
    await page.close();
  }
}
{
  const page = await open("/layouts");
  const links = await page.$$eval(
    "#main-content a.card, #main-content .card a, #main-content a[href^='/layouts/']",
    (els) => els.length,
  );
  ok(links >= layoutNames.length, `layouts index: expected ${layoutNames.length} layout links, found ${links}`);
  await page.close();
}

/* -------------------------------------------------- components index */
{
  const page = await open("/components");
  const groups = await page.$$eval("#main-content a[href^='/components/']", (els) => els.length);
  ok(groups >= 7, `components: expected 7 group cards, found ${groups}`);
  await page.close();
}

/* --------------------------------------------- components: data page */
{
  let page = await open("/components/data");
  ok(await page.$("[data-catalogue='data-table']"), "data: data-table section not rendered");

  // Sort the projects table: the page route answers the swap with just that table.
  await click(page, '#projects a.data-table__sort[data-action*="psort=name"]');
  await waitForSwaps(page, 1, "data projects sort");
  const sorted = await page.evaluate(() => ({
    aria: document.querySelector("#projects th[aria-sort]")?.getAttribute("aria-sort"),
    first: document.querySelector("#projects tbody tr td")?.textContent?.trim(),
    url: location.search,
    sections: document.querySelectorAll("[data-catalogue]").length,
    tables: document.querySelectorAll("#projects").length,
  }));
  ok(sorted.aria === "ascending", `data: projects sort did not apply (aria-sort=${sorted.aria})`);
  ok(sorted.first === "Project 1", `data: first row after name asc should be Project 1, got ${sorted.first}`);
  ok(sorted.url.includes("psort=name"), `data: sort was not pushed to history (${sorted.url})`);
  ok(
    sorted.sections > 5 && sorted.tables === 1,
    `data: swap replaced more than the table (${sorted.sections} sections, ${sorted.tables} tables)`,
  );
  ok(await stillSamePage(page), "data: sort caused a full navigation");
  const busy = await page.evaluate(() => ({
    seen: (globalThis as unknown as { __busy: number }).__busy,
    left: document.querySelectorAll("[data-busy]").length,
  }));
  ok(busy.seen > 0, "data: the table never wore the busy veil while its swap was in flight");
  ok(busy.left === 0, `data: ${busy.left} region(s) still marked busy after the swap`);

  // Page 2 via pagination — outer-swaps the same table.
  await click(page, '#projects .pagination a[aria-label="Page 2"]');
  await waitForSwaps(page, 2, "data projects page");
  const paged = await page.evaluate(() => ({
    current: document.querySelector("#projects .pagination [aria-current=page]")?.textContent?.trim(),
    url: location.search,
    rows: document.querySelectorAll("#projects tbody tr").length,
  }));
  ok(paged.current === "2", `data: pagination did not move to page 2 (${paged.current})`);
  ok(paged.rows === 5, `data: expected 5 rows on page 2, got ${paged.rows}`);
  ok(paged.url.includes("page=2"), `data: page was not pushed to history (${paged.url})`);

  // Back button re-fetches the previous region state (no DOM cache).
  await page.goBack({ waitUntil: "networkidle0" }).catch(() => {});
  await pause(400);
  const back = await page.evaluate(() =>
    document.querySelector("#projects .pagination [aria-current=page]")?.textContent?.trim()
  );
  ok(back === "1", `data: back navigation did not restore page 1 (${back})`);

  // A pushed URL is a page route: a full reload renders the whole page, sorted.
  await page.goto(`${base}/components/data?psort=name&pdir=desc&page=1`, { waitUntil: "networkidle0" });
  const reloaded = await page.evaluate(() => ({
    sections: document.querySelectorAll("[data-catalogue]").length,
    aria: document.querySelector("#projects th[aria-sort]")?.getAttribute("aria-sort"),
    first: document.querySelector("#projects tbody tr td")?.textContent?.trim(),
  }));
  ok(
    reloaded.sections > 5 && reloaded.aria === "descending" && reloaded.first === "Project 9",
    `data: reload of a pushed URL wrong (${JSON.stringify(reloaded)})`,
  );
  await page.close();

  // Invoices sort — only that table is replaced; the projects table stays.
  page = await open("/components/data");
  await click(page, '#invoices a.data-table__sort[data-action*="sort=client"]');
  await waitForSwaps(page, 1, "data invoices sort");
  const inv = await page.evaluate(() => ({
    aria: document.querySelector("#invoices th[aria-sort]")?.getAttribute("aria-sort"),
    first: document.querySelector("#invoices tbody tr td:nth-child(3)")?.textContent?.trim(),
    projects: !!document.querySelector("#projects"),
  }));
  ok(inv.aria === "ascending", `data: invoices sort did not apply (${inv.aria})`);
  ok(inv.first === "Adventure Works", `data: invoices not sorted by client (${inv.first})`);
  ok(inv.projects, "data: invoices swap wiped the projects table");
  ok(await stillSamePage(page), "data: a swap caused a full navigation");
  await page.screenshot({ path: `${outDir}/components-data.png`, fullPage: true });
  await page.close();
}

/* -------------------------------------------- components: forms page */
{
  const page = await open("/components/forms");
  for (
    const sel of ["#reviewer", "#period", "#otp-sms-value", "#concurrency", "#cat-dz-1", "#invite-date, #cat-fl-1"]
  ) {
    ok(await page.$(sel), `forms page: ${sel} missing`);
  }

  // Combobox: typing asks the server for a new list.
  await retype(page, "#reviewer", "ada");
  await waitForSwaps(page, 1, "forms page combobox");
  await pause(200);
  const options = await page.$$eval(
    "#reviewer-list [role=option]",
    (els) => els.map((e) => e.textContent?.trim() ?? ""),
  );
  if (
    !(options.some((o) => o.includes("Ada Grant")) && options.some((o) => o.includes("Ada Lovelace")) &&
      !options.some((o) => o.includes("Grace")))
  ) {
    fail(`forms page: combobox list not server-filtered for "ada": ${JSON.stringify(options)}`);
  }

  // Date picker: month navigation and a day pick re-render the picker from the server.
  const n2 = await swaps(page);
  const monthBefore = await page.$eval("#period .datepicker__month", (e) => e.textContent?.trim() ?? "").catch(() =>
    ""
  );
  const navs = await page.$$("#period a.datepicker__nav");
  ok(navs.length === 4, `forms page: expected 4 datepicker nav links (year/month), found ${navs.length}`);
  const nextMonth = await page.$('#period a.datepicker__nav[data-nav="next"]');
  if (nextMonth) {
    await click(page, nextMonth);
    await waitForSwaps(page, n2 + 1, "forms page month nav");
    await pause(200);
    const monthAfter = await page.$eval("#period .datepicker__month", (e) => e.textContent?.trim() ?? "").catch(() =>
      ""
    );
    ok(monthAfter && monthAfter !== monthBefore, `forms page: month did not change (${monthBefore} → ${monthAfter})`);
    const day = await page.$('#period a[data-day="2026-10-05"]');
    ok(day, "forms page: October 5 day link missing after month nav");
    if (day) {
      await click(page, day);
      await waitForSwaps(page, n2 + 2, "forms page day pick");
      await pause(200);
      const picked = await page.evaluate(() => ({
        start: (document.querySelector("#period [data-datepicker-start]") as HTMLInputElement | null)?.value,
        url: location.search,
      }));
      ok(picked.start === "2026-10-05", `forms page: day pick did not set the start date (${picked.start})`);
      ok(picked.url.includes("day=2026-10-05"), `forms page: day pick was not pushed (${picked.url})`);
    }
  }
  // Editor preview: the server renders the Markdown and the runtime swaps it in.
  const n3 = await swaps(page);
  await page.$eval("#note", (el) => {
    (el as HTMLTextAreaElement).value =
      "# Title\n\nSome **bold** text and `code`.\nSecond line.\n\n- one\n- two\n\n---";
  });
  await click(page, '#note-editor [data-editor-view="preview"]');
  await waitForSwaps(page, n3 + 1, "forms page editor preview");
  const preview = await page.$eval("#note-editor [data-editor-preview-panel]", (el) => el.innerHTML);
  ok(
    preview.includes("<h1>Title</h1>") && preview.includes("<strong>bold</strong>") &&
      preview.includes("<li>two</li>") &&
      preview.includes("<br>Second line.") && preview.includes("<hr>"),
    `forms page: preview was not rendered by the server (${preview.slice(0, 120)})`,
  );
  ok(await stillSamePage(page), "forms page: a swap caused a full navigation");
  await page.close();
}

/* --------------------------------------- components: navigation page */
{
  const page = await open("/components/navigation");
  await retype(page, "#palette input", "csv");
  await waitForSwaps(page, 1, "navigation page command");
  await pause(200);
  const cmds = await page.$$eval("#palette-list [role=option]", (els) => els.map((e) => e.textContent?.trim() ?? ""));
  ok(
    cmds.length === 1 && cmds[0].includes("CSV"),
    `navigation page: command list not server-filtered for "csv": ${JSON.stringify(cmds)}`,
  );
  await page.close();
}

/* ------------------------------------------- components: charts page */
{
  const page = await open("/components/charts");
  await page.waitForFunction(
    (n) => document.querySelectorAll("[data-chart] .apexcharts-canvas").length >= n,
    { timeout: 10000 },
    chartTypes.length,
  ).catch(() => {});
  const charts = await page.evaluate((types: string[]) => ({
    missing: types.filter((t) => !document.querySelector(`#cat-chart-${t} .apexcharts-canvas`)),
    fill: (document.querySelector("#cat-chart-line .apexcharts-text") as SVGElement | null)?.getAttribute("fill"),
  }), [...chartTypes]);
  ok(charts.missing.length === 0, `charts page: chart types not rendered: ${charts.missing.join(", ")}`);
  ok(
    charts.fill && charts.fill !== "#373d3f" && charts.fill !== "#000000",
    `charts page: chart text is not on the library's tokens (fill ${charts.fill})`,
  );
  await click(page, "[data-theme-toggle]");
  await page.waitForFunction(
    (before) =>
      (document.querySelector("#cat-chart-line .apexcharts-text") as SVGElement | null)?.getAttribute("fill") !==
        before,
    { timeout: 5000 },
    charts.fill,
  ).catch(() => {});
  const rethemed = await page.evaluate(() => ({
    fill: (document.querySelector("#cat-chart-line .apexcharts-text") as SVGElement | null)?.getAttribute("fill"),
    drawn: document.querySelectorAll("[data-chart] .apexcharts-canvas").length,
    total: document.querySelectorAll("[data-chart]").length,
  }));
  ok(
    rethemed.fill !== charts.fill,
    `charts page: charts did not re-render on the theme switch (fill ${charts.fill} → ${rethemed.fill})`,
  );
  ok(
    rethemed.drawn === rethemed.total,
    `charts page: ${rethemed.total - rethemed.drawn} chart(s) lost on the theme switch`,
  );
  await page.close();
}

/* ---------------------------------- components: cards, actions, feedback */
for (
  const [path, sel] of [["/components/cards", "#cat-tabs-1"], ["/components/actions", "#gh-card"], [
    "/components/feedback",
    "#cat-modal-1",
  ]] as const
) {
  const page = await open(path);
  ok(await page.$(sel), `${path}: ${sel} missing`);
  ok(await page.$("[data-catalogue]"), `${path}: no catalogue sections`);
  await page.close();
}

/* --------------------------------------------------------------- forms */
{
  const page = await open("/forms");
  ok(await page.$("#signup"), "forms: form missing");
  // Submit with mistakes: the server's RapidFormError comes back as the form, in place.
  await page.type("#name", "A");
  await page.type("#email", "ada@example"); // passes the browser's own check, fails the server's
  await click(page, '#signup button[type="submit"]');
  await waitForSwaps(page, 1, "forms invalid submit");
  await pause(200);
  const err = await page.evaluate(() => ({
    alert: document.querySelector("#signup .alert--danger .alert__title")?.textContent?.trim(),
    fieldErrors: [...document.querySelectorAll("#signup .form-field__error, #signup [role=alert].form-field__error")]
      .map((e) => e.textContent?.trim()),
    name: (document.getElementById("name") as HTMLInputElement | null)?.value,
    invalid: document.getElementById("email")?.getAttribute("aria-invalid"),
    page: !!document.querySelector("#app-navbar"),
  }));
  ok(err.alert === "Please fix the highlighted fields.", `forms: form-level error missing (${err.alert})`);
  ok(
    err.fieldErrors.some((e) => e?.includes("valid email")),
    `forms: per-field email error missing (${JSON.stringify(err.fieldErrors)})`,
  );
  ok(err.name === "A", `forms: submitted value not re-filled (${err.name})`);
  ok(err.invalid === "true", `forms: email not marked aria-invalid (${err.invalid})`);
  ok(err.page && await stillSamePage(page), "forms: invalid submit caused a navigation");

  // Fix it: success state swaps in.
  await page.click("#name", { clickCount: 3 });
  await page.type("#name", "Ada Lovelace");
  await page.click("#email", { clickCount: 3 });
  await page.type("#email", "ada@example.com");
  await click(page, '#signup button[type="submit"]');
  await waitForSwaps(page, 2, "forms valid submit");
  await pause(200);
  const done = await page.$eval("#signup .alert--success .alert__title", (e) => e.textContent?.trim()).catch(() =>
    null
  );
  ok(done?.includes("Welcome, Ada Lovelace"), `forms: success state missing (${done})`);
  ok(await stillSamePage(page), "forms: valid submit caused a navigation");
  await page.screenshot({ path: `${outDir}/forms.png`, fullPage: true });
  await page.close();

  // Without JavaScript the same route redirects (PRG) to a rendered success page.
  const noJs = await browser.newPage();
  await noJs.setJavaScriptEnabled(false);
  await noJs.goto(`${base}/forms`, { waitUntil: "load" });
  await noJs.type("#name", "Grace Hopper");
  await noJs.type("#email", "grace@example.com");
  await Promise.all([noJs.waitForNavigation({ waitUntil: "load" }), noJs.click('#signup button[type="submit"]')]);
  const prg = await noJs.evaluate(() => ({
    url: location.pathname + location.search,
    title: document.querySelector("#signup .alert--success .alert__title")?.textContent?.trim(),
  }));
  ok(prg.url.startsWith("/forms?welcome=Grace"), `forms (no-js): expected PRG redirect, landed on ${prg.url}`);
  ok(prg.title?.includes("Welcome, Grace Hopper"), `forms (no-js): success page missing (${prg.title})`);
  await noJs.close();
}

/* -------------------------------------------------------------- errors */
for (
  const [path, status, heading] of [["/this-page-does-not-exist", 404, "Not found"], [
    "/errors/boom",
    500,
    "Something went wrong",
  ]] as const
) {
  const page = await browser.newPage();
  const res = await page.goto(`${base}${path}`, { waitUntil: "networkidle0" });
  ok(res?.status() === status, `${path}: expected ${status}, got ${res?.status()}`);
  const e = await page.evaluate(() => ({
    page: !!document.querySelector(".error-page"),
    h1: document.querySelector(".error-page h1")?.textContent?.trim(),
    inline: document.querySelectorAll("[style]").length,
    css: !!document.querySelector('link[rel="stylesheet"]'),
    title: document.title,
  }));
  ok(e.page && e.h1 === heading, `${path}: library error page not rendered (${JSON.stringify(e)})`);
  ok(e.inline === 0, `${path}: error page has ${e.inline} inline style attribute(s) — CSP §9`);
  ok(e.css, `${path}: error page rendered outside the core (no stylesheet)`);
  ok(e.title.startsWith(String(status)), `${path}: title should carry the status (${e.title})`);
  await page.screenshot({ path: `${outDir}/error-${status}.png` });
  await page.close();
}

/* ---------------------------------------------------------- inline CSP */
{
  // Every page: no inline style/script anywhere (the app must run under a strict CSP).
  for (
    const path of [
      "/",
      "/layouts/sidebar",
      "/components",
      "/components/data",
      "/components/forms",
      "/components/charts",
      "/forms",
    ]
  ) {
    const res = await fetch(`${base}${path}`);
    const text = await res.text();
    ok(!/ style="/.test(text), `${path}: inline style attribute in markup`);
    ok(
      !/<script>|<script [^>]*>[^<]/.test(text.replace(/<script [^>]*src=[^>]*><\/script>/g, "")),
      `${path}: inline <script> block in markup`,
    );
    ok(!/<style/.test(text), `${path}: inline <style> block in markup`);
  }
}

await browser.close();
await app.stop();

console.log(`\n${issues.length} issue(s) in the example app (${assets} assets). Screenshots in ${outDir}/`);
if (issues.length) {
  console.log(issues.map((i) => `  - ${i}`).join("\n"));
  exit(1);
}
