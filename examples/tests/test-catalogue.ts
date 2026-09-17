/// <reference lib="dom" />
/**
 * The catalogue pages (demo/{forms,data,charts,cards,navigation,actions,
 * feedback}.html), three ways:
 *
 * 1. Coverage, statically: every `export function` in components/ and
 *    every literal of every declared variant/size/tone/status union is
 *    referenced by examples/shared/catalogue.ts (+ charts.ts / data.ts).
 *    Add a component or a variant without cataloguing it and this fails.
 * 2. Every page renders: every catalogued section and case is present and
 *    non-empty, every chart drew, no console/page errors, no inline
 *    styles, no horizontal overflow, and the dark toggle changes the
 *    canvas.
 * 3. Behaviour, per page: slider sync, combobox keyboard, inline date
 *    picker, OTP, dropzone (forms); data-table selection + bulk bar +
 *    sticky header (data); command palette (navigation); popover
 *    (actions); and the theme switcher — each theme's computed body
 *    background, light and dark (forms).
 */
import { ensureDir, readDir, readTextFile, realPath } from "@tundralibs/compat/file";
import { exit } from "@tundralibs/compat/runtime";
import type { Page } from "puppeteer-core";
import { catalogue, catalogueGroups } from "../shared/catalogue.ts";
import { iconNames } from "../../shared/icons.ts";
import { isBlockedRequest, isNetworkNoise, launch } from "./browser.ts";

const issues: string[] = [];
const fail = (s: string) => issues.push(s);
const check = (cond: unknown, s: string) => {
  if (!cond) fail(s);
};
const pause = (ms = 150) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------- coverage */
const source = (await readTextFile("examples/shared/catalogue.ts")) +
  (await readTextFile("examples/shared/charts.ts")) +
  (await readTextFile("examples/shared/data.ts"));
const entries = catalogue();
const catalogued = new Set(entries.map((e) => e.name));
const unionNames =
  /^export type ([A-Za-z]+(?:Variant|Size|Tone|Status|Orientation|Tag|Ratio|Type|Width|Mode|Span))\s*=\s*([^;]+);/gm;

for await (const dir of readDir("components", { includeFiles: false })) {
  const path = `components/${dir.name}/${dir.name}.ts`;
  let src: string;
  try {
    src = await readTextFile(path);
  } catch {
    continue; // css-only component (error-page)
  }
  if (!catalogued.has(dir.name)) fail(`coverage: components/${dir.name} has no catalogue entry`);
  for (const fn of src.matchAll(/^export function ([A-Z][A-Za-z]*)\(/gm)) {
    if (fn[1] === "ChartScript") continue; // the engine loader, not a component
    if (!new RegExp(`\\b${fn[1]}\\(`).test(source)) {
      fail(`coverage: ${dir.name}/${fn[1]}() is never rendered by the catalogue`);
    }
  }
  for (const u of src.matchAll(unionNames)) {
    for (const lit of [...u[2].matchAll(/"([a-zA-Z0-9-]+)"/g)].map((m) => m[1])) {
      // As a string literal, or as an object key (`chartSamples` keys types).
      if (!new RegExp(`"${lit}"|\\b${lit}\\s*:`).test(source)) {
        fail(`coverage: ${dir.name}.${u[1]} value "${lit}" is never used by the catalogue`);
      }
    }
  }
}

/* ------------------------------------------------------------ sprite */
{
  const sprite = await readTextFile("dist/icons.svg");
  const missing = iconNames.filter((n) => !sprite.includes(`<symbol id="icon-${n}"`));
  check(missing.length === 0, `sprite: dist/icons.svg lacks ${missing.join(", ")}`);
}

/* ------------------------------------------------------------ render */
const outDir = ".test-output/catalogue";
await ensureDir(outDir);
const root = await realPath("demo");
const browser = await launch();

async function openPage(file: string): Promise<Page> {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 1280, height: 900 });
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warn") && !isNetworkNoise(m)) {
      fail(`${file}: console.${m.type()}: ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => fail(`${file}: pageerror: ${e}`));
  page.on(
    "requestfailed",
    (r) => !isBlockedRequest(r) && fail(`${file}: requestfailed: ${r.url()} — ${r.failure()?.errorText}`),
  );
  // file:// pages share one origin, so a persisted theme toggle from the
  // previous page would leak into this one — clear before the page runs.
  await page.evaluateOnNewDocument(() => localStorage.clear());
  await page.goto(`file://${root}/${file}`, { waitUntil: "networkidle0", timeout: 30000 });
  return page;
}

for (const group of catalogueGroups) {
  const file = `${group.id}.html`;
  const page = await openPage(file);
  const expected = entries.filter((e) => e.group === group.id);
  const html = await readTextFile(`demo/${file}`);
  if (/ style="/.test(html)) fail(`${file}: markup contains an inline style attribute (CSP §9)`);

  const onPage = await page.evaluate(() => ({
    sections: [...document.querySelectorAll("[data-catalogue]")].map((e) => e.getAttribute("data-catalogue")),
    cases: document.querySelectorAll("[data-case]").length,
    emptyCases: [...document.querySelectorAll("[data-case]")].filter((e) =>
      !e.querySelector(".cat-case__body")?.firstElementChild
    ).map((e) => e.getAttribute("data-case")),
    charts: document.querySelectorAll("[data-chart] .apexcharts-canvas").length,
    chartEls: document.querySelectorAll("[data-chart]").length,
    overflow: document.documentElement.scrollWidth - innerWidth,
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  for (const e of expected) if (!onPage.sections.includes(e.name)) fail(`${file}: section ${e.name} missing`);
  const expectedCases = expected.reduce((n, e) => n + e.cases.length, 0);
  check(onPage.cases === expectedCases, `${file}: ${onPage.cases} cases on the page, ${expectedCases} catalogued`);
  check(onPage.emptyCases.length === 0, `${file}: empty cases: ${onPage.emptyCases.join(", ")}`);
  check(onPage.charts === onPage.chartEls, `${file}: ${onPage.chartEls - onPage.charts} chart(s) did not draw`);
  check(onPage.overflow <= 0, `${file}: page overflows horizontally by ${onPage.overflow}px`);

  /* ------------------------------------------------ behaviour, per page */
  if (group.id === "forms") {
    // slider: --slider-pct set by script from the input's value
    const pct = await page.$eval(
      "#concurrency",
      (el) => (el.closest("[data-slider]") as HTMLElement).style.getPropertyValue("--slider-pct"),
    );
    check(pct === "35.48%", `forms: slider --slider-pct synced on load (${pct})`);
    await page.$eval("#concurrency", (el) => {
      (el as HTMLInputElement).value = "1";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const out = await page.$eval(
      "#concurrency",
      (el) => el.closest("[data-slider]")!.querySelector("[data-slider-output]")?.textContent?.trim(),
    );
    check(out === "1 worker", `forms: slider output pluralises via data-slider-unit (${out})`);

    // combobox keyboard (server-driven case, filtered client-side without the runtime)
    await page.$eval("#reviewer-list", (el) => el.setAttribute("hidden", ""));
    await page.focus("#reviewer");
    await pause();
    check(!(await page.$eval("#reviewer-list", (el) => el.hasAttribute("hidden"))), "forms: combobox opens on focus");
    await page.keyboard.press("ArrowDown");
    const active = await page.$eval("#reviewer-list [role=option][data-active]", (el) => el.id).catch(() => null);
    check(active === "reviewer-opt-0", `forms: ArrowDown activates first option (${active})`);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await pause();
    const picked = await page.$eval("#reviewer", (el) => (el as HTMLInputElement).value);
    check(picked === "Graham Bell", `forms: Enter picks the active option (${picked})`);
    check(
      await page.$eval("#reviewer-list", (el) => el.hasAttribute("hidden")),
      "forms: combobox closes after picking",
    );

    // inline date picker: trigger toggles, outside click leaves it open, 7 in-between days
    const dpHidden = () => page.$eval("#period-panel", (el) => el.hasAttribute("hidden"));
    check(!(await dpHidden()), "forms: inline datepicker starts open");
    await page.click("#period [data-datepicker-trigger]");
    await pause();
    check(await dpHidden(), "forms: datepicker trigger closes the panel");
    await page.click("#period [data-datepicker-trigger]");
    await pause();
    check(!(await dpHidden()), "forms: datepicker trigger reopens the panel");
    await page.click("h1");
    await pause();
    check(!(await dpHidden()), "forms: inline datepicker stays open on outside click");
    const inRange = await page.$$eval("#period .datepicker__day--in-range", (els) => els.length);
    check(inRange === 7, `forms: range renders 7 in-between days (${inRange})`);

    // segmented: the thumb follows the checked option
    const thumb = await page.$eval("#cat-seg-md", (el) => ({
      ready: el.hasAttribute("data-segmented-ready"),
      w: (el as HTMLElement).style.getPropertyValue("--segmented-w"),
      x: (el as HTMLElement).style.getPropertyValue("--segmented-x"),
    }));
    check(
      thumb.ready && thumb.w !== "" && thumb.w !== "0px",
      `forms: segmented thumb not placed (${JSON.stringify(thumb)})`,
    );
    // A DOM click: the radio is visually hidden under its label, and a
    // floating panel elsewhere on the page can sit over it in hit-testing.
    await page.$eval("#cat-seg-md-0", (el) => (el as HTMLInputElement).click());
    await pause(400);
    const thumb2 = await page.$eval("#cat-seg-md", (el) => (el as HTMLElement).style.getPropertyValue("--segmented-x"));
    check(thumb2 !== thumb.x, `forms: segmented thumb did not move on change (${thumb.x} → ${thumb2})`);

    // select: combobox-style UI, native <select> is the value
    const nativeHidden = await page.$eval("#cat-sel-native", (el) => getComputedStyle(el).display === "none");
    check(nativeHidden, "forms: enhanced select still shows the native control");
    // Centre first: Puppeteer's own scroll can park the field under the sticky top bar.
    await page.$eval("#cat-sel", (el) => el.scrollIntoView({ block: "center" }));
    await page.click("#cat-sel");
    await pause();
    await page.click('#cat-sel-list [role=option][data-value="b"]');
    await pause();
    const sel = await page.evaluate(() => ({
      native: (document.getElementById("cat-sel-native") as HTMLSelectElement).value,
      shown: (document.getElementById("cat-sel") as HTMLInputElement).value,
      closed: document.getElementById("cat-sel-list")!.hasAttribute("hidden"),
    }));
    check(
      sel.native === "b" && sel.shown === "Beta" && sel.closed,
      `forms: select pick did not sync (${JSON.stringify(sel)})`,
    );
    await page.select("#cat-sel-native", "a");
    await pause();
    const back = await page.$eval("#cat-sel", (el) => (el as HTMLInputElement).value);
    check(back === "Alpha", `forms: native change did not repaint the select UI (${back})`);

    // a Select inside an InputGroup: its list must escape the group (no overflow clip)
    await page.$eval(".input-group .select input[role=combobox]", (el) => el.scrollIntoView({ block: "center" }));
    await page.click(".input-group .select input[role=combobox]");
    await pause();
    const grouped = await page.evaluate(() => {
      const list = document.querySelector(".input-group .select .combobox__list") as HTMLElement;
      const r = list.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + 20, r.top + 20);
      return { hidden: list.hidden, width: r.width, visible: !!hit && list.contains(hit) };
    });
    check(
      !grouped.hidden && grouped.visible && grouped.width >= 150,
      `forms: grouped select list is clipped or missing (${JSON.stringify(grouped)})`,
    );
    await page.keyboard.press("Escape");
    // The caret is part of the control: clicking it opens the list, again closes it.
    await page.click(".input-group .select .combobox__caret");
    await pause();
    const viaCaret = await page.$eval(".input-group .select .combobox__list", (el) => !el.hasAttribute("hidden"));
    check(viaCaret, "forms: clicking the select's caret did not open the list");
    await page.click(".input-group .select .combobox__caret");
    await pause();
    const closedAgain = await page.$eval(".input-group .select .combobox__list", (el) => el.hasAttribute("hidden"));
    check(closedAgain, "forms: clicking the caret again did not close the list");

    // editor: markdown toolbar wraps the selection; html surface mirrors into the textarea
    await page.$eval("#note", (el) => {
      const ta = el as HTMLTextAreaElement;
      ta.focus();
      ta.setSelectionRange(0, 13);
    });
    await page.click('#note-editor [data-editor-cmd="bold"]');
    const md = await page.$eval("#note", (el) => (el as HTMLTextAreaElement).value);
    check(md.startsWith("**Release notes**"), `forms: markdown bold did not wrap the selection (${md.slice(0, 30)})`);
    await page.click('#note-editor [data-editor-view="preview"]');
    await pause();
    const previewShown = await page.evaluate(() => ({
      panel: !document.querySelector("#note-editor [data-editor-preview-panel]")!.hasAttribute("hidden"),
      source: getComputedStyle(document.getElementById("note")!).display === "none",
    }));
    check(
      previewShown.panel && previewShown.source,
      `forms: preview view did not swap in (${JSON.stringify(previewShown)})`,
    );
    await page.click('#note-editor [data-editor-view="write"]');
    const surfaceHtml = await page.$eval("#bio-editor [data-editor-surface]", (el) => el.innerHTML);
    check(
      surfaceHtml.includes("<strong>world</strong>"),
      `forms: html editor surface did not load the value (${surfaceHtml})`,
    );
    await page.click("#bio-editor [data-editor-surface]");
    await page.keyboard.press("End");
    await page.keyboard.type("!");
    const mirrored = await page.$eval("#bio", (el) => (el as HTMLTextAreaElement).value);
    // The caret at End sits inside the <strong>, so the "!" lands in it — what matters is the mirror.
    check(mirrored.includes("world!"), `forms: html editor did not mirror into the textarea (${mirrored})`);
    // Block formats toggle: heading on, heading off returns to a paragraph.
    await page.click('#bio-editor [data-editor-cmd="heading"]');
    const h2 = await page.$eval("#bio", (el) => (el as HTMLTextAreaElement).value);
    check(/<h2>/.test(h2), `forms: html heading did not apply (${h2})`);
    const pressed = await page.$eval(
      '#bio-editor [data-editor-cmd="heading"]',
      (el) => el.getAttribute("aria-pressed"),
    );
    check(pressed === "true", `forms: heading button does not reflect the block (${pressed})`);
    await page.click('#bio-editor [data-editor-cmd="heading"]');
    const p2 = await page.$eval("#bio", (el) => (el as HTMLTextAreaElement).value);
    check(!/<h2>/.test(p2) && /<p>/.test(p2), `forms: html heading did not toggle off (${p2})`);
    // Markdown prefixes toggle too.
    await page.$eval("#note", (el) => {
      const ta = el as HTMLTextAreaElement;
      ta.focus();
      ta.setSelectionRange(0, 0);
    });
    await page.click('#note-editor [data-editor-cmd="heading"]');
    let first = await page.$eval("#note", (el) => (el as HTMLTextAreaElement).value.split("\n")[0]);
    check(first.startsWith("## "), `forms: markdown heading prefix missing (${first})`);
    await page.click('#note-editor [data-editor-cmd="heading"]');
    first = await page.$eval("#note", (el) => (el as HTMLTextAreaElement).value.split("\n")[0]);
    check(!first.startsWith("## "), `forms: markdown heading did not toggle off (${first})`);

    // dropzone progress is a native <progress>
    const progressVal = await page.$eval("progress.dropzone__bar", (el) => (el as HTMLProgressElement).value);
    check(progressVal === 40, `forms: dropzone bar is a native <progress> (${progressVal})`);

    // one-time code
    const carrierHidden = await page.$eval(
      "#otp-sms-value",
      (el) => el.getAttribute("tabindex") === "-1" && el.getAttribute("aria-hidden") === "true",
    );
    check(carrierHidden, "forms: otp carrier input is out of the tab order once enhanced");
    await page.click("#otp-sms-1");
    await page.keyboard.type("12");
    let otpActive = await page.evaluate(() => document.activeElement?.id);
    check(otpActive === "otp-sms-3", `forms: typing two digits advanced focus to cell 3 (${otpActive})`);
    await page.keyboard.type("x9");
    let carrier = await page.$eval("#otp-sms-value", (el) => (el as HTMLInputElement).value);
    check(carrier === "129", `forms: numeric mode drops letters; carrier holds "${carrier}"`);
    await page.keyboard.press("Backspace");
    otpActive = await page.evaluate(() => document.activeElement?.id);
    carrier = await page.$eval("#otp-sms-value", (el) => (el as HTMLInputElement).value);
    check(
      otpActive === "otp-sms-3" && carrier === "12",
      `forms: Backspace walks back and clears (focus ${otpActive}, value "${carrier}")`,
    );
    let completed = false;
    await page.exposeFunction("__otpDone", () => completed = true);
    await page.evaluate(() =>
      document.querySelector("#otp-sms-value")!.closest("[data-otp]")!.addEventListener(
        "otp:complete",
        () => (globalThis as unknown as { __otpDone: () => void }).__otpDone(),
      )
    );
    await page.$eval("#otp-sms-1", (el) => {
      (el as HTMLInputElement).value = "987654";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await pause();
    carrier = await page.$eval("#otp-sms-value", (el) => (el as HTMLInputElement).value);
    check(carrier === "987654", `forms: autofill/paste spread across cells (carrier "${carrier}")`);
    check(completed, "forms: otp:complete fired when every cell filled");
    const prefilled = await page.$$eval(
      "#otp-err-1, #otp-err-2, #otp-err-3, #otp-err-4, #otp-err-5",
      (els) => els.map((e) => (e as HTMLInputElement).value).join(""),
    );
    check(prefilled === "48213", `forms: prefilled value mirrored into cells (${prefilled})`);
    const described = await page.$eval(
      "#otp-err-1",
      (el) => el.getAttribute("aria-describedby") === "otp-err-error" && el.getAttribute("aria-invalid") === "true",
    );
    check(described, "forms: error state wires aria-invalid + aria-describedby on the cells");

    // Every theme: computed body background, light and dark.
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const baseBg = await bodyBg();
    for (const label of ["console", "ledger", "portal", "sunset"]) {
      await page.click(`[data-theme-file$="${label}.css"]`);
      await page.waitForFunction(
        (base) => getComputedStyle(document.body).backgroundColor !== base,
        { timeout: 5000 },
        baseBg,
      ).catch(() => {});
      const bg = await bodyBg();
      check(bg !== baseBg, `forms: ${label} theme did not change the body background (${bg})`);
      await page.click("[data-theme-toggle]");
      await pause(300);
      const dark = await bodyBg();
      await page.click("[data-theme-toggle]");
      await pause(300);
      const light = await bodyBg();
      // A light-first theme changes on the first click; Console is dark-first
      // and only changes on the second (its explicit light variant).
      check(
        dark !== bg || light !== bg,
        `forms: ${label} theme toggle changes background (dark ${dark}, light ${light})`,
      );
      await page.screenshot({ path: `${outDir}/theme-${label}.png` });
      await page.evaluate(() => {
        localStorage.clear();
        delete document.documentElement.dataset.theme;
      });
    }
    await page.click('[data-theme-file=""]');
    await pause(300);
  }

  if (group.id === "data") {
    const bulkHidden = () => page.$eval("#invoices [data-bulk-bar]", (el) => el.hasAttribute("hidden"));
    check(await bulkHidden(), "data: bulk bar hidden with nothing selected");
    await page.click("#invoices [data-select-row]");
    await pause();
    check(!(await bulkHidden()), "data: bulk bar shown after selecting a row");
    let count = await page.$eval("#invoices [data-bulk-count]", (el) => el.textContent);
    check(count === "1 row selected", `data: bulk count singular (${count})`);
    const selectedBg = await page.$eval(
      "#invoices .data-table__row--selected td",
      (el) => getComputedStyle(el).backgroundColor,
    );
    const plainBg = await page.$eval(
      "#invoices tbody tr:nth-child(2) td",
      (el) => getComputedStyle(el).backgroundColor,
    );
    check(selectedBg !== plainBg, `data: selected row is tinted (${selectedBg} vs ${plainBg})`);
    await page.click("#invoices [data-select-all]");
    await pause();
    count = await page.$eval("#invoices [data-bulk-count]", (el) => el.textContent);
    check(count === "7 rows selected", `data: select-all counts every row (${count})`);
    await page.click("#invoices [data-bulk-clear]");
    await pause();
    check(await bulkHidden(), "data: bulk clear empties the selection");
    const stickyTop = await page.$eval("#invoices th", (el) => getComputedStyle(el).position);
    check(stickyTop === "sticky", "data: data-table header is sticky");
    check(await page.$("#projects .pagination [aria-current=page]"), "data: projects table carries its pagination");
  }

  if (group.id === "navigation") {
    await page.focus("#palette .command__input");
    await page.keyboard.press("ArrowDown");
    const cmdActive = await page.$eval("#palette [role=option][data-active]", (el) => el.id).catch(() => null);
    check(cmdActive === "palette-item-0", `navigation: command ArrowDown activates first item (${cmdActive})`);
    await page.click("#palette [data-command-dismiss]");
    const cmdQuery = await page.$eval("#palette .command__input", (el) => (el as HTMLInputElement).value);
    check(cmdQuery === "", "navigation: command esc clears the query first");
  }

  if (group.id === "actions") {
    await page.click('[data-popover-trigger][aria-controls="gh-card"]');
    await pause();
    check(
      !(await page.$eval("#gh-card", (el) => el.hasAttribute("hidden"))),
      "actions: popover opens on trigger click",
    );
    await page.click("h1");
    await pause();
    check(await page.$eval("#gh-card", (el) => el.hasAttribute("hidden")), "actions: popover closes on outside click");
  }

  /* ---------------------------------------------------------- dark */
  await page.screenshot({ path: `${outDir}/${group.id}-light.png`, fullPage: true });
  await page.click("[data-theme-toggle]");
  await pause(600);
  const dark = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    bg: getComputedStyle(document.body).backgroundColor,
    charts: document.querySelectorAll("[data-chart] .apexcharts-canvas").length,
  }));
  check(
    dark.theme === "dark" && dark.bg !== onPage.bg,
    `${file}: dark toggle did not change the canvas colour (${onPage.bg} → ${dark.bg})`,
  );
  check(dark.charts === onPage.chartEls, `${file}: ${onPage.chartEls - dark.charts} chart(s) lost on the theme switch`);
  await page.screenshot({ path: `${outDir}/${group.id}-dark.png`, fullPage: true });
  await page.close();
}

await browser.close();
const total = entries.reduce((n, e) => n + e.cases.length, 0);
console.log(
  `\n${issues.length} issue(s). ${entries.length} components, ${total} cases across ${catalogueGroups.length} pages. Screenshots in ${outDir}/`,
);
if (issues.length) {
  console.log(issues.map((i) => `  - ${i}`).join("\n"));
  exit(1);
}
