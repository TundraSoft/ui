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

/**
 * The pieces added for the Brevily console (2026-10-04): column and cell
 * attributes, per-row selection, select-all, POST row actions, the
 * confirmation dialog, an open-on-arrival modal, a Select that never
 * blocks implicit submission, autosubmit, copy, counts, link tabs, the
 * collapsing breadcrumb and a clearable date-time. One block per page.
 */
async function consoleGaps(page: Page, group: string): Promise<void> {
  /** Record the form's submits instead of letting them navigate. */
  const trapSubmits = (selector: string) =>
    page.$eval(selector, (form) => {
      const w = globalThis as unknown as { __subs: string[] };
      w.__subs = [];
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const ev = e as SubmitEvent;
        w.__subs.push(
          `${(ev.submitter as HTMLButtonElement | null)?.textContent?.trim() ?? ""}|${
            new URLSearchParams(new FormData(form as HTMLFormElement) as unknown as Record<string, string>).toString()
          }`,
        );
      });
    });
  const submits = () => page.evaluate(() => (globalThis as unknown as { __subs: string[] }).__subs);
  const confirmOpen = () =>
    page.evaluate(() => {
      const d = document.querySelector("dialog[data-confirm-dialog]") as HTMLDialogElement;
      return {
        open: d.open,
        text: d.querySelector("[data-confirm-text]")!.textContent,
        ok: d.querySelector("[data-confirm-ok]")!.textContent,
        danger: d.querySelector("[data-confirm-ok]")!.classList.contains("btn--danger"),
      };
    });
  const clickIn = (selector: string) => page.$eval(selector, (el) => (el as HTMLElement).click());

  if (group === "forms") {
    // A Select's control is a button: Enter in the search box beside it submits.
    await trapSubmits("#cat-autosubmit");
    await page.$eval("#cat-autosubmit input[type=search]", (el) => el.scrollIntoView({ block: "center" }));
    await page.click("#cat-autosubmit input[type=search]");
    await page.keyboard.type("north");
    await pause();
    const typed = (await submits()).length;
    await page.keyboard.press("Enter");
    await pause();
    const afterEnter = (await submits()).length;
    check(
      typed === 0 && afterEnter === 1,
      `forms: autosubmit fired on typing (${typed}) or Enter did not submit beside a Select (${afterEnter})`,
    );
    // A pick and a radio each submit once.
    await page.click("#cat-autosubmit-status");
    await pause();
    await page.click('#cat-autosubmit-status-list [data-value="active"]');
    await pause();
    await clickIn("#cat-autosubmit-range-1");
    await pause();
    const subs = await submits();
    check(
      subs.length === 3 && subs[1].includes("status=active") && subs[2].includes("range=30d"),
      `forms: autosubmit on a Select pick / Segmented change (${JSON.stringify(subs)})`,
    );

    // The Select button: Space opens, arrows move, Enter picks and keeps focus.
    await page.$eval("#cat-sel", (el) => el.scrollIntoView({ block: "center" }));
    await page.focus("#cat-sel");
    await page.keyboard.press("Space");
    await pause();
    const opened = await page.$eval("#cat-sel-list", (el) => !el.hasAttribute("hidden"));
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await pause();
    const keyed = await page.evaluate(() => ({
      text: document.getElementById("cat-sel")!.textContent!.trim(),
      native: (document.getElementById("cat-sel-native") as HTMLSelectElement).value,
      closed: document.getElementById("cat-sel-list")!.hasAttribute("hidden"),
      focus: document.activeElement?.id,
      tag: document.getElementById("cat-sel")!.tagName,
    }));
    check(
      opened && keyed.tag === "BUTTON" && keyed.closed && keyed.focus === "cat-sel" && keyed.native !== "",
      `forms: select button keyboard (opened ${opened}, ${JSON.stringify(keyed)})`,
    );

    // Combobox({ hints: false })
    await page.$eval("#cat-cb-nohints", (el) => el.scrollIntoView({ block: "center" }));
    await page.click("#cat-cb-nohints");
    await pause();
    const hints = await page.$eval(
      "#cat-cb-nohints-list",
      (el) => ({
        open: !el.hasAttribute("hidden"),
        hints: getComputedStyle(el.querySelector(".combobox__hints")!).display,
      }),
    );
    check(
      hints.open && hints.hints === "none",
      `forms: combobox hints: false still shows the bar (${JSON.stringify(hints)})`,
    );
    await page.keyboard.press("Escape");

    // DateTimePicker({ clearable })
    const clearBefore = await page.$eval(
      "#dtp-clear [data-datetime-clear]",
      (el) => (el as HTMLElement).offsetParent !== null,
    );
    await clickIn("#dtp-clear [data-datetime-clear]");
    await pause();
    const cleared = await page.$eval("#dtp-clear", (el) => ({
      whole: (el.querySelector("[data-datetime-value]") as HTMLInputElement).value,
      date: (el.querySelector("[data-datepicker-start]") as HTMLInputElement).value,
      button: (el.querySelector("[data-datetime-clear]") as HTMLElement).hidden,
    }));
    check(
      clearBefore && cleared.whole === "" && cleared.date === "" && cleared.button,
      `forms: datetimepicker Clear (${clearBefore}, ${JSON.stringify(cleared)})`,
    );

    // Segmented counts
    const counts = await page.$$eval(
      "#cat-seg-count .segmented__count",
      (els) => els.map((e) => `${e.textContent}${e.classList.contains("segmented__count--alert") ? "!" : ""}`).join(),
    );
    check(counts === "48.2k,120,3!,0!", `forms: segmented counts (${counts})`);
    const countTitle = await page.$eval("#cat-seg-count .segmented__count", (e) => e.getAttribute("title"));
    check(countTitle === "48,213", `forms: segmented countTitle (${countTitle})`);
  }

  if (group === "data") {
    const adv = await page.evaluate(() => {
      const t = document.getElementById("cat-dt-adv")!;
      return {
        head: !!t.querySelector('th[data-col="name"]'),
        cell: !!t.querySelector('td[data-card="primary"][title="Account Northwind"]'),
        merged: !!t.querySelector("td.cat-dt-status[data-card=badge]"),
        boxes: [...t.querySelectorAll("tbody tr")].map((r) => !!r.querySelector("[data-select-row]")).join(),
        lock: !!t.querySelector(
          'form[method=post][action="?lock"][data-action="?lock"][data-target="#cat-dt-adv"] input[name=_csrf][value=demo-token]',
        ),
        del: !!t.querySelector('form[action="?delete"]:not([data-action]) button[data-confirm="Delete Northwind?"]'),
        // data-confirm given through attrs, with no confirm prop, is kept.
        viaAttrs: !!t.querySelector('form[action="?archive"] button[data-confirm="Archive Northwind?"]'),
        none: !document.querySelector("#cat-dt-none .data-table__select, #cat-dt-none [data-bulk-bar]"),
      };
    });
    check(
      adv.head && adv.cell && adv.merged && adv.boxes === "true,false,true" && adv.lock && adv.del && adv.viaAttrs &&
        adv.none,
      `data: column attrs / rowSelectable / POST row actions (${JSON.stringify(adv)})`,
    );

    // Select all N
    await page.$eval("#cat-dt-adv", (el) => el.scrollIntoView({ block: "center" }));
    await clickIn("#cat-dt-adv [data-select-all]");
    await pause();
    const bar = () =>
      page.$eval("#cat-dt-adv", (t) => ({
        count: t.querySelector("[data-bulk-count]")!.textContent,
        offer: (t.querySelector("[data-bulk-select-all]") as HTMLElement).hidden
          ? ""
          : t.querySelector("[data-bulk-select-all]")!.textContent,
        all: (t.querySelector("[data-bulk-all]") as HTMLInputElement).value,
      }));
    const ticked = await bar();
    await clickIn("#cat-dt-adv [data-bulk-select-all]");
    await pause();
    const taken = await bar();
    await clickIn("#cat-dt-adv [data-select-row][value='1']");
    await pause();
    const dropped = await bar();
    check(
      ticked.count === "2 accounts selected" && ticked.offer === "Select all 240" && ticked.all === "" &&
        taken.count === "All 240 selected" && taken.offer === "Clear selection" && taken.all === "1" &&
        dropped.count === "1 account selected" && dropped.offer === "" && dropped.all === "",
      `data: select all (${JSON.stringify({ ticked, taken, dropped })})`,
    );
    await clickIn("#cat-dt-adv [data-select-row][value='3']");

    // A confirmed row action: Cancel drops it, Confirm submits with the same button.
    await trapSubmits("#cat-dt-adv-1-strip form[action='?delete']");
    await clickIn("[data-row-actions='#cat-dt-adv-1-strip']");
    await pause(400);
    await clickIn("#cat-dt-adv-1-strip form[action='?delete'] button");
    await pause();
    const asked = await confirmOpen();
    await clickIn("dialog[data-confirm-dialog] [data-modal-close]");
    await pause();
    const afterCancel = (await submits()).length;
    await clickIn("#cat-dt-adv-1-strip form[action='?delete'] button");
    await pause();
    await clickIn("dialog[data-confirm-dialog] [data-confirm-ok]");
    await pause();
    const sent = await submits();
    check(
      asked.open && asked.text === "Delete Northwind?" && asked.danger && afterCancel === 0 &&
        sent.length === 1 && sent[0].startsWith("Delete|") && sent[0].includes("_csrf=demo-token") &&
        sent[0].includes("id=1"),
      `data: confirmed POST row action (${JSON.stringify({ asked, afterCancel, sent })})`,
    );
    await page.keyboard.press("Escape");

    // Lists in a DataTable toolbar open over the sticky header, unclipped.
    for (const id of ["cat-dt-tools-status", "cat-dt-tools-owner"]) {
      await page.$eval(`#${id}`, (el) => el.scrollIntoView({ block: "center" }));
      await page.click(`#${id}`);
      await pause();
      const over = await page.$eval(`#${id}-list`, (list) => {
        const head = list.closest(".data-table")!.querySelector("thead")!.getBoundingClientRect();
        const r = list.getBoundingClientRect();
        const y = Math.max(r.top + 4, head.top + 4);
        const hit = document.elementFromPoint(r.left + 12, y);
        return { open: !list.hasAttribute("hidden"), over: r.bottom > head.top, top: !!hit && list.contains(hit) };
      });
      check(over.open && over.over && over.top, `data: ${id} list hidden under the table (${JSON.stringify(over)})`);
      await page.keyboard.press("Escape");
      await page.click("h1");
    }

    const misc = await page.evaluate(() => ({
      tones: document.querySelectorAll("#cat-tl-tones .timeline__item--danger .timeline__marker svg").length,
      text: !!document.querySelector("#cat-tl-tones .timeline__text"),
      ownIcon: !!document.querySelector(".empty__icon > .cat-own-icon"),
      tlAttrs: !!document.querySelector(
        "ol#cat-tl-tones.timeline.cat-tl[data-kind=tones] > li.timeline__item.cat-tl-danger",
      ),
      emptyHtml: !!document.querySelector("#cat-empty-details .empty__text strong"),
      details: !!document.querySelector("#cat-empty-details .empty__text + .empty__details .badge"),
    }));
    check(
      misc.tones === 1 && misc.text && misc.ownIcon && misc.tlAttrs && misc.emptyHtml && misc.details,
      `data: timeline tones+attrs / empty Html icon, text, details (${JSON.stringify(misc)})`,
    );
  }

  if (group === "feedback") {
    const roles = await page.$$eval(
      "#cat-alert-roles > .alert",
      (els) => els.map((e) => e.getAttribute("role")).join(),
    );
    check(roles === "status,alert,alert,", `feedback: alert roles by variant / override / none (${roles})`);

    // A modal rendered with `open` opens when a swap brings it in.
    await clickIn("#cat-modal-open-trigger");
    await pause();
    const auto = await page.$eval("#cat-modal-open", (d) => (d as HTMLDialogElement).open && d.matches(":modal"));
    check(auto, "feedback: Modal({ open }) did not open when swapped in");
    await clickIn("#cat-modal-open [data-modal-close]");
    await pause();

    // data-confirm on a link: Cancel stays, Confirm follows it.
    await clickIn("#cat-confirm a[data-confirm]");
    await pause();
    const link = await confirmOpen();
    await page.keyboard.press("Escape");
    await pause();
    const stayed = await page.evaluate(() => location.hash);
    await clickIn("#cat-confirm a[data-confirm]");
    await pause();
    await clickIn("dialog[data-confirm-dialog] [data-confirm-ok]");
    await pause();
    const went = await page.evaluate(() => location.hash);
    // A danger button names its own OK.
    await clickIn("#cat-confirm-del");
    await pause();
    const del = await confirmOpen();
    await clickIn("dialog[data-confirm-dialog] [data-modal-close]");
    // A submit button: the replay carries the same submitter.
    await trapSubmits("#cat-confirm-form");
    await clickIn("#cat-confirm-form button");
    await pause();
    await clickIn("dialog[data-confirm-dialog] [data-confirm-ok]");
    await pause();
    const sent = await submits();
    check(
      link.open && link.text === "Leave this page?" && !link.danger && link.ok === "Confirm" &&
        stayed !== "#cat-confirmed" && went === "#cat-confirmed" &&
        del.text === "Delete it for good?" && del.ok === "Delete" && del.danger &&
        sent.length === 1 && sent[0].startsWith("Send (submit)|"),
      `feedback: data-confirm (${JSON.stringify({ link, stayed, went, del, sent })})`,
    );
    await page.evaluate(() => history.replaceState(null, "", location.pathname));
  }

  if (group === "actions") {
    await page.evaluate(() => {
      const w = globalThis as unknown as { __copied?: string };
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: (t: string) => ((w.__copied = t), Promise.resolve()) },
      });
    });
    await clickIn("#cat-copy");
    await pause();
    const copy = await page.evaluate(() => ({
      text: (globalThis as unknown as { __copied?: string }).__copied,
      marked: document.getElementById("cat-copy")!.hasAttribute("data-copied"),
      shows: getComputedStyle(document.querySelector("#cat-copy .btn__copy-done")!).display !== "none",
    }));
    check(
      copy.text === "https://go.acme.com/spring" && copy.marked && copy.shows,
      `actions: CopyButton (${JSON.stringify(copy)})`,
    );
    await clickIn("#cat-copy-icon");
    await pause();
    const iconOnly = await page.evaluate(() => {
      const b = document.getElementById("cat-copy-icon")!;
      return {
        text: (globalThis as unknown as { __copied?: string }).__copied,
        name: b.getAttribute("aria-label"),
        visibleText: b.textContent!.trim(),
        icon: b.classList.contains("btn--icon"),
        check: getComputedStyle(b.querySelector(".btn__copy-done")!).display !== "none",
      };
    });
    check(
      iconOnly.text === "brv_ak_7f2c" && iconOnly.name === "Copy key id" && iconOnly.visibleText === "" &&
        iconOnly.icon && iconOnly.check,
      `actions: icon-only CopyButton (${JSON.stringify(iconOnly)})`,
    );
  }

  if (group === "cards") {
    await clickIn("#cat-tablinks a:nth-child(2)");
    await pause();
    const cards = await page.evaluate(() => ({
      current: document.querySelector("#cat-tablinks [aria-current=page]")?.textContent?.trim(),
      selected: document.querySelectorAll("#cat-tablinks [aria-selected]").length,
      stepsOnly: !document.querySelector("#cat-wz-steps .wizard__content") &&
        document.querySelector("#cat-wz-steps")!.classList.contains("wizard--steps-only"),
      sub: !!document.querySelector(".page-header--sub h2.page-header__title"),
      tabTitle: document.querySelector("#cat-tablinks .tabs__count")?.getAttribute("title"),
      tabList: !!document.querySelector("#cat-tablinks > .tabs__list.cat-tablinks-list[data-kind=links]"),
      wizard: (() => {
        const ol = document.querySelector("#cat-wz-steps ol")!;
        return `${ol.getAttribute("aria-label")}|${ol.classList.contains("cat-wz-list")}|${
          ol.querySelector("[aria-current=step] .wizard__step-label")?.textContent?.trim()
        }|${ol.querySelector(".wizard__step--done .sr-only")?.textContent}`;
      })(),
      badge: !!document.querySelector(".page-header--sub .page-header__title-row .badge"),
    }));
    check(
      cards.current === "Clicks" && cards.selected === 0 && cards.stepsOnly && cards.sub && cards.badge &&
        cards.tabTitle === "1,204" && cards.tabList && cards.wizard === "Import steps|true|Columns|Done: ",
      `cards: TabLinks / Wizard steps-only / PageHeader level 2 (${JSON.stringify(cards)})`,
    );
  }

  if (group === "navigation") {
    const folded = await page.$eval("#cat-bc-fold", (box) => ({
      more: getComputedStyle(box.querySelector(".breadcrumb__more")!).display,
      mids: [...box.querySelectorAll(".breadcrumb__item--mid")].map((e) => getComputedStyle(e).display).join(),
      overflow: box.scrollWidth - box.clientWidth,
    }));
    await page.$eval("#cat-bc-fold", (el) => el.scrollIntoView({ block: "center" }));
    await page.click("#cat-bc-fold summary");
    await pause();
    const menu = await page.$$eval(
      "#cat-bc-fold .breadcrumb__menu-link",
      (els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.textContent).join("|"),
    );
    check(
      folded.more === "flex" && folded.mids === "none,none" && folded.overflow <= 0 &&
        menu === "Settings|Groups & permissions",
      `navigation: breadcrumb collapse (${JSON.stringify({ ...folded, menu })})`,
    );
  }
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
      shown: document.getElementById("cat-sel")!.textContent!.trim(),
      closed: document.getElementById("cat-sel-list")!.hasAttribute("hidden"),
    }));
    check(
      sel.native === "b" && sel.shown === "Beta" && sel.closed,
      `forms: select pick did not sync (${JSON.stringify(sel)})`,
    );
    await page.select("#cat-sel-native", "a");
    await pause();
    const back = await page.$eval("#cat-sel", (el) => el.textContent!.trim());
    check(back === "Alpha", `forms: native change did not repaint the select UI (${back})`);

    // a Select inside an InputGroup: its list must escape the group (no overflow clip)
    await page.$eval(".input-group .select [role=combobox]", (el) => el.scrollIntoView({ block: "center" }));
    await page.click(".input-group .select [role=combobox]");
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
    // The field itself toggles too, like a native select (it was open-only,
    // so the caret was the one way to close it), and Tab away closes it.
    const selOpen = () => page.$eval("#cat-sel-list", (el) => !el.hasAttribute("hidden"));
    await page.$eval("#cat-sel", (el) => el.scrollIntoView({ block: "center" }));
    await page.click("#cat-sel");
    await pause();
    const fieldOpens = await selOpen();
    await page.click("#cat-sel");
    await pause();
    const fieldCloses = !(await selOpen());
    await page.click("#cat-sel");
    await pause();
    await page.keyboard.press("Tab");
    await pause();
    const tabCloses = !(await selOpen());
    // A <label for> click is re-dispatched to the input: it toggles too.
    await page.evaluate(() => {
      const label = document.createElement("label");
      label.htmlFor = "cat-sel";
      label.id = "cat-sel-probe-label";
      label.textContent = "Probe";
      document.querySelector("#cat-sel")!.closest("[data-select]")!.before(label);
    });
    await page.click("#cat-sel-probe-label");
    await pause();
    const labelOpens = await selOpen();
    await page.click("#cat-sel-probe-label");
    await pause();
    const labelCloses = !(await selOpen());
    await page.$eval("#cat-sel-probe-label", (el) => el.remove());
    check(
      fieldOpens && fieldCloses && tabCloses && labelOpens && labelCloses,
      `forms: select field/label click or Tab does not toggle the list (${
        JSON.stringify({ fieldOpens, fieldCloses, tabCloses, labelOpens, labelCloses })
      })`,
    );
    // A searchable combobox keeps its list open on a click into its input.
    await page.$eval("#reviewer", (el) => el.scrollIntoView({ block: "center" }));
    await page.click("#reviewer");
    await pause();
    await page.click("#reviewer");
    await pause();
    const stays = await page.$eval("#reviewer-list", (el) => !el.hasAttribute("hidden"));
    await page.keyboard.press("Escape");
    check(stays, "forms: a second click in a searchable combobox's input closed its list");

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

    // select: the tick follows a pick (it stayed on the server-rendered option)
    await page.click("#cat-sel");
    await page.click("#cat-sel-list [data-value=b]");
    await page.click("#cat-sel");
    const ticks = await page.$$eval(
      "#cat-sel-list [role=option]",
      (els) =>
        els.map((e) =>
          `${e.getAttribute("data-value")}:${getComputedStyle(e.querySelector(".combobox__check")!).visibility}`
        )
          .join(),
    );
    check(ticks === "a:hidden,b:visible", `forms: select tick moves with the pick (${ticks})`);
    await page.keyboard.press("Escape");

    // time picker
    const value = (sel: string) => page.$eval(sel, (el) => (el as HTMLInputElement).value);
    const focused = () => page.evaluate(() => document.activeElement?.id);
    const carrierState = await page.$eval("#tp-basic-value", (el) => {
      const i = el as HTMLInputElement;
      return `${i.type}|${i.name}|${i.value}`;
    });
    check(carrierState === "hidden|at|09:30", `forms: timepicker value input enhanced to hidden (${carrierState})`);
    await page.click("#tp-basic");
    await page.keyboard.type("14");
    check((await focused()) === "tp-basic-minute", "forms: timepicker hours complete → focus jumps to minutes");
    await page.keyboard.type("05");
    check((await value("#tp-basic-value")) === "14:05", "forms: typed 14 05 posts 14:05");
    await page.keyboard.press("ArrowUp");
    check((await value("#tp-basic-value")) === "14:06", "forms: ArrowUp steps the minutes");
    await page.keyboard.press("PageUp");
    check((await value("#tp-basic-value")) === "14:21", "forms: PageUp moves by the slot step");
    await page.keyboard.down("Alt");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.up("Alt");
    const listState = await page.$eval("#tp-basic-list", (el) => ({
      open: !(el as HTMLElement).hidden,
      focused: document.activeElement === el,
      active: el.getAttribute("aria-activedescendant"),
    }));
    check(
      listState.open && listState.focused && listState.active === "tp-basic-slot-1430",
      `forms: Alt+ArrowDown opens the slots at the next one (${JSON.stringify(listState)})`,
    );
    await page.keyboard.type("9");
    const jumped = await page.$eval("#tp-basic-list", (el) => el.getAttribute("aria-activedescendant"));
    check(jumped === "tp-basic-slot-0900", `forms: typing 9 in the slots jumps to 09:00 (${jumped})`);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const afterPick = {
      value: await value("#tp-basic-value"),
      focus: await focused(),
      hidden: await page.$eval("#tp-basic-list", (el) => (el as HTMLElement).hidden),
      ticked: await page.$$eval(
        "#tp-basic-list [role=option]",
        (els) =>
          els.filter((e) => getComputedStyle(e.querySelector(".timepicker__check")!).visibility === "visible").map((
            e,
          ) => e.getAttribute("data-value")).join(),
      ),
    };
    check(
      afterPick.value === "09:15" && afterPick.focus === "tp-basic" && afterPick.hidden && afterPick.ticked === "09:15",
      `forms: Enter picks the slot, closes, returns focus, moves the tick (${JSON.stringify(afterPick)})`,
    );
    await page.click("[aria-controls=tp-bounds-list]");
    const bounded = await page.$$eval(
      "#tp-bounds-list .timepicker__slot:not([hidden])",
      (els) => `${els.length}|${els[0]?.getAttribute("data-value")}|${els.at(-1)?.getAttribute("data-value")}`,
    );
    check(bounded === "18|09:00|17:30", `forms: slots honour min/max/step (${bounded})`);
    await page.keyboard.press("Escape");
    check((await focused()) === "tp-bounds", "forms: Escape closes the slots and returns focus");

    const tpError = () => page.$eval("#tp-form", (f) => f.querySelector(".form-field__error")?.textContent ?? null);
    await page.click("#tp-form button[type=submit]");
    await pause();
    check((await tpError()) === "Pick a pickup time.", `forms: required time reported on submit (${await tpError()})`);
    check((await focused()) === "tp-req", "forms: submit focuses the time picker's hours");
    await page.keyboard.type("0730");
    await page.click("h1");
    await pause(400);
    check(
      (await tpError()) === "Pick 08:00 or later.",
      `forms: min reported on leaving the control (${await tpError()})`,
    );
    const frame = await page.$eval("#tp-form .timepicker__field", (el) => getComputedStyle(el).borderColor);
    const danger = await page.$eval("#tp-form .form-field__error", (el) => getComputedStyle(el).color);
    check(frame === danger, `forms: invalid time paints the frame (${frame} vs ${danger})`);
    await page.click("#tp-req");
    await page.keyboard.type("09");
    await pause();
    check((await tpError()) === null, `forms: fixing the hour clears the error (${await tpError()})`);

    // date-time picker
    const dateField = await page.$eval("#dtp-basic [data-datepicker-start]", (el) => (el as HTMLInputElement).type);
    check(dateField === "hidden", `forms: client-mode date field enhanced to hidden (${dateField})`);
    const whole = () => value("#dtp-basic [data-datetime-value]");
    check((await whole()) === "2026-09-20T09:00:00Z", `forms: datetime posts one UTC instant (${await whole()})`);
    await page.click("#dtp-basic [data-datetime-preset]");
    const preset = [
      await whole(),
      await value("#dtp-basic-time-value"),
      await page.$eval("#dtp-basic [data-datepicker-label]", (e) => e.textContent),
    ].join("|");
    check(
      preset === "2026-09-15T09:00:00Z|09:00|15 Sep 2026",
      `forms: "Tomorrow 09:00" preset sets both halves (${preset})`,
    );
    await (await page.$$("#dtp-basic [data-datetime-preset]"))[2].click();
    check((await whole()) === "2026-09-30T23:59:00Z", `forms: "End of month" preset (${await whole()})`);
    await page.click("#dtp-basic [data-datepicker-trigger]");
    await page.click("#dtp-basic [data-day='2026-09-14']");
    const minDay = await page.$eval(
      "#dtp-basic-time",
      (e) => e.closest("[data-timepicker]")!.getAttribute("data-timepicker-min"),
    );
    check(minDay === "08:30", `forms: on the first allowed day the time takes the bound's minimum (${minDay})`);
    await page.click("#dtp-form button[type=submit]");
    await pause();
    const dtpError = await page.$eval("#dtp-form", (f) => f.querySelector(".form-field__error")?.textContent);
    check(dtpError === "Pick a date.", `forms: required datetime asks for the date first (${dtpError})`);

    // local mode, in a zone with a half-hour offset
    {
      const local = await browser.newPage();
      await local.emulateTimezone("Asia/Kolkata");
      await local.goto(`file://${root}/forms.html`, { waitUntil: "load" });
      await pause();
      const read = () =>
        local.evaluate(() => ({
          whole: (document.querySelector("#dtp-local [data-datetime-value]") as HTMLInputElement).value,
          date: (document.querySelector("#dtp-local [data-datepicker-start]") as HTMLInputElement).value,
          time: (document.querySelector("#dtp-local-time-value") as HTMLInputElement).value,
          zone: document.querySelector("#dtp-local .timepicker__zone")?.textContent,
        }));
      const before = await read();
      check(
        before.whole === "2026-09-14T23:30:00Z" && before.date === "2026-09-15" && before.time === "05:00" &&
          before.zone === "GMT+5:30",
        `forms: local mode shows the viewer's wall time and zone (${JSON.stringify(before)})`,
      );
      await local.click("#dtp-local-time-minute");
      await local.keyboard.type("45");
      const after = await read();
      check(after.whole === "2026-09-15T00:15:00Z", `forms: local edits post UTC (${after.whole})`);
      await local.close();
    }

    // no JS: the native time input is the control
    {
      const plain = await browser.newPage();
      await plain.setJavaScriptEnabled(false);
      await plain.goto(`file://${root}/forms.html`, { waitUntil: "load" });
      const native = await plain.$eval("#tp-basic-value", (el) => {
        const i = el as HTMLInputElement;
        return `${i.type}|${i.name}|${i.value}|${i.offsetParent !== null}|${
          (document.querySelector("#tp-basic") as HTMLElement).offsetParent === null
        }`;
      });
      check(
        native === "time|at|09:30|true|true",
        `forms: without JS the native time input shows and posts (${native})`,
      );
      const nativeDate = await plain.$eval("#dtp-basic-date", (root) => {
        const i = root.querySelector("[data-datepicker-start]") as HTMLInputElement;
        const trigger = root.querySelector("[data-datepicker-trigger]") as HTMLElement;
        return `${i.type}|${i.name}|${i.value}|${i.min}|${i.offsetParent !== null}|${trigger.offsetParent === null}`;
      });
      check(
        nativeDate === "date|go_live-date|2026-09-20|2026-09-14|true|true",
        `forms: without JS the datetime's date half is a native date field (${nativeDate})`,
      );
      await plain.close();
    }

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

    // A form in a modal: the select's tick follows a pick, and a floating
    // panel spills out of the dialog instead of being clipped by it.
    await page.click("[data-modal-open='#cat-modal-3']");
    await pause(300);
    await page.click("#cat-modal-sel");
    await page.click("#cat-modal-sel-list [data-value=ga4]");
    await page.click("#cat-modal-sel");
    const modalTicks = await page.$$eval(
      "#cat-modal-sel-list [role=option]",
      (els) =>
        els.filter((e) => getComputedStyle(e.querySelector(".combobox__check")!).visibility === "visible").map((e) =>
          e.getAttribute("data-value")
        ).join(),
    );
    check(modalTicks === "ga4", `feedback: select in a modal ticks the picked option only (${modalTicks})`);
    await page.keyboard.press("Escape");
    await page.click("[aria-controls=cat-modal-at-time-list]");
    const spill = await page.evaluate(() => {
      const dlg = document.getElementById("cat-modal-3")!;
      const list = document.getElementById("cat-modal-at-time-list")!.getBoundingClientRect();
      const hit = document.elementFromPoint(list.left + 20, list.bottom - 12);
      return { overflow: getComputedStyle(dlg).overflow, reachable: !!hit?.closest("#cat-modal-at-time-list") };
    });
    check(
      spill.overflow === "visible" && spill.reachable,
      `feedback: an open time list escapes the modal's clip (${JSON.stringify(spill)})`,
    );
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
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

  await consoleGaps(page, group.id);

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
