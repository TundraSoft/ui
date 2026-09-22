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
import { ensureDir, readDir, readTextFile, realPath, writeTextFile } from "@tundralibs/compat/file";
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

    // editor: markdown toolbar wraps the selection; html surface mirrors into the textarea.
    // Scroll first so Puppeteer's click needs no scroll of its own (a scroll between
    // selecting and clicking dropped the selection under Bun once), and wait for the
    // wrap rather than reading the value on the next tick.
    await page.evaluate(() => document.querySelector("#note-editor")?.scrollIntoView({ block: "center" }));
    await pause();
    await page.$eval("#note", (el) => {
      const ta = el as HTMLTextAreaElement;
      ta.focus();
      ta.setSelectionRange(0, 13);
    });
    await page.click('#note-editor [data-editor-cmd="bold"]');
    await page.waitForFunction(
      () => (document.querySelector("#note") as HTMLTextAreaElement).value.startsWith("**"),
      { timeout: 2000 },
    ).catch(() => {});
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

    // Upload progress: on submit of the upload form, dropzone.js renders a
    // pending row per picked file, fills it from rAPId's rapid:progress
    // (simulated here — the static page has no runtime) and marks it
    // failed on rapid:error. The submit itself is vetoed by the test.
    const samplePath = `${outDir}/sample-upload.txt`;
    await writeTextFile(samplePath, "hello, dropzone\n");
    const picker = await page.$("#cat-dz-1 input[type=file]");
    await picker!.uploadFile(samplePath);
    await page.evaluate(() => {
      document.addEventListener("submit", (e) => e.preventDefault());
      (document.querySelector("#cat-dz-form") as HTMLFormElement).requestSubmit();
    });
    await pause();
    const pending = await page.evaluate(() => {
      const row = document.querySelector("#cat-dz-1 .dropzone__file--pending");
      return {
        name: row?.querySelector(".dropzone__file-name")?.textContent,
        indeterminate: row?.querySelector("progress")?.hasAttribute("value") === false,
      };
    });
    check(
      pending.name === "sample-upload.txt" && pending.indeterminate,
      `forms: submit renders a pending upload row (${JSON.stringify(pending)})`,
    );
    const progressed = await page.evaluate(() => {
      const form = document.querySelector("#cat-dz-form")!;
      const url = form.getAttribute("data-action");
      form.dispatchEvent(new CustomEvent("rapid:progress", { bubbles: true, detail: { url, loaded: 30, total: 120 } }));
      return (document.querySelector("#cat-dz-1 .dropzone__file--pending progress") as HTMLProgressElement).value;
    });
    check(progressed === 25, `forms: rapid:progress fills the pending row's bar (${progressed})`);
    const failed = await page.evaluate(() => {
      const form = document.querySelector("#cat-dz-form")!;
      const url = form.getAttribute("data-action");
      form.dispatchEvent(new CustomEvent("rapid:error", { bubbles: true, detail: { url, status: 500, body: "" } }));
      const row = document.querySelector("#cat-dz-1 .dropzone__file--error");
      return { error: row?.querySelector(".dropzone__file-error")?.textContent, bar: !!row?.querySelector("progress") };
    });
    check(
      failed.error === "Upload failed" && !failed.bar,
      `forms: rapid:error marks the row (${JSON.stringify(failed)})`,
    );

    // Client-side validation (Form({ validate: true }) + form.js): the
    // browser bubble is replaced by inline messages, an invalid submit is
    // stopped before it can leave the page, the first invalid field gets
    // focus, and fixing a field clears its message live.
    await page.evaluate(() => document.querySelector("#cat-validate")?.scrollIntoView({ block: "center" }));
    await pause();
    check(
      await page.$eval("#cat-validate", (f) => f.hasAttribute("novalidate")),
      "forms: validate form sets novalidate",
    );
    await page.evaluate(() => {
      (globalThis as unknown as { __submits: number }).__submits = 0;
      document.addEventListener("submit", () => {
        (globalThis as unknown as { __submits: number }).__submits++;
      });
      (document.querySelector("#cat-validate button[type=submit]") as HTMLButtonElement).click();
    });
    await pause();
    const invalid = await page.evaluate(() => ({
      submits: (globalThis as unknown as { __submits: number }).__submits,
      url: location.search,
      errors: [...document.querySelectorAll("#cat-validate .form-field__error")].map((e) => e.textContent),
      focused: document.activeElement?.id,
      emailInvalid: document.querySelector("#cv-email")?.getAttribute("aria-invalid"),
      describedBy: document.querySelector("#cv-email")?.getAttribute("aria-describedby"),
    }));
    check(
      invalid.submits === 0 && invalid.url === "",
      `forms: invalid submit was stopped (${JSON.stringify(invalid)})`,
    );
    check(
      invalid.errors.includes("An email address is required.") && invalid.errors.includes("At least one seat."),
      `forms: custom messages rendered inline (${invalid.errors})`,
    );
    check(invalid.focused === "cv-email", `forms: first invalid field focused (${invalid.focused})`);
    check(
      invalid.emailInvalid === "true" && invalid.describedBy === "cv-email-error",
      `forms: invalid field wired for a11y (${invalid.emailInvalid}, ${invalid.describedBy})`,
    );
    await page.type("#cv-email", "ada@acme.com");
    await pause();
    const emailFixed = await page.evaluate(() => ({
      error: document.querySelector("#cv-email ~ .form-field__error")?.textContent ?? null,
      invalid: document.querySelector("#cv-email")?.getAttribute("aria-invalid"),
    }));
    check(
      emailFixed.error === null && emailFixed.invalid === null,
      `forms: fixing a field clears its message live (${JSON.stringify(emailFixed)})`,
    );
    await page.type("#cv-handle", "Ab");
    await page.$eval("#cv-handle", (el) => (el as HTMLInputElement).blur());
    await pause();
    const handle = await page.$eval(
      "#cv-handle",
      (el) => el.parentElement!.querySelector(".form-field__error")?.textContent ?? null,
    );
    check(
      handle === "At least 3 characters." || handle === "Lowercase letters, digits and dashes only.",
      `forms: pattern/minLength message on blur (${handle})`,
    );

    // Password: strength bar levels, strength floor, Show/Hide, confirm match.
    const level = () =>
      page.$eval("#cv-password", (el) => el.closest("[data-password]")!.getAttribute("data-strength-level"));
    check((await level()) === "0", "forms: strength bar hidden while empty");
    await page.type("#cv-password", "password");
    await pause();
    const weak = await page.evaluate(() => ({
      level: document.querySelector("#cv-password")!.closest("[data-password]")!.getAttribute("data-strength-level"),
      label: document.querySelector("#cv-password")!.closest("[data-password]")!.querySelector("[data-password-label]")
        ?.textContent,
      barHidden: (document.querySelector("#cv-password")!.closest("[data-password]")!.querySelector(
        "[data-password-strength]",
      ) as HTMLElement).hidden,
    }));
    check(
      weak.level === "1" && weak.label === "Too weak" && !weak.barHidden,
      `forms: a common password scores Too weak (${JSON.stringify(weak)})`,
    );
    await page.$eval("#cv-password", (el) => (el as HTMLInputElement).blur());
    await pause();
    const weakMsg = await page.$eval(
      "#cv-password",
      (el) => el.closest(".form-field")!.querySelector(".form-field__error")?.textContent ?? null,
    );
    check(
      weakMsg === "Use at least 12 characters." || weakMsg === "Choose a stronger password.",
      `forms: a weak password is reported inline (${weakMsg})`,
    );
    await page.$eval("#cv-password", (el) => {
      (el as HTMLInputElement).value = "";
    });
    await page.type("#cv-password", "Correct-Horse-Battery-9");
    await pause();
    const strong = await page.evaluate(() => ({
      level: document.querySelector("#cv-password")!.closest("[data-password]")!.getAttribute("data-strength-level"),
      error: document.querySelector("#cv-password")!.closest(".form-field")!.querySelector(".form-field__error")
        ?.textContent ?? null,
    }));
    check(
      strong.level === "4" && strong.error === null,
      `forms: a strong password clears the floor (${JSON.stringify(strong)})`,
    );
    await page.click('[data-password-reveal][aria-controls="cv-password"]');
    await pause();
    const reveal = await page.evaluate(() => ({
      type: (document.querySelector("#cv-password") as HTMLInputElement).type,
      pressed: document.querySelector('[data-password-reveal][aria-controls="cv-password"]')?.getAttribute(
        "aria-pressed",
      ),
      label: document.querySelector('[data-password-reveal][aria-controls="cv-password"] [data-password-reveal-label]')
        ?.textContent,
    }));
    check(
      reveal.type === "text" && reveal.pressed === "true" && reveal.label === "Hide",
      `forms: Show/Hide toggle (${JSON.stringify(reveal)})`,
    );
    await page.click('[data-password-reveal][aria-controls="cv-password"]');
    await page.type("#cv-confirm", "Correct-Horse-Battery-8");
    await page.$eval("#cv-confirm", (el) => (el as HTMLInputElement).blur());
    await pause();
    const mismatch = await page.$eval(
      "#cv-confirm",
      (el) => el.closest(".form-field")!.querySelector(".form-field__error")?.textContent ?? null,
    );
    check(mismatch === "The passwords do not match.", `forms: confirm mismatch reported (${mismatch})`);
    await page.$eval("#cv-confirm", (el) => {
      (el as HTMLInputElement).value = "Correct-Horse-Battery-";
    });
    await page.type("#cv-confirm", "9");
    await pause();
    const matched = await page.$eval(
      "#cv-confirm",
      (el) => el.closest(".form-field")!.querySelector(".form-field__error")?.textContent ?? null,
    );
    check(matched === null, `forms: confirm clears when it matches (${matched})`);
    // Editing the source password re-checks a touched confirm field.
    await page.type("#cv-password", "x");
    await pause();
    const drifted = await page.$eval(
      "#cv-confirm",
      (el) => el.closest(".form-field")!.querySelector(".form-field__error")?.textContent ?? null,
    );
    check(
      drifted === "The passwords do not match.",
      `forms: changing the password re-checks the confirm field (${drifted})`,
    );
    check(
      await page.$eval("#cat-pw-3", (el) => el.closest("[data-password]")!.getAttribute("data-strength-level")) !== "0",
      "forms: a prefilled password is scored on load",
    );

    // Composite fields post two parts each; the sugar is markup + attributes.
    const composites = await page.evaluate(() => {
      const q = (sel: string) => document.querySelector(sel);
      return {
        emailLocal: (q("#cat-em-1") as HTMLInputElement)?.value,
        emailDomain: (q('[name="email-domain"]') as HTMLSelectElement)?.value,
        emailFixed: !!q("#cat-em-2")?.closest(".input-group")?.querySelector(
          'input[type=hidden][name="email-domain"][value="acme.com"]',
        ),
        telCountry: (q('[name="phone-country"]') as HTMLSelectElement)?.value,
        telNumber: (q("#cat-tel-1") as HTMLInputElement)?.value,
        urlScheme: (q('[name="website-scheme"]') as HTMLInputElement)?.value,
        urlRest: (q("#cat-url-1") as HTMLInputElement)?.value,
        prefix: q("#cat-px-1")?.closest(".input-group")?.querySelector(".input-group__addon")?.textContent?.trim(),
        decimal: q("#cat-px-1")?.getAttribute("inputmode"),
      };
    });
    check(
      composites.emailLocal === "ada" && composites.emailDomain === "acme.io" && composites.emailFixed,
      `forms: email domains split the value and fix a single domain (${JSON.stringify(composites)})`,
    );
    check(
      composites.telCountry === "+44" && composites.telNumber === "20 7946 0958",
      `forms: tel countries split the value (${JSON.stringify(composites)})`,
    );
    check(
      composites.urlScheme === "https://" && composites.urlRest === "acme.com/team",
      `forms: url scheme split the value (${JSON.stringify(composites)})`,
    );
    const flagged = await page.evaluate(() => {
      const root = document.querySelector("#cat-tel-2")!.closest("[data-tel-countries]")!;
      const field = root.querySelector("[data-select-lead] svg");
      const option = root.querySelector('[role="option"] .combobox__option-lead svg');
      return { field: !!field, option: !!option, rects: field?.querySelectorAll("rect").length ?? 0 };
    });
    check(
      flagged.field && flagged.option && flagged.rects > 1,
      `forms: a country flag shows in the list and the closed field (${JSON.stringify(flagged)})`,
    );
    check(
      composites.prefix === "$" && composites.decimal === "decimal",
      `forms: prefix addon + decimal keyboard (${JSON.stringify(composites)})`,
    );

    // Counter, clear, autosize, caps lock, guard.
    const counter = () => page.$eval('[data-counter-for="cat-cnt-1"]', (el) => el.textContent);
    check((await counter()) === "21 / 40", `forms: counter initialised from the value (${await counter()})`);
    await page.type("#cat-cnt-1", " for Northwind Ltd");
    await pause();
    const near = await page.$eval(
      '[data-counter-for="cat-cnt-1"]',
      (el) => `${el.textContent}|${el.classList.contains("input__counter--near")}`,
    );
    check(near === "39 / 40|true", `forms: counter follows typing and warns near the limit (${near})`);
    const clearBefore = await page.$eval(
      '[data-input-clear-button][aria-controls="cat-srch-1"]',
      (b) => (b as HTMLElement).hidden,
    );
    await page.click('[data-input-clear-button][aria-controls="cat-srch-1"]');
    await pause();
    const cleared = await page.evaluate(() => ({
      value: (document.querySelector("#cat-srch-1") as HTMLInputElement).value,
      hidden: (document.querySelector('[data-input-clear-button][aria-controls="cat-srch-1"]') as HTMLElement).hidden,
      focused: document.activeElement?.id,
      none: !document.querySelector("#cat-srch-2")?.closest("[data-input-clear]"),
    }));
    check(
      !clearBefore && cleared.value === "" && cleared.hidden && cleared.focused === "cat-srch-1" && cleared.none,
      `forms: search clear button (${JSON.stringify(cleared)})`,
    );
    const h0 = await page.$eval("#cat-ta-auto", (el) => el.getBoundingClientRect().height);
    await page.type("#cat-ta-auto", "one\ntwo\nthree\nfour\nfive\nsix");
    await pause();
    const h1 = await page.$eval("#cat-ta-auto", (el) => el.getBoundingClientRect().height);
    check(h1 > h0 + 30, `forms: autosize textarea grows (${h0} → ${h1})`);
    await page.focus("#cv-password");
    const caps = await page.evaluate(() => {
      const input = document.querySelector("#cv-password")!;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", modifierCapsLock: true, bubbles: true }));
      const on = !(input.closest("[data-password]")!.querySelector("[data-password-caps]") as HTMLElement).hidden;
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "a", modifierCapsLock: false, bubbles: true }));
      const off = (input.closest("[data-password]")!.querySelector("[data-password-caps]") as HTMLElement).hidden;
      return { on, off };
    });
    check(caps.on && caps.off, `forms: Caps Lock notice follows the modifier (${JSON.stringify(caps)})`);
    await page.type("#inv-email", "grace");
    await pause();
    const dirty = await page.$eval("#cat-invite", (f) => f.hasAttribute("data-dirty") && f.hasAttribute("data-guard"));
    check(dirty, "forms: a guarded form marks itself dirty on input");

    // Card fields: grouping, brand → CVC length, expiry, luhn.
    await page.type("#card-number", "378282246310005");
    await pause();
    const amex = await page.evaluate(() => ({
      value: (document.querySelector("#card-number") as HTMLInputElement).value,
      brand: document.querySelector("#card-number")!.closest("[data-card-fields]")!.getAttribute("data-brand"),
      label: document.querySelector("#card-number")!.closest("[data-card-fields]")!.querySelector("[data-card-brand]")
        ?.textContent,
      cvcMax: document.querySelector("#card-cvc")?.getAttribute("maxlength"),
      luhnOk: (document.querySelector("#card-number") as HTMLInputElement).validity.valid,
    }));
    check(
      amex.value === "3782 822463 10005" && amex.brand === "amex" && amex.label === "Amex" && amex.cvcMax === "4" &&
        amex.luhnOk,
      `forms: Amex grouping, brand and CVC length (${JSON.stringify(amex)})`,
    );
    await page.$eval("#card-number", (el) => {
      (el as HTMLInputElement).value = "";
    });
    await page.type("#card-number", "4242424242424241");
    await page.$eval("#card-number", (el) => (el as HTMLInputElement).blur());
    await pause();
    const luhn = await page.evaluate(() => ({
      value: (document.querySelector("#card-number") as HTMLInputElement).value,
      brand: document.querySelector("#card-number")!.closest("[data-card-fields]")!.getAttribute("data-brand"),
      cvcMax: document.querySelector("#card-cvc")?.getAttribute("maxlength"),
      error: document.querySelector("#card-number")!.closest(".form-field")!.querySelector(".form-field__error")
        ?.textContent ?? null,
    }));
    check(
      luhn.value === "4242 4242 4242 4241" && luhn.brand === "visa" && luhn.cvcMax === "3" &&
        luhn.error === "Check the card number.",
      `forms: Visa grouping and the Luhn message (${JSON.stringify(luhn)})`,
    );
    await page.type("#card-expiry", "1223");
    await page.$eval("#card-expiry", (el) => (el as HTMLInputElement).blur());
    await pause();
    const expiry = await page.evaluate(() => ({
      value: (document.querySelector("#card-expiry") as HTMLInputElement).value,
      error: document.querySelector("#card-expiry")!.closest(".form-field")!.querySelector(".form-field__error")
        ?.textContent ?? null,
    }));
    check(
      expiry.value === "12/23" && expiry.error === "This card has expired.",
      `forms: expiry slash + past date (${JSON.stringify(expiry)})`,
    );
    check(
      (await page.$$eval(
        "#stored-number, #stored-expiry, #stored-name, #stored-cvc",
        (els) => els.map((e) => e.id).join(),
      )) === "stored-number,stored-expiry",
      "forms: CardFields renders only the parts asked for",
    );

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

  if (group.id === "feedback") {
    // The static page has no runtime: "Show toast" clones a <template> into #toast-region.
    await page.evaluate(() =>
      document.querySelector('[data-toast-open="#cat-toast-template"]')?.scrollIntoView({ block: "center" })
    );
    await page.click('[data-toast-open="#cat-toast-template"]');
    await pause();
    const toast = await page.evaluate(() => {
      const t = document.querySelector("#toast-region .toast") as HTMLElement | null;
      return {
        present: !!t,
        text: t?.querySelector(".toast__body")?.textContent,
        visible: !!t && t.getBoundingClientRect().height > 0,
      };
    });
    check(
      toast.present && toast.visible && toast.text?.startsWith("Saved."),
      `feedback: Show toast shows a toast (${JSON.stringify(toast)})`,
    );
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

    // Every action in a data table does something. Bulk buttons submit the
    // selection through the table's own form (bulkAction); the toolbar
    // search filters the rows; a row kebab opens the row's action strip.
    // visible outside the scroll box.
    const bulk = await page.evaluate(() => {
      const form = document.querySelector("#invoices form.data-table__form");
      const buttons = [...document.querySelectorAll("#invoices [data-bulk-bar] button")] as HTMLButtonElement[];
      return {
        form: form?.getAttribute("data-action") ?? null,
        target: form?.getAttribute("data-target"),
        inForm: buttons.every((b) => b.closest("form") === form),
        submits: buttons.filter((b) => b.type === "submit").map((b) => `${b.name}=${b.value}`),
        rowsInForm: !!document.querySelector("#invoices form [data-select-row][name=selected]"),
        toolbarInForm: !!document.querySelector("#invoices form .data-table__toolbar"),
      };
    });
    check(bulk.form && bulk.target === "#invoices", `data: invoices bulk form has data-action/target (${bulk.form})`);
    check(bulk.inForm && bulk.rowsInForm, "data: bulk buttons and row checkboxes share the bulk form");
    check(
      bulk.submits.join(",") === "op=assign,op=delete",
      `data: bulk buttons are submits naming their op (${bulk.submits})`,
    );
    check(!bulk.toolbarInForm, "data: the toolbar stays outside the bulk form (Enter in a search box must not submit)");

    // The bulk bar is an overlay of the header row, not a row above it:
    // selecting must not move the rows, and select-all stays reachable.
    const rowTop = () => page.$eval("#invoices tbody tr", (el) => el.getBoundingClientRect().top);
    const before = await rowTop();
    await page.click("#invoices [data-select-row]");
    await pause();
    const overlay = await page.evaluate(() => {
      const bar = document.querySelector("#invoices [data-bulk-bar]")!.getBoundingClientRect();
      const head = document.querySelector("#invoices thead th")!.getBoundingClientRect();
      const all = document.querySelector("#invoices [data-select-all]") as HTMLElement;
      const ar = all.getBoundingClientRect();
      const hit = document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2);
      const br = bar.left + bar.width - 20;
      const barHit = document.elementFromPoint(br, bar.top + bar.height / 2);
      return {
        rowTop: document.querySelector("#invoices tbody tr")!.getBoundingClientRect().top,
        sameBand: Math.abs(bar.top - head.top) < 1 && Math.abs(bar.height - head.height) < 1,
        selectAllUsable: hit === all,
        barOnTop: !!barHit && !!barHit.closest("[data-bulk-bar]"),
        stickySelect: getComputedStyle(document.querySelector("#invoices td.data-table__select")!).position,
      };
    });
    check(overlay.rowTop === before, `data: selecting a row moved the rows (${before} → ${overlay.rowTop})`);
    check(
      overlay.sameBand && overlay.barOnTop,
      `data: bulk bar should overlay the header row (${JSON.stringify(overlay)})`,
    );
    check(overlay.selectAllUsable, "data: select-all checkbox is covered by the bulk bar");
    check(overlay.stickySelect === "sticky", `data: selection column should be sticky (${overlay.stickySelect})`);
    await page.click("#invoices [data-bulk-clear]");
    await pause();
    for (const [table, expect] of [["#cat-dt-1", "op=archive"]] as const) {
      const ops = await page.$$eval(
        `${table} form.data-table__form [data-bulk-bar] button[type=submit]`,
        (els) => els.map((b) => `${(b as HTMLButtonElement).name}=${(b as HTMLButtonElement).value}`).join(","),
      );
      check(ops === expect, `data: ${table} bulk button submits ${expect} (${ops})`);
    }

    const visibleRows = (table: string) =>
      page.$$eval(`${table} tbody tr`, (rows) => rows.filter((r) => !(r as HTMLElement).hidden).length);
    for (
      const [table, query, expected] of [["#cat-dt-1", "Contoso", 1], ["#cat-dt-plain", "zzz", 0], [
        "#projects",
        "Project 1",
        1,
      ]] as const
    ) {
      const all = await visibleRows(table);
      await page.type(`${table} .data-table__toolbar [data-table-search]`, query);
      await pause();
      const left = await visibleRows(table);
      check(
        all > left && left === expected,
        `data: ${table} toolbar search filters rows (${all} → ${left}, expected ${expected})`,
      );
      await page.$eval(`${table} .data-table__toolbar [data-table-search]`, (el) => {
        (el as HTMLInputElement).value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    // Row action strip (RowActions): opens in the row without moving
    // anything, one at a time, Escape closes and refocuses the kebab.
    await page.evaluate(() => document.querySelector("#invoices")?.scrollIntoView({ block: "center" }));
    await pause();
    // Relative to the table, not the viewport: focusing the strip scrolls the page.
    const row3 = () =>
      page.$eval(
        "#invoices tbody tr:nth-child(3)",
        (r) => r.getBoundingClientRect().top - r.closest(".data-table")!.getBoundingClientRect().top,
      );
    const row3Before = await row3();
    await page.click('#invoices [data-row-actions="#inv-row-INV-2047-strip"]');
    // Let the slide-in finish (its centre is still clipped mid-animation).
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#inv-row-INV-2047-strip") as HTMLElement | null;
        return !!el && !el.hidden && el.getAnimations().length === 0;
      },
      { timeout: 2000 },
    ).catch(() => check(false, "data: row strip slide-in never finished"));
    const strip = await page.evaluate(() => {
      const el = document.querySelector("#inv-row-INV-2047-strip") as HTMLElement;
      const r = el.getBoundingClientRect();
      const row = el.closest("tr")!.getBoundingClientRect();
      const box = el.closest(".data-table__scroll")!.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        open: !el.hidden,
        inRow: Math.abs(r.top - row.top) < 1 && r.height <= row.height && Math.abs(r.right - row.right) < 1,
        inBox: r.left >= box.left - 1 && r.right <= box.right + 1,
        visible: !!hit && el.contains(hit),
        focusInside: !!document.activeElement?.closest("#inv-row-INV-2047-strip"),
      };
    });
    check(
      strip.open && strip.inRow && strip.inBox && strip.visible,
      `data: row strip geometry (${JSON.stringify(strip)})`,
    );
    check(strip.focusInside, "data: opening a row strip should move focus into it");
    check((await row3()) === row3Before, "data: opening a row strip moved the rows");
    await page.click('#invoices [data-row-actions="#inv-row-INV-2045-strip"]');
    // The previous strip slides out first; wait for it to be hidden, not for a timer.
    const settled = (n: number) =>
      page.waitForFunction(
        (n) => document.querySelectorAll("#invoices .data-table__row-actions:not([hidden])").length === n,
        { timeout: 2000 },
        n,
      ).then(() => true, () => false);
    check(await settled(1), "data: the first row strip did not slide out when a second opened");
    const openStrips = await page.$$eval(
      "#invoices .data-table__row-actions:not([hidden])",
      (s) => s.map((e) => e.id),
    );
    check(openStrips.join() === "inv-row-INV-2045-strip", `data: only one row strip open at a time (${openStrips})`);
    await page.keyboard.press("Escape");
    check(await settled(0), "data: Escape did not slide the row strip out");
    const afterEsc = await page.evaluate(() => ({
      open: document.querySelectorAll("#invoices .data-table__row-actions:not([hidden])").length,
      focus: document.activeElement?.getAttribute("data-row-actions"),
    }));
    check(
      afterEsc.open === 0 && afterEsc.focus === "#inv-row-INV-2045-strip",
      `data: Escape closes the strip and refocuses the kebab (${JSON.stringify(afterEsc)})`,
    );
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
