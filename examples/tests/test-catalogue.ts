/// <reference lib="dom" />
/**
 * The catalogue — one demo page per component (demo/components/<name>.html,
 * built by examples/pages/build-demo.ts) — three ways:
 *
 * 1. Coverage, statically: every `export function` in components/ and
 *    every literal of every declared variant/size/tone/status union is
 *    referenced by examples/shared/catalogue.ts (+ charts.ts / data.ts).
 *    Add a component or a variant without cataloguing it and this fails.
 * 2. Every component page renders: its catalogued cases are all present and
 *    non-empty, every chart drew, no console/page errors, no inline
 *    styles, no horizontal overflow, and the dark toggle changes the
 *    canvas.
 * 3. Behaviour, per group (each step moves to the page it drives): slider sync, combobox keyboard, inline date
 *    picker, OTP, dropzone (forms); data-table selection + bulk bar +
 *    sticky header (data); command palette (navigation); popover
 *    (actions); and the theme switcher — each theme's computed body
 *    background, light and dark, through the site header's theme switch.
 */
import { ensureDir, readDir, readTextFile, realPath, writeTextFile } from "@tundralibs/compat/file";
import { exit, getEnv } from "@tundralibs/compat/runtime";
import type { Page } from "puppeteer-core";
import { catalogue, catalogueGroups } from "../shared/catalogue.ts";
import { iconNames } from "../../shared/icons.ts";
import { closeIsolated, isBlockedRequest, isNetworkNoise, isolatedPage, launch, pool } from "./browser.ts";

const issues: string[] = [];
const fail = (s: string) => issues.push(s);
const check = (cond: unknown, s: string) => {
  if (!cond) fail(s);
};
// 260ms: longer than an exit animation (--duration-exit 150ms), so a
// "closed" check after a close never races the panel on its way out.
const pause = (ms = 260) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------- coverage */
const splitSources = await Promise.all(
  (await Array.fromAsync(readDir("examples/shared/catalogue", { includeDirs: false, exts: [".ts"] })))
    .map((e) => `examples/shared/catalogue/${e.name}`).sort().map((path) => readTextFile(path)),
);
const source = (await readTextFile("examples/shared/catalogue.ts")) +
  (await readTextFile("examples/shared/charts.ts")) +
  (await readTextFile("examples/shared/data.ts")) + splitSources.join("\n");
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

/* ------------------------------------------------- inline whitespace */
{
  // Inline components sit in running text and in rows of their own kind:
  // whitespace around their markup renders as a gap (shared/inline.ts).
  const { render } = await import("@tundralibs/rapid/ui");
  const { Avatar, AvatarGroup } = await import("../../components/avatar/avatar.ts");
  const { Badge, Chip } = await import("../../components/badge/badge.ts");
  const { Button, ButtonGroup, CopyButton } = await import("../../components/button/button.ts");
  const { Tooltip } = await import("../../components/tooltip/tooltip.ts");
  const { Progress, Spinner } = await import("../../components/progress/progress.ts");
  const { Switch } = await import("../../components/switch/switch.ts");
  const { Icon } = await import("../../shared/icons.ts");
  const inlines = {
    Avatar: Avatar({ initials: "AB" }),
    AvatarGroup: AvatarGroup({ avatars: [] }),
    Badge: Badge({ label: "x" }),
    Chip: Chip({ label: "x" }),
    Button: Button({ label: "x" }),
    ButtonLink: Button({ label: "x", href: "#" }),
    ButtonGroup: ButtonGroup({ buttons: [] }),
    CopyButton: CopyButton({ value: "x" }),
    Tooltip: Tooltip({ id: "t", trigger: "x", content: "y" }),
    Progress: Progress({ value: 1 }),
    Spinner: Spinner(),
    Switch: Switch({ label: "x" }),
    Icon: Icon("x"),
  };
  for (const [name, markup] of Object.entries(inlines)) {
    const text = render(markup);
    if (text !== text.trim()) fail(`inline: ${name}() emits whitespace around its markup`);
  }
  const tip = render(Tooltip({ id: "t2", trigger: "x", content: "y", attrs: { class: "own" } }));
  if (!/^<span class="tooltip own"/.test(tip)) fail(`inline: Tooltip does not merge attrs.class (${tip.slice(0, 40)})`);
}

/* --------------------------------------------- chart: JSON-only options */
{
  // A function in Chart options cannot reach the page (JSON); Chart says so
  // on the server, naming the path, instead of the chart silently losing it.
  const { render } = await import("@tundralibs/rapid/ui");
  const { Chart } = await import("../../components/chart/chart.ts");
  const warns: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => void warns.push(args.join(" "));
  const out = render(
    Chart({
      id: "fn-probe",
      type: "line",
      series: [{ data: [1, 2] }],
      format: "currency:EUR",
      options: { yaxis: { labels: { formatter: (v: number) => `$${v}` } } },
    }),
  );
  console.warn = warn;
  check(
    warns.some((w) => w.includes("fn-probe options.yaxis.labels.formatter")),
    `chart: a function in options is not reported (${warns})`,
  );
  check(/data-chart-format="[^"]*currency:EUR/.test(out), "chart: format does not reach data-chart-format");
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

/* ------------------------------------------------------------- axe */
// axe-core runs once per catalogue page, on the untouched light render,
// WCAG 2.0/2.1 A + AA. serious and critical violations fail the suite
// unless examples/tests/axe-allowlist.json names the rule + a selector
// pattern with a reason — an allowlist entry is a known gap with an owner,
// never a way to make the suite quiet.
const axeSource = await readTextFile(decodeURIComponent(new URL(import.meta.resolve("axe-core/axe.min.js")).pathname));
type AxeAllow = { rule: string; target: string; reason: string };
const axeAllow: AxeAllow[] = JSON.parse(await readTextFile("examples/tests/axe-allowlist.json"));
const axeAllowed = (rule: string, target: string) =>
  axeAllow.find((a) => a.rule === rule && new RegExp(a.target).test(target));
type AxeViolation = { id: string; impact: string; help: string; nodes: { target: string[] }[] };

async function axePass(page: Page, file: string): Promise<void> {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    // deno-lint-ignore no-explicit-any
    const axe = (globalThis as any).axe;
    const result = await axe.run(document, {
      // preload fetches every stylesheet over XHR, which file:// forbids (CORS noise, no value here)
      preload: false,
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      rules: { "color-contrast": { enabled: true } },
      resultTypes: ["violations"],
    });
    return (result.violations as AxeViolation[]).map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({ target: n.target.map(String) })),
    }));
  });
  axeReport[file] = violations;
  for (const v of violations) {
    if (v.impact !== "serious" && v.impact !== "critical") continue;
    const open = v.nodes.filter((n) => !axeAllowed(v.id, n.target.join(" ")));
    if (!open.length) continue;
    const targets = open.slice(0, 3).map((n) => n.target.join(" ")).join(" | ");
    fail(`${file}: axe ${v.id} (${v.impact}) — ${v.help}: ${open.length} node(s), e.g. ${targets}`);
  }
}
// Every violation (allowlisted ones included, moderate and minor too) lands
// in .test-output/catalogue/axe.json for anyone working the allowlist down.
const axeReport: Record<string, AxeViolation[]> = {};

/** A component's page, from the demo root: every component has one (demo/components/<name>.html). */
const fileOf = (name: string) => `components/${name}.html`;

/**
 * A tab the suite drives; listeners report against whichever page it is on.
 * `isolated` gives it a browser context of its own (the render loop runs
 * several at once, and file:// pages otherwise share one localStorage).
 */
async function openPage(isolated = false): Promise<Page> {
  const page = isolated ? await isolatedPage(browser) : await browser.newPage();
  const here = () => page.url().replace(`file://${root}/`, "");
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 1280, height: 900 });
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warn") && !isNetworkNoise(m)) {
      fail(`${here()}: console.${m.type()}: ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => fail(`${here()}: pageerror: ${e}`));
  page.on(
    "requestfailed",
    (r) => !isBlockedRequest(r) && fail(`${here()}: requestfailed: ${r.url()} — ${r.failure()?.errorText}`),
  );
  // A guarded form left dirty asks before the tab moves on (beforeunload).
  page.on("dialog", (d) => d.accept());
  // file:// pages share one origin, so a persisted theme toggle (or the
  // collapsed sidebar) from the previous page would leak into the next —
  // clear before every page runs (about:blank between groups has no storage).
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.clear();
    } catch { /* about:blank */ }
  });
  return page;
}

/**
 * Moves the tab to a component's page, unless it is already there — then
 * nothing reloads, so a step can build on the state the previous one left.
 */
async function go(page: Page, name: string): Promise<void> {
  const url = `file://${root}/${fileOf(name)}`;
  if (page.url() === url) return;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
}

/**
 * The fixes from the Outsmart Markets rebuild and the Brevily asks
 * (issues #63–#72, 2026-10-19): page rules a host cannot override,
 * data-theme-default, the search InputIcon, a Segmented that scrolls
 * inside itself, the accordion's type, chart number formats, Slider
 * showValue, Navbar menuActions, Switch state words and the consent
 * banner. One block per page.
 */
async function outsmartFixes(page: Page, group: string): Promise<void> {
  /** A new tab on a component's page, its storage holding exactly `seed`. */
  const fresh = async (name: string, seed?: Record<string, string>, width = 1280) => {
    const file = fileOf(name);
    const p = await browser.newPage();
    await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await p.setViewport({ width, height: 800 });
    p.on("pageerror", (e) => fail(`${file} (fresh): pageerror: ${e}`));
    await p.evaluateOnNewDocument((seed) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(seed ?? {})) localStorage.setItem(k, v);
    }, seed ?? {});
    await p.goto(`file://${root}/${file}`, { waitUntil: "networkidle0", timeout: 30000 });
    return p;
  };

  if (group === "forms") {
    await go(page, "input");
    // #66: the glyph paints above the search control's .input-clear wrapper.
    // Hit-testing follows paint order, so let the glyph take the hit for a
    // moment and ask what is on top at its centre.
    const glyph = await page.$eval("#cat-input-icon-search", (host) => {
      host.scrollIntoView({ block: "center", behavior: "instant" });
      const g = host.querySelector(".input-icon__glyph") as HTMLElement;
      g.style.pointerEvents = "auto";
      const r = g.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      g.style.pointerEvents = "";
      const clear = host.querySelector(".input-clear")!.getBoundingClientRect();
      return {
        onTop: !!at && g.contains(at),
        cls: host.className,
        fill: clear.width / host.getBoundingClientRect().width,
      };
    });
    check(glyph.onTop, "forms: the search InputIcon's glyph is painted under the clear-button wrapper");
    check(glyph.fill > 0.99, `forms: the search InputIcon's control does not fill the row (${glyph.fill.toFixed(2)})`);
    check(glyph.cls === "input-icon cat-own-class", `forms: InputIcon does not merge attrs.class (${glyph.cls})`);

    await go(page, "segmented");
    // #67: as wide as its options inside a FormField, not the field.
    const segWide = await page.$eval("#cat-seg-long", (el) => {
      const seg = el.closest(".segmented")!;
      return {
        seg: seg.getBoundingClientRect().width,
        field: seg.closest(".form-field")!.getBoundingClientRect().width,
      };
    });
    check(segWide.seg < segWide.field - 1, `forms: Segmented stretches to its FormField (${JSON.stringify(segWide)})`);

    await go(page, "slider");
    // #72: Slider showValue — a value without a label of its own.
    const slider = await page.$eval("#cat-sl-field", (input) => {
      const root = input.closest(".slider")!;
      const out = root.querySelector(".slider__value")!;
      const before = out.textContent;
      (input as HTMLInputElement).value = "250";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const head = out.parentElement!.getBoundingClientRect();
      const o = out.getBoundingClientRect();
      return {
        label: !!root.querySelector(".slider__label"),
        before,
        after: out.textContent,
        end: head.right - o.right,
      };
    });
    check(!slider.label, "forms: Slider showValue renders a label of its own");
    check(
      slider.before === "150 shares" && slider.after === "250 shares",
      `forms: Slider showValue output (${slider.before} → ${slider.after})`,
    );
    check(Math.abs(slider.end) < 1, `forms: Slider showValue output is not at the row's end (${slider.end}px)`);

    await go(page, "switch");
    // #64: the state word follows the checkbox, with no script.
    const word = (id: string) => page.$eval(`#${id}`, (el) => (el.closest("label") as HTMLElement).innerText.trim());
    const wordBefore = await word("cat-sw-state");
    await page.$eval("#cat-sw-state", (el) => (el as HTMLInputElement).click());
    const wordAfter = await word("cat-sw-state");
    check(
      wordBefore === "Off" && wordAfter === "On",
      `forms: Switch labels did not follow (${wordBefore} → ${wordAfter})`,
    );
    const labelled = await page.$eval("#cat-sw-state-label", (el) => {
      const label = el.closest("label")!;
      return {
        name: label.querySelector(".switch__label")!.firstChild?.textContent,
        text: (label.querySelector(".switch__states") as HTMLElement).innerText.trim(),
        hidden: label.querySelector(".switch__states")!.getAttribute("aria-hidden"),
      };
    });
    check(
      labelled.name === "Profile" && labelled.text === "Shown" && labelled.hidden === "true",
      `forms: Switch label + labels (${JSON.stringify(labelled)})`,
    );

    // #67 on a phone: scrolls inside, never widens the page; the thumb
    // stays on the checked option however far the control is scrolled.
    const phone = await fresh("segmented", undefined, 375);
    const thumb = () =>
      phone.$eval("#cat-seg-long", (el) => {
        const seg = el.closest(".segmented") as HTMLElement;
        const label = seg.querySelector(".segmented__input:checked + .segmented__label")!.getBoundingClientRect();
        const r = seg.getBoundingClientRect();
        const x = parseFloat(getComputedStyle(seg).getPropertyValue("--segmented-x"));
        const left = r.left + seg.clientLeft + 3 + x - seg.scrollLeft;
        return {
          scrolls: seg.scrollWidth > seg.clientWidth,
          off: Math.abs(left - label.left),
          shown: label.left >= r.left - 1 && label.right <= r.right + 1,
          page: document.documentElement.scrollWidth - innerWidth,
        };
      });
    const atLoad = await thumb();
    check(atLoad.page <= 0, `forms@375: a long Segmented widens the page by ${atLoad.page}px`);
    check(atLoad.scrolls, "forms@375: the long Segmented does not scroll inside itself");
    check(
      atLoad.shown && atLoad.off < 1,
      `forms@375: Segmented thumb/checked option at load (${JSON.stringify(atLoad)})`,
    );
    for (const value of ["conservative", "custom"]) {
      await phone.$eval(`#cat-seg-long input[value="${value}"]`, (el) => (el as HTMLInputElement).click());
      await pause(350);
      const after = await thumb();
      check(
        after.shown && after.off < 1,
        `forms@375: Segmented thumb after picking ${value} (${JSON.stringify(after)})`,
      );
    }
    await phone.close();
  }

  if (group === "cards") {
    await go(page, "collapsible");
    // #70: an accordion row reads at body size, not h3 size.
    const acc = await page.$eval("#cat-acc .collapsible__trigger", (t) => {
      const cs = getComputedStyle(t);
      const body = getComputedStyle(t.closest(".collapsible")!);
      return { size: cs.fontSize, body: body.fontSize, family: cs.fontFamily === body.fontFamily };
    });
    check(
      acc.size === acc.body && acc.family,
      `cards: accordion trigger type is not the body's (${JSON.stringify(acc)})`,
    );

    // #65: a host's unlayered page defaults (an embedding frame's) placed
    // ahead of the bundle must not beat the library's page rules.
    const host = await fresh("card");
    const page65 = await host.evaluate(() => {
      const style = document.createElement("style");
      style.textContent =
        'body{margin:0;padding:0;font:14px "Host Sans",serif;background:#fff;color:#000}:root{color-scheme:light}';
      document.head.prepend(style);
      document.documentElement.dataset.theme = "dark";
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("span");
      probe.style.color = "var(--color-text)";
      probe.style.backgroundColor = "var(--color-canvas)";
      document.body.append(probe);
      const want = getComputedStyle(probe);
      const body = getComputedStyle(document.body);
      const title = getComputedStyle(document.querySelector(".card__title")!);
      const out = {
        color: body.color === want.color,
        bg: body.backgroundColor === want.backgroundColor,
        font: body.fontFamily === root.fontFamily && !/Host Sans/.test(body.fontFamily),
        size: body.fontSize !== "14px",
        title: title.color !== "rgb(0, 0, 0)",
        scheme: root.colorScheme,
      };
      probe.remove();
      return out;
    });
    check(
      page65.color && page65.bg && page65.font && page65.size && page65.title && page65.scheme === "dark",
      `cards: a host's unlayered page defaults beat the library's page rules (${JSON.stringify(page65)})`,
    );
    await host.close();

    // #72: data-theme-default — the site's default replaces the system's,
    // in CSS (no script needed) and for the toggle's first click.
    const def = await fresh("card");
    const bgs = await def.evaluate(() => {
      const root = document.documentElement;
      const bg = () => getComputedStyle(document.body).backgroundColor;
      const light = bg();
      root.dataset.theme = "dark";
      const dark = bg();
      delete root.dataset.theme;
      root.dataset.themeDefault = "dark";
      return { light, dark, byDefault: bg(), scheme: getComputedStyle(root).colorScheme };
    });
    check(
      bgs.byDefault === bgs.dark && bgs.dark !== bgs.light && bgs.scheme === "dark",
      `cards: data-theme-default="dark" does not paint dark (${JSON.stringify(bgs)})`,
    );
    await def.click("[data-theme-toggle]");
    await pause(300);
    const flipped = await def.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      stored: localStorage.getItem("ui-theme"),
    }));
    check(
      flipped.theme === "light" && flipped.stored === "light",
      `cards: the toggle's first click under data-theme-default="dark" (${JSON.stringify(flipped)})`,
    );
    await def.close();
  }

  if (group === "charts") {
    await go(page, "chart");
    // #71: number formats as data. Labels carry a <title> twin, so read the
    // first text node's tspan.
    const labels = (sel: string) =>
      page.$$eval(sel, (els) => els.map((e) => e.querySelector("tspan")?.textContent ?? e.textContent ?? ""));
    const y = await labels("#cat-chart-format .apexcharts-yaxis-label");
    check(
      y.length > 0 && y.every((t) => /^\$\d{1,3}(,\d{3})*\.\d{2}$/.test(t)),
      `charts: currency:USD y labels (${y})`,
    );
    const x = await page.$$eval("#cat-chart-format .apexcharts-xaxis-label", (els) => ({
      n: els.filter((e) => e.textContent).length,
      rotated: els.some((e) => /rotate\(-/.test(e.getAttribute("transform") ?? "")),
    }));
    check(
      x.n > 1 && x.n < 30 && !x.rotated,
      `charts: a long category axis is not thinned and level (${JSON.stringify(x)})`,
    );
    const h = await labels("#cat-chart-hformat .apexcharts-xaxis-label");
    check(h.length > 0 && h.every((t) => / ms$/.test(t)), `charts: horizontal bar value axis unit:millisecond (${h})`);
    const sx = await labels("#cat-chart-xformat .apexcharts-xaxis-label");
    check(sx.some((t) => /K$/.test(t)), `charts: scatter xFormat compact (${sx})`);
    const sy = await labels("#cat-chart-xformat .apexcharts-yaxis-label");
    check(sy.length > 0 && sy.every((t) => / sh$/.test(t)), `charts: object format with suffix (${sy})`);
    const iy = await labels("#cat-chart-iformat .apexcharts-yaxis-label");
    check(iy.length > 0 && iy.every((t) => /^\d{1,3}(,\d{3})*$/.test(t)), `charts: integer y labels (${iy})`);
    const cy = await labels("#cat-chart-cformat .apexcharts-yaxis-label");
    check(cy.some((t) => /M$/.test(t)), `charts: compact y labels (${cy})`);
    const pie = await labels(
      "#cat-chart-pformat .apexcharts-datalabel-value, #cat-chart-pformat .apexcharts-datalabels text",
    );
    check(pie.some((t) => /%$/.test(t)), `charts: donut percent (${pie})`);
    // The default value format: no axis on the page prints a float tail.
    const tails = await page.$$eval(
      ".apexcharts-yaxis-label, .apexcharts-xaxis-label",
      (els) => els.map((e) => e.textContent ?? "").filter((t) => /\.\d{4,}/.test(t)),
    );
    check(tails.length === 0, `charts: axis labels with float tails (${tails.slice(0, 3)})`);
  }

  if (group === "navigation") {
    await go(page, "navbar");
    // #72: Navbar menuActions — the phone menu carries what the bar drops.
    const bar = await page.$eval("#cat-nav-menu", (n) => ({
      menu: getComputedStyle(n.querySelector(".navbar__menu-actions")!).display,
      twin: getComputedStyle(n.querySelector(".navbar__actions .hide-md")!).display,
      wrap: getComputedStyle(n.querySelector(".navbar__link")!).whiteSpace,
    }));
    check(
      bar.menu === "none" && bar.twin !== "none" && bar.wrap === "nowrap",
      `navigation@1280: menuActions / hide-md / nowrap links (${JSON.stringify(bar)})`,
    );
    const phone = await fresh("navbar", undefined, 375);
    const state = () =>
      phone.$eval("#cat-nav-menu", (n) => ({
        menu: (n.querySelector(".navbar__menu-actions") as HTMLElement).offsetParent !== null,
        twin: getComputedStyle(n.querySelector(".navbar__actions .hide-md")!).display,
        page: document.documentElement.scrollWidth - innerWidth,
      }));
    const closed = await state();
    await phone.$eval("#cat-nav-menu .navbar__toggle", (el) => (el as HTMLElement).click());
    await pause();
    const open = await state();
    check(
      !closed.menu && open.menu && open.twin === "none" && open.page <= 0,
      `navigation@375: menuActions in the phone menu (${JSON.stringify({ closed, open })})`,
    );
    await phone.close();
  }

  if (group === "feedback") {
    // #63: the consent banner. Every check starts from a page whose
    // storage holds exactly the seed.
    type Consent = { hidden: boolean; sample: number; stored: string | null; focus: string; events: string[] };
    const consent = (p: Page) =>
      p.evaluate(() => {
        const w = globalThis as unknown as { consentSample?: number; __consent?: string[] };
        return {
          hidden: (document.getElementById("cat-consent-banner") as HTMLElement).hidden,
          sample: w.consentSample ?? 0,
          stored: localStorage.getItem("cat-consent"),
          focus: (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? "",
          events: w.__consent ?? [],
        };
      }) as Promise<Consent>;
    const listen = (p: Page) =>
      p.evaluate(() => {
        const w = globalThis as unknown as { __consent: string[]; gtag: unknown; clarity: unknown };
        w.__consent = [];
        document.addEventListener("consent:change", (e) => w.__consent.push((e as CustomEvent).detail.state));
        w.gtag = (...a: unknown[]) => w.__consent.push(`gtag:${JSON.stringify(a)}`);
        w.clarity = (...a: unknown[]) => w.__consent.push(`clarity:${JSON.stringify(a)}`);
      });

    const first = await fresh("consent");
    await listen(first);
    const asked = await consent(first);
    check(
      !asked.hidden && asked.sample === 0,
      `feedback: a first visit is asked, nothing loads (${JSON.stringify(asked)})`,
    );
    await first.$eval("#cat-consent-banner [data-consent-accept]", (el) => (el as HTMLElement).click());
    await pause();
    const accepted = await consent(first);
    check(
      accepted.hidden && accepted.sample === 1 && accepted.stored === "granted" && accepted.events.includes("granted"),
      `feedback: Accept stores granted, loads the loader once, fires consent:change (${JSON.stringify(accepted)})`,
    );
    const loader = await first.$eval('script[src$="consent-sample.js"]', (s) => s.getAttribute("data-id"));
    check(loader === "sample", `feedback: the loader carries its attrs (${loader})`);
    await first.$eval("[data-consent-open]", (el) => (el as HTMLElement).click());
    await pause();
    const reopened = await consent(first);
    check(
      !reopened.hidden && reopened.focus === "Accept",
      `feedback: data-consent-open shows the banner with focus on its first button (${JSON.stringify(reopened)})`,
    );
    await first.$eval("#cat-consent-banner [data-consent-reject]", (el) => (el as HTMLElement).click());
    await pause();
    const rejected = await consent(first);
    check(
      rejected.hidden && rejected.stored === "denied" && rejected.focus === "Cookie settings" &&
        rejected.events.includes('gtag:["consent","update",{"analytics_storage":"denied"}]') &&
        rejected.events.includes('clarity:["consent",false]') && rejected.events.at(-1) === "denied",
      `feedback: Reject stores denied, withdraws, returns focus (${JSON.stringify(rejected)})`,
    );
    await first.close();

    const granted = await fresh("consent", { "cat-consent": "granted" });
    const later = await consent(granted);
    check(
      later.hidden && later.sample === 1,
      `feedback: a later visit after Accept loads without asking (${JSON.stringify(later)})`,
    );
    await granted.close();
    const denied = await fresh("consent", { "cat-consent": "denied" });
    const no = await consent(denied);
    check(
      no.hidden && no.sample === 0,
      `feedback: a later visit after Reject neither asks nor loads (${JSON.stringify(no)})`,
    );
    await denied.close();
  }
}

/**
 * Found designing Brevily's website and console on 0.25.0: a sideways
 * ScrollArea must not trap a vertical wheel, ScrollSpy must read the
 * resolved scroll padding (a theme's calc() token parsed to 0), and an
 * end/start Sheet must be a bottom sheet on a phone.
 */
async function brevilyDesignFixes(group: string): Promise<void> {
  const open = async (name: string, width: number) => {
    const p = await browser.newPage();
    await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await p.setViewport({ width, height: 800 });
    p.on("pageerror", (e) => fail(`${fileOf(name)} (brevily): pageerror: ${e}`));
    await p.goto(`file://${root}/${fileOf(name)}`, { waitUntil: "networkidle0", timeout: 30000 });
    return p;
  };

  if (group === "data") {
    // DataTable pinEnd: the last column stays at the box's end, on an opaque
    // ground in every row state and both themes, and the keyboard gets there.
    const t = await open("data-table", 1280);
    const pinnedState = (tableId: string) =>
      t.$eval(`#${tableId}`, (table) => {
        const box = table.querySelector<HTMLElement>(".data-table__scroll")!;
        box.scrollLeft = 300;
        const boxRight = box.getBoundingClientRect().left + box.clientWidth;
        const cells = [
          table.querySelector("thead th:last-child")!,
          table.querySelector(".data-table__row > td:last-child")!,
        ];
        return {
          overflow: box.scrollWidth > box.clientWidth,
          scrolled: box.scrollLeft,
          tabindex: box.getAttribute("tabindex"),
          name: box.getAttribute("aria-label"),
          cells: cells.map((cell) => {
            const rect = cell.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            // A selection's bulk bar covers the header row by design.
            return {
              right: Math.round(rect.right - boxRight),
              own: !!hit?.closest(".data-table__bulk") || cell.contains(hit),
            };
          }),
        };
      });
    await t.$eval("#cat-dt-pin", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    for (const id of ["cat-dt-pin", "cat-dt-pin-last"]) {
      await t.$eval(`#${id}`, (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
      const state = await pinnedState(id);
      check(state.overflow && state.scrolled > 0, `data: #${id} does not scroll sideways (${JSON.stringify(state)})`);
      check(state.tabindex === "0" && !!state.name, `data: #${id}'s scroll box is not a named tab stop`);
      for (const cell of state.cells) {
        check(cell.right === 0 && cell.own, `data: #${id}'s last column is not pinned (${JSON.stringify(cell)})`);
      }
    }
    // Row states, both themes: opaque, and the edge differs from the ground.
    const ground = (selector: string) =>
      t.$eval(selector, (cell) => {
        const style = getComputedStyle(cell);
        return {
          bg: style.backgroundColor,
          edge: style.borderInlineStartColor,
          width: parseFloat(style.borderInlineStartWidth),
        };
      });
    const opaque = (colour: string) => colour !== "transparent" && !/\/ 0|, 0\)$|\/ 0\.\d+\)$/.test(colour);
    const lastIn = (key: string) => `#cat-dt-pin [data-row-key="${key}"] > td:last-child`;
    for (const theme of ["light", "dark"]) {
      await t.evaluate((name) => {
        document.documentElement.dataset.theme = name;
      }, theme);
      await pause(350);
      await t.mouse.move(0, 0);
      const states: Record<string, { bg: string; edge: string; width: number }> = {
        header: await ground("#cat-dt-pin thead th:last-child"),
        plain: await ground(lastIn("1")),
        selected: await ground(lastIn("2")),
      };
      await t.hover(`#cat-dt-pin [data-row-key="1"] > td:nth-child(3)`);
      await pause(100);
      states.hover = await ground(lastIn("1"));
      for (const [name, value] of Object.entries(states)) {
        check(opaque(value.bg), `data: pinned ${name} cell is see-through in ${theme}: ${value.bg}`);
        check(value.width > 0 && value.edge !== value.bg, `data: pinned ${name} cell has no edge in ${theme}`);
      }
      check(states.plain.bg !== states.selected.bg, `data: a selected row's pinned cell ignores the tint in ${theme}`);
      check(states.plain.bg !== states.hover.bg, `data: a hovered row's pinned cell ignores the hover in ${theme}`);
    }
    await t.evaluate(() => {
      delete document.documentElement.dataset.theme;
    });
    // Keyboard: Tab into the box, arrows scroll it, a link scrolled under the
    // pinned cell comes clear on focus, the row's actions are in the order.
    await t.$eval("#cat-dt-pin .data-table__scroll", (box) => {
      box.scrollLeft = 0;
      const before = box.closest(".data-table")!.querySelector<HTMLElement>(".data-table__title");
      before?.setAttribute("tabindex", "-1");
      before?.focus();
    });
    await t.keyboard.press("Tab");
    const stop = await t.evaluate(() => document.activeElement?.classList.contains("data-table__scroll"));
    check(!!stop, "data: Tab does not reach the pinEnd scroll box");
    const outline = await t.$eval("#cat-dt-pin .data-table__scroll", (el) => getComputedStyle(el).outlineStyle);
    check(outline === "solid", `data: the focused scroll box has no ring (${outline})`);
    await t.keyboard.press("ArrowRight");
    await pause(300);
    const arrowed = await t.$eval("#cat-dt-pin .data-table__scroll", (el) => el.scrollLeft);
    check(arrowed > 0, "data: arrow keys do not scroll the pinEnd box");
    const walk: string[] = [];
    for (let i = 0; i < 12; i++) {
      await t.keyboard.press("Tab");
      await pause(250);
      const at = await t.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const row = el.closest("[data-row-key]");
        if (!row) return { kind: "outside", clear: true };
        const pin = row.querySelector("td:last-child")!;
        const rect = el.getBoundingClientRect();
        const pinned = pin.contains(el);
        return {
          kind: pinned ? "action" : el.tagName,
          clear: pinned || rect.right <= pin.getBoundingClientRect().left + 1,
        };
      });
      walk.push(at.kind);
      check(at.clear, `data: Tab left a ${at.kind} under the pinned cell`);
      if (at.kind === "action") break;
    }
    check(walk.includes("A") && walk.includes("action"), `data: Tab did not walk a row to its actions: ${walk}`);
    // The strip still opens from a pinned kebab, inside the box.
    await t.keyboard.press("Enter");
    await pause(400);
    const strip = await t.evaluate(() => {
      const open = document.querySelector<HTMLElement>("#cat-dt-pin .data-table__row-actions:not([hidden])");
      if (!open) return null;
      const box = open.closest(".data-table__scroll")!.getBoundingClientRect();
      const rect = open.getBoundingClientRect();
      return rect.right <= box.right + 1 && rect.left >= box.left - 1;
    });
    check(strip === true, `data: a pinned row's action strip did not open inside the box (${strip})`);
    await t.keyboard.press("Escape");
    await pause(400);
    // Axe on the pinned tables, with the box scrolled.
    await t.addScriptTag({ content: axeSource });
    const pinAxe = await t.evaluate(async () => {
      // deno-lint-ignore no-explicit-any
      const axe = (globalThis as any).axe;
      const found: string[] = [];
      for (const id of ["cat-dt-pin", "cat-dt-pin-last", "cat-dt-pin-fits"]) {
        const result = await axe.run(`#${id}`, {
          preload: false,
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
        // deno-lint-ignore no-explicit-any
        found.push(...result.violations.map((v: any) => `${v.id}: ${v.nodes[0].target}`));
      }
      return found;
    });
    check(pinAxe.length === 0, `data: axe on a pinEnd table: ${pinAxe}`);
    // A table that fits holds no tab stop; a table without the option has none of this.
    const others = await t.evaluate(() => {
      const fits = document.querySelector("#cat-dt-pin-fits .data-table__scroll")!;
      const plain = document.getElementById("cat-dt-1")!;
      return {
        fits: fits.getAttribute("tabindex"),
        plainTab: plain.querySelector(".data-table__scroll")!.getAttribute("tabindex"),
        plainHead: getComputedStyle(plain.querySelector("thead th:last-child")!).insetInlineEnd,
        plainEdge: getComputedStyle(plain.querySelector(".data-table__row > td:last-child")!).borderInlineStartWidth,
      };
    });
    check(others.fits === null, "data: a pinEnd table that fits keeps a dead tab stop");
    check(
      others.plainTab === null && others.plainHead === "auto" && others.plainEdge === "0px",
      `data: a table without pinEnd changed (${JSON.stringify(others)})`,
    );
    // A table that fits draws no edge; rows poking past an uncapped box are not
    // a reason for a tab stop; growing wide brings both back; a capped box that
    // overflows downwards is a tab stop with no edge.
    const fit = await t.evaluate(async () => {
      const box = document.querySelector<HTMLElement>("#cat-dt-pin-fits .data-table__scroll")!;
      const edge = () =>
        getComputedStyle(box.querySelector(".data-table__row > td:last-child")!).borderInlineStartWidth;
      const head = () => getComputedStyle(box.querySelector("thead th:last-child")!).borderInlineStartWidth;
      const settle = () => new Promise((res) => setTimeout(res, 100));
      const state = () => ({ tab: box.getAttribute("tabindex"), edge: edge(), head: head() });
      const fits = state();
      const row = box.querySelector<HTMLElement>(".data-table__row:last-child")!;
      row.style.transform = "translateY(12px)";
      const poked = box.scrollHeight > box.clientHeight + 1;
      document.dispatchEvent(new CustomEvent("rapid:swapped", { detail: { method: "get" } }));
      await settle();
      const rising = state();
      row.style.transform = "";
      const cell = box.querySelector<HTMLElement>(".data-table__row > td:first-child")!;
      const text = cell.textContent;
      cell.textContent = "wide ".repeat(400);
      await settle();
      const grown = state();
      cell.textContent = text;
      await settle();
      const shrunk = state();
      box.style.maxHeight = "40px";
      await settle();
      const capped = state();
      box.style.maxHeight = "";
      return { fits, poked, rising, grown, shrunk, capped };
    });
    check(
      fit.fits.edge === "0px" && fit.fits.head === "0px",
      `data: a pinEnd table that fits draws an edge (${JSON.stringify(fit.fits)})`,
    );
    check(
      fit.poked && fit.rising.tab === null,
      `data: rows rising in gave a fitting table a tab stop (${JSON.stringify(fit)})`,
    );
    check(
      fit.grown.tab === "0" && fit.grown.edge !== "0px",
      `data: a pinEnd table that grew wide has no stop or edge (${JSON.stringify(fit.grown)})`,
    );
    check(
      fit.shrunk.tab === null && fit.shrunk.edge === "0px",
      `data: a pinEnd table that shrank back kept its stop or edge (${JSON.stringify(fit.shrunk)})`,
    );
    check(
      fit.capped.tab === "0" && fit.capped.edge === "0px",
      `data: a capped pinEnd box is wrong (${JSON.stringify(fit.capped)})`,
    );
    await t.close();
    // Without the script nothing is measured: the edge stays, the box stays a stop.
    const plainPage = await browser.newPage();
    await plainPage.setJavaScriptEnabled(false);
    await plainPage.setViewport({ width: 1280, height: 800 });
    await plainPage.goto(`file://${root}/${fileOf("data-table")}`, { waitUntil: "load", timeout: 30000 });
    const noScript = await plainPage.$eval(
      "#cat-dt-pin-fits .data-table__row > td:last-child",
      (cell) => getComputedStyle(cell).borderInlineStartWidth,
    );
    check(noScript !== "0px", "data: without the script a pinEnd table loses its edge");
    await plainPage.close();
    // Below 768 the option does nothing: the same cards, and nothing pinned.
    const phone = await open("data-table", 375);
    const cards = await phone.evaluate(() => {
      const shape = (id: string) => {
        const table = document.getElementById(id)!;
        return [...table.querySelectorAll(".data-table__row, .data-table__row > td")].map((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return [
            Math.round(rect.width),
            Math.round(rect.height),
            style.position,
            style.display,
            style.borderInlineStartWidth,
            style.backgroundColor,
          ].join(" ");
        }).join("|");
      };
      const last = document.querySelector("#cat-dt-pin-last .data-table__row > td:last-child")!;
      return {
        on: shape("cat-dt-pin-cards-true"),
        off: shape("cat-dt-pin-cards-false"),
        tab: document.querySelector("#cat-dt-pin-cards-true .data-table__scroll")!.getAttribute("tabindex"),
        last: getComputedStyle(last).position,
        pageWide: document.documentElement.scrollWidth > innerWidth,
      };
    });
    check(cards.on === cards.off, "data: pinEnd changed the card layout below 768");
    check(cards.tab === null, "data: a card layout keeps a dead tab stop from pinEnd");
    check(cards.last === "static", `data: pinEnd pinned a column below 768 (${cards.last})`);
    check(!cards.pageWide, "data: the pinEnd cases widen the page at 375");
    await phone.close();

    // Stat href: the label is the link; inside a Card its hit area is the
    // whole card (a point in the card's padding resolves to the link), a
    // bare stat's is the tile. The note sits under the value.
    const p = await open("stat", 1280);
    const stat = await p.evaluate(() => {
      const hit = (el: Element, dx: number, dy: number) => {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const r = el.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + dx, r.top + dy);
        return at?.closest("a")?.getAttribute("href") ?? null;
      };
      const linked = document.getElementById("cat-stat-link")!;
      const card = linked.closest(".card")!;
      const bare = document.getElementById("cat-stat-bare")!;
      const note = linked.querySelector(".stat__note")!.getBoundingClientRect();
      const val = linked.querySelector(".stat__value")!.getBoundingClientRect();
      return {
        name: linked.querySelector("a.stat__link")?.textContent?.trim(),
        cardCorner: hit(card, 4, 4),
        cardBottom: hit(card, card.getBoundingClientRect().width - 4, card.getBoundingClientRect().height - 4),
        bareValue: hit(bare.querySelector(".stat__value")!, 4, 4),
        noteBelow: note.top >= val.bottom - 1,
        unlinked: document.querySelector("#cat-stat .stat:not(.stat--link) a") === null,
      };
    });
    check(
      stat.name === "Suspended" && stat.cardCorner === "#cat-stat-suspended" &&
        stat.cardBottom === "#cat-stat-suspended" && stat.bareValue === "#cat-stat-review" && stat.noteBelow &&
        stat.unlinked,
      `data: Stat href / note (${JSON.stringify(stat)})`,
    );
    await p.close();
  }

  if (group === "forms") {
    // Combobox without a visible label: ariaLabel names the input and the
    // listbox; labelledBy points both at the caption; a visible label
    // names the listbox through its id.
    const p = await open("combobox", 1280);
    const names = await p.evaluate(() => {
      const of = (id: string) => {
        const input = document.getElementById(id)!;
        const list = document.getElementById(`${id}-list`)!;
        return {
          input: [input.getAttribute("aria-label"), input.getAttribute("aria-labelledby")],
          list: [list.getAttribute("aria-label"), list.getAttribute("aria-labelledby")],
        };
      };
      return { scope: of("cat-cb-scope"), caption: of("cat-cb-caption"), labelled: of("cat-req-cb-one") };
    });
    const label = await p.$eval("#cat-req-cb-one-label", (el) => el.getAttribute("for")).catch(() => null);
    check(
      JSON.stringify(names.scope) === JSON.stringify({ input: ["Organisation", null], list: ["Organisation", null] }) &&
        JSON.stringify(names.caption) ===
          JSON.stringify({ input: [null, "cat-cb-caption-text"], list: [null, "cat-cb-caption-text"] }) &&
        JSON.stringify(names.labelled) ===
          JSON.stringify({ input: [null, null], list: [null, "cat-req-cb-one-label"] }) &&
        label === "cat-req-cb-one",
      `forms: Combobox ariaLabel / labelledBy (${JSON.stringify({ names, label })})`,
    );
    await p.close();
  }

  if (group === "cards") {
    const p = await open("scroll-area", 1280);
    const axes = await p.$eval("#cat-scroll-wide", (el) => {
      const cs = getComputedStyle(el);
      return { x: cs.overscrollBehaviorX, y: cs.overscrollBehaviorY };
    });
    check(
      axes.x === "contain" && axes.y === "auto",
      `cards: ScrollArea axis x contains the wrong axes (${JSON.stringify(axes)})`,
    );
    // A real wheel over the table, scrolled to its end so no other box
    // could take the wheel: the page itself must move.
    const at = await p.$eval("#cat-scroll-wide", (el) => {
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, before: scrollY };
    });
    await p.mouse.move(at.x, at.y);
    await p.mouse.wheel({ deltaY: 400 });
    await pause(400);
    const after = await p.evaluate(() => scrollY);
    check(
      after > at.before + 50,
      `cards: a vertical wheel over an axis-x ScrollArea did not scroll the page (${at.before} → ${after})`,
    );
    await p.close();
  }

  if (group === "cards") {
    // Collapsible is a native <details>: an accordion row is a deep-link
    // target — open on arrival (already at DOMContentLoaded, no
    // transition), the rest of the accordion closed, a target inside the
    // row scrolled under scroll-padding-top.
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 800 });
    p.on("pageerror", (e) => fail(`${fileOf("collapsible")} (deep link): pageerror: ${e}`));
    await p.evaluateOnNewDocument(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const row = document.getElementById("cat-faq-cancel") as HTMLDetailsElement | null;
        (globalThis as { atReady?: unknown }).atReady = row && {
          open: row.open,
          animating: !!row.querySelector(".is-animating, .is-collapsed"),
        };
      });
    });
    await p.goto(`file://${root}/${fileOf("collapsible")}#cat-faq-cancel-note`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await pause();
    const rows = () =>
      p.evaluate(() =>
        Object.fromEntries(
          ["refunds", "plans", "cancel"].map((k) => {
            const row = document.getElementById(`cat-faq-${k}`) as HTMLDetailsElement;
            return [k, row.matches("details.collapsible") && row.open];
          }),
        )
      );
    const land = await p.evaluate(() => ({
      ready: (globalThis as { atReady?: unknown }).atReady,
      top: document.getElementById("cat-faq-cancel-note")!.getBoundingClientRect().top,
      pad: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
    }));
    const onLoad = await rows();
    check(
      onLoad.cancel && !onLoad.refunds && !onLoad.plans,
      `cards: a hash inside an accordion row did not open only that row (${JSON.stringify(onLoad)})`,
    );
    check(
      JSON.stringify(land.ready) === JSON.stringify({ open: true, animating: false }),
      `cards: the deep-linked row was not open, without a transition, by DOMContentLoaded (${
        JSON.stringify(land.ready)
      })`,
    );
    check(
      Math.abs(land.top - land.pad) < 4,
      `cards: the deep-linked target is not under scroll-padding-top (${land.top} vs ${land.pad})`,
    );
    await p.evaluate(() => (location.hash = "#cat-faq-plans"));
    await pause();
    const onChange = await rows();
    check(
      onChange.plans && !onChange.cancel && !onChange.refunds,
      `cards: hashchange to an accordion row did not open it alone (${JSON.stringify(onChange)})`,
    );

    // A click animates: the row opens at once and grows; a closing row keeps
    // `open` (and loses the turned icon) until its panel has shut; the row
    // it replaces in the accordion closes the same way.
    const click = await p.evaluate(async () => {
      const row = (id: string) => document.getElementById(id) as HTMLDetailsElement;
      const named = !!document.querySelector("details.collapsible[name]");
      const adopted = row("cat-faq-refunds").getAttribute("data-collapsible-name");
      (row("cat-faq-refunds").querySelector("summary") as HTMLElement).click();
      const during = {
        refunds: row("cat-faq-refunds").open,
        plans: row("cat-faq-plans").open,
        plansClosing: row("cat-faq-plans").classList.contains("is-closing"),
      };
      await new Promise((r) => setTimeout(r, 700));
      const after = { refunds: row("cat-faq-refunds").open, plans: row("cat-faq-plans").open };
      (row("cat-faq-refunds").querySelector("summary") as HTMLElement).click();
      const closing = row("cat-faq-refunds").open && row("cat-faq-refunds").classList.contains("is-closing");
      await new Promise((r) => setTimeout(r, 700));
      return { named, adopted, during, after, closing, shut: !row("cat-faq-refunds").open };
    });
    check(
      !click.named && click.adopted === "cat-faq",
      `cards: the accordion's native name was not adopted (${JSON.stringify(click)})`,
    );
    check(
      click.during.refunds && click.during.plans && click.during.plansClosing && click.after.refunds &&
        !click.after.plans && click.closing && click.shut,
      `cards: an accordion click did not animate open/closed (${JSON.stringify(click)})`,
    );
    await p.close();

    // Without JS the rows still open and close: <details>, natively exclusive by name.
    const nojs = await browser.newPage();
    await nojs.setJavaScriptEnabled(false);
    await nojs.setViewport({ width: 1280, height: 800 });
    await nojs.goto(`file://${root}/${fileOf("collapsible")}`, { waitUntil: "load", timeout: 30000 });
    const opened = async (id: string) => await nojs.$eval(`#${id}`, (el) => (el as HTMLDetailsElement).open);
    const names = await nojs.$$eval(
      "#cat-faq > details.collapsible",
      (rows) => rows.map((r) => r.getAttribute("name")),
    );
    await nojs.$eval("#cat-faq-plans > summary", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await nojs.click("#cat-faq-plans > summary");
    const plansOpen = await opened("cat-faq-plans");
    const refundsOpen = await opened("cat-faq-refunds");
    await nojs.click("#cat-faq-plans > summary");
    const plansShut = !(await opened("cat-faq-plans"));
    check(
      names.every((n) => n === "cat-faq") && plansOpen && !refundsOpen && plansShut,
      `cards: without JS an accordion row does not open/close natively (${
        JSON.stringify({ names, plansOpen, refundsOpen, plansShut })
      })`,
    );
    await nojs.close();
  }

  if (group === "navigation") {
    const p = await open("scrollspy", 1280);
    // A theme's calc() token: 80px. The Usage heading sits just under it.
    const current = await p.evaluate(async () => {
      document.documentElement.style.setProperty("--scroll-padding-top", "calc(64px + 1rem)");
      const h = document.getElementById("cat-spy-usage")!;
      scrollTo({ top: h.getBoundingClientRect().top + scrollY - 82, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      dispatchEvent(new Event("scroll"));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return document.querySelector('#cat-spy-1 a[aria-current="true"]')?.getAttribute("href");
    });
    check(current === "#cat-spy-usage", `navigation: ScrollSpy ignored a calc() --scroll-padding-top (${current})`);
    await p.close();
  }

  if (group === "navigation") {
    // Sidebar head/sections/foot/navLabel and the edge collapse toggle (the
    // Brevily console's hand-written sidebar, as props).
    const p = await open("sidebar", 1280);
    const read = () =>
      p.evaluate(() => {
        const sb = document.getElementById("cat-sb-full")!;
        const shown = (sel: string) => {
          const el = sb.querySelector(sel) as HTMLElement | null;
          return !!el && el.getClientRects().length > 0;
        };
        const t = sb.querySelector(".sidebar__collapse-toggle")!.getBoundingClientRect();
        const r = sb.getBoundingClientRect();
        const groups = [...sb.querySelectorAll(".sidebar__section")].map((g) =>
          document.getElementById(g.getAttribute("aria-labelledby") ?? "")?.textContent?.trim()
        );
        return {
          nav: sb.querySelector(".sidebar__nav")!.getAttribute("aria-label"),
          groups,
          order: [...sb.children].map((c) => c.className.split(" ")[0]),
          edge: Math.round((t.left + t.width / 2 - r.right) * 10) / 10,
          top: Math.round(t.top - r.top),
          foot: shown(".sidebar__foot"),
          label: shown(".sidebar__label"),
          sectionLabel: shown(".sidebar__section-label"),
          title: document.getElementById("cat-sb-full-create")!.getAttribute("title"),
          width: Math.round(r.width),
        };
      });
    const wide = await read();
    check(
      wide.nav === "Console" && JSON.stringify(wide.groups) === JSON.stringify(["Workspace", "Help"]),
      `navigation: Sidebar navLabel/sections are not named (${JSON.stringify(wide)})`,
    );
    check(
      JSON.stringify(wide.order) ===
        JSON.stringify([
          "sidebar__brand",
          "sidebar__collapse-toggle",
          "sidebar__head",
          "sidebar__nav",
          "sidebar__foot",
        ]),
      `navigation: Sidebar parts are out of order (${JSON.stringify(wide.order)})`,
    );
    check(
      Math.abs(wide.edge) <= 1.5 && wide.top < 40 && wide.foot && wide.label && wide.sectionLabel && !wide.title,
      `navigation: the expanded Sidebar with an edge toggle is wrong (${JSON.stringify(wide)})`,
    );
    // The organisation switcher in the head floats free of the sidebar's scroll box.
    await p.click("#cat-sb-full-org .dropdown__trigger");
    await pause();
    const panel = await p.$eval("#cat-sb-full-org .dropdown__panel", (el) => ({
      open: !(el as HTMLElement).hidden,
      fixed: getComputedStyle(el).position,
    }));
    check(
      panel.open && panel.fixed === "fixed",
      `navigation: the Sidebar head's dropdown is clipped (${JSON.stringify(panel)})`,
    );
    await p.keyboard.press("Escape");
    await p.click("#cat-sb-full .sidebar__collapse-toggle");
    await pause(500);
    const rail = await read();
    check(
      Math.abs(rail.edge) <= 1.5 && !rail.foot && !rail.label && !rail.sectionLabel && rail.title === "Create link" &&
        rail.width < 90,
      `navigation: the collapsed rail does not fold head/foot/sections (${JSON.stringify(rail)})`,
    );
    await p.click("#cat-sb-full .sidebar__collapse-toggle");
    await pause(500);
    const back = await read();
    check(
      !back.title && back.foot,
      `navigation: expanding the Sidebar again left the rail state (${JSON.stringify(back)})`,
    );
    // A theme's layout tokens size the sidebar and its rail; the toggle draws an icon.
    const sized = await p.evaluate(async () => {
      const root = document.documentElement.style;
      const sb = document.getElementById("cat-sb-full")!;
      root.setProperty("--layout-sidebar-width", "20rem");
      root.setProperty("--layout-rail-width", "5rem");
      sb.classList.add("sidebar--collapsed");
      await new Promise((r) => setTimeout(r, 400));
      const rail = Math.round(sb.getBoundingClientRect().width);
      sb.classList.remove("sidebar--collapsed");
      await new Promise((r) => setTimeout(r, 400));
      const full = Math.round(sb.getBoundingClientRect().width);
      root.removeProperty("--layout-sidebar-width");
      root.removeProperty("--layout-rail-width");
      return { full, rail, svg: !!sb.querySelector(".sidebar__collapse-icon > svg") };
    });
    check(
      sized.full === 320 && sized.rail === 80 && sized.svg,
      `navigation: Sidebar ignores --layout-sidebar-width/--layout-rail-width or draws no chevron (${
        JSON.stringify(sized)
      })`,
    );
    await p.close();
  }

  if (group === "feedback") {
    const p = await open("sheet", 375);
    for (const side of ["end", "start"]) {
      await p.$eval(`#cat-sheet-${side}-open`, (el) => (el as HTMLElement).click());
      await pause(600);
      const r = await p.$eval(`#cat-sheet-${side} .sheet__panel`, (el) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, vw: innerWidth, vh: innerHeight };
      });
      check(
        Math.abs(r.left) < 1 && Math.abs(r.right - r.vw) < 1 && Math.abs(r.bottom - r.vh) < 1 &&
          r.top > r.vh * 0.15 - 1,
        `feedback: the ${side} Sheet at 375 is not a bottom sheet (${JSON.stringify(r)})`,
      );
      await p.$eval(`#cat-sheet-${side} [data-sheet-close]`, (el) => (el as HTMLElement).click());
      await pause(400);
    }
    await p.close();
  }
}

/**
 * brevily-design's asks moving to 0.27.0 (2026-10-30): a MenuItem badge
 * that stays out of the rail's tooltip and flyout title, a chart box that
 * is its height before the engine draws, Select sizes, Input inputmode.
 */
async function designAsks(group: string): Promise<void> {
  const open = async (name: string, width: number, js = true) => {
    const p = await browser.newPage();
    await p.setJavaScriptEnabled(js);
    await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await p.setViewport({ width, height: 800 });
    p.on("pageerror", (e) => fail(`${fileOf(name)} (design asks): pageerror: ${e}`));
    await p.goto(`file://${root}/${fileOf(name)}`, { waitUntil: "networkidle0", timeout: 30000 });
    return p;
  };

  if (group === "navigation") {
    const m = await open("menu", 1280);
    const menu = await m.evaluate(() => {
      const list = document.getElementById("cat-menu-badges")!;
      const links = [...list.querySelectorAll(":scope > li > .menu__link")];
      const parent = links[2];
      const badge = parent.querySelector(".menu__badge")!.getBoundingClientRect();
      const caret = parent.querySelector(".menu__caret")!.getBoundingClientRect();
      return {
        labels: links.map((l) => l.querySelector(".menu__link-label")!.textContent!.trim()),
        badges: links.map((l) => l.querySelector(".menu__badge")?.textContent?.trim() ?? ""),
        inLabel: list.querySelector(".menu__link-label .badge") !== null,
        danger: links[1].classList.contains("menu__link--alert") &&
          !!links[1].querySelector(".badge--danger") && !links[0].classList.contains("menu__link--alert"),
        beforeCaret: badge.right <= caret.left + 1,
      };
    });
    check(
      menu.labels.join("|") === "Inbox|Incidents|Link setup|Settings" &&
        menu.badges.join("|") === "6|2 open|3|" && !menu.inLabel && menu.danger && menu.beforeCaret,
      `navigation: MenuItem badge (${JSON.stringify(menu)})`,
    );
    await m.close();

    const p = await open("sidebar", 1280);
    await p.$eval("#cat-sb-badges", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await p.click("#cat-sb-badges .sidebar__collapse-toggle");
    await pause(500);
    const rail = await p.evaluate(() => {
      const sb = document.getElementById("cat-sb-badges")!;
      const links = [...sb.querySelectorAll(".menu__list > li > .menu__link")];
      const dot = (l: Element) => getComputedStyle(l.querySelector(".menu__icon")!, "::after").content;
      return {
        collapsed: sb.classList.contains("sidebar--collapsed"),
        titles: links.map((l) => l.getAttribute("title")),
        badgeShown: [...sb.querySelectorAll(".menu__list > li > .menu__link > .menu__badge")].some((b) =>
          getComputedStyle(b).display !== "none"
        ),
        dots: links.map((l) => dot(l) !== "none"),
      };
    });
    await p.click("#cat-sb-badges .menu__list > li:nth-child(3) > .menu__link");
    await pause(400);
    const flyout = await p.evaluate(() => {
      const sub = document.querySelector("#cat-sb-badges .menu__sublist--flyout");
      return {
        title: sub?.querySelector(".menu__flyout-title")?.textContent?.trim(),
        badges: [...(sub?.querySelectorAll(".menu__badge") ?? [])].map((b) =>
          getComputedStyle(b).display !== "none" ? b.textContent!.trim() : ""
        ),
      };
    });
    await p.keyboard.press("Escape");
    await p.click("#cat-sb-badges .sidebar__collapse-toggle");
    await pause(400);
    check(
      rail.collapsed && rail.titles.join("|") === "Inbox|Incidents|Link setup|Settings" && !rail.badgeShown &&
        rail.dots.join() === "false,true,false,false" && flyout.title === "Link setup" &&
        flyout.badges.join("|") === "2|1",
      `navigation: badges on the collapsed rail (${JSON.stringify({ rail, flyout })})`,
    );
    await p.close();
  }

  if (group === "forms") {
    const p = await open("select", 1280);
    const sizes = await p.evaluate(() =>
      ["sm", "md", "lg"].map((size) => {
        const sel = document.getElementById(`cat-sel-size-${size}`)!.closest(".select")!;
        const input = sel.parentElement!.querySelector("input.input")!;
        return {
          size,
          input: Math.round(input.getBoundingClientRect().height),
          select: Math.round(sel.querySelector(".combobox__field")!.getBoundingClientRect().height),
          font: getComputedStyle(sel.querySelector(".select__button")!).fontSize ===
            getComputedStyle(input).fontSize,
        };
      })
    );
    check(
      sizes.every((s) => s.input === s.select && s.font) && sizes[0].select < sizes[1].select &&
        sizes[1].select < sizes[2].select,
      `forms: Select size does not match Input size (${JSON.stringify(sizes)})`,
    );
    await p.close();
    const i = await open("input", 1280);
    const mode = await i.$eval("#cat-inputmode", (el) => el.getAttribute("inputmode"));
    check(mode === "numeric", `forms: Input inputmode not rendered (${mode})`);
    await i.close();
  }

  if (group === "charts") {
    // Without script the engine never draws: the box is already the 300px
    // chart plus ApexCharts' 15px parentHeightOffset, what it ends at.
    const bare = await open("chart", 1280, false);
    const before = await bare.$eval("#cat-chart-reserve", (el) => Math.round(el.getBoundingClientRect().height));
    await bare.close();
    const p = await open("chart", 1280);
    await p.waitForFunction(() => !!document.querySelector("#cat-chart-reserve .apexcharts-canvas"), {
      timeout: 15000,
    });
    await pause(300);
    const after = await p.$eval("#cat-chart-reserve", (el) => ({
      box: Math.round(el.getBoundingClientRect().height),
      canvas: Math.round(el.querySelector(".apexcharts-canvas")!.getBoundingClientRect().height),
    }));
    check(
      before === 315 && after.box === before && after.canvas === 300,
      `charts: the chart box does not reserve its height (${JSON.stringify({ before, after })})`,
    );
    await p.close();
  }
}

/**
 * The playbook review of the Brevily website (2026-10-30): titles that
 * read as titles in prose and on plan cards, Reveal never hiding text by
 * default, ScrollSteps' stage agreeing with the text on screen, and a
 * Hero that fills the first screen.
 */
async function playbookAsks(group: string): Promise<void> {
  const open = async (name: string, width: number, height = 800) => {
    const p = await browser.newPage();
    await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await p.setViewport({ width, height });
    p.on("pageerror", (e) => fail(`${fileOf(name)} (playbook): pageerror: ${e}`));
    await p.goto(`file://${root}/${fileOf(name)}`, { waitUntil: "networkidle0", timeout: 30000 });
    return p;
  };

  if (group === "cards") {
    {
      const p = await open("code", 1440);
      const rows = await p.$$eval("#cat-code-blank .code", (blocks) =>
        blocks.map((block) => {
          const lines = [...block.querySelectorAll(".code__line")];
          return {
            count: lines.length,
            heights: lines.map((l) => l.getBoundingClientRect().height),
            numbers: lines.map((l) => getComputedStyle(l, "::before").content),
            copied: lines.map((l) => l.textContent).join("\n"),
          };
        }));
      check(rows.length === 4, `cards: expected 4 blank-line code samples, found ${rows.length}`);
      for (const [i, row] of rows.entries()) {
        check(
          row.count === 3 && row.heights[1] > 0 && Math.abs(row.heights[1] - row.heights[0]) < 1,
          `cards: a blank code line collapsed in sample ${i} (${JSON.stringify(row.heights)})`,
        );
        check(!row.copied.includes("\u200b"), `cards: the blank-line filler reached the text of sample ${i}`);
      }
      check(
        rows[1]?.numbers.every((n) => n.startsWith("counter(")),
        `cards: a numbered code block lost its line numbers (${JSON.stringify(rows[1]?.numbers)})`,
      );

      const langs = await p.$$eval("#cat-code-langs .code", (blocks) =>
        blocks.map((block) => {
          const toks = (cls: string) => [...block.querySelectorAll(`.tok-${cls}`)].map((t) => t.textContent ?? "");
          const line = (text: string) =>
            [...block.querySelectorAll(".code__line")].find((l) => l.textContent?.includes(text));
          return {
            kw: toks("kw"),
            str: toks("str"),
            com: toks("com"),
            variable: toks("var"),
            fn: toks("fn"),
            attr: toks("attr"),
            tag: toks("tag"),
            type: toks("type"),
            comment2: line("never ===")?.firstElementChild?.className,
            docEnd: line('Never with ==."""')?.firstElementChild?.className,
            afterDoc: line("expected =")?.querySelector(".tok-fn")?.textContent,
            textBlock: line("multi-line text")?.firstElementChild?.className,
          };
        }));
      const [py, php, java] = langs;
      check(
        py.kw.includes("def") && py.kw.includes("return") && py.fn.includes("@webhook") && py.fn.includes("verify") &&
          py.com.some((c) => c.startsWith("# hex")) && py.variable.includes("self") && py.docEnd === "tok-str" &&
          py.afterDoc === "new" && py.str.includes('"sha256"'),
        `cards: python tokens wrong (${JSON.stringify(py)})`,
      );
      check(
        php.tag.includes("<?php") && php.kw.includes("function") && php.variable.includes("$body") &&
          php.str.includes("'sha256'") && php.comment2 === "tok-com" && php.com.some((c) => c.startsWith("// true")),
        `cards: php tokens wrong (${JSON.stringify(php)})`,
      );
      check(
        java.attr.includes("@Override") && java.kw.includes("public") && java.type.includes("MessageDigest") &&
          java.str.includes('"HmacSHA256"') && java.com.includes("// constant time") && java.textBlock === "tok-str",
        `cards: java tokens wrong (${JSON.stringify(java)})`,
      );

      const aside = await p.$eval("#cat-code-aside", (block) => {
        const header = block.querySelector(".code__header")!;
        const order = [...header.children].map((c) => c.className.split(" ")[0]);
        const style = (sel: string) => getComputedStyle(block.querySelector(sel)!);
        const copy = block.querySelector(".code__copy")!.getBoundingClientRect();
        const badge = block.querySelector(".code__aside")!.getBoundingClientRect();
        return {
          order,
          rightAligned: Math.abs(copy.right - header.getBoundingClientRect().right) < 12 && badge.right <= copy.left,
          mark: style(".tok-mark").fontWeight,
          plainWeight: style(".code__line").fontWeight,
          quiet: style(".tok-quiet").color,
          text: style(".code__line").color,
          copied: block.querySelector("[data-copy]")!.getAttribute("data-copy") ?? "",
        };
      });
      check(
        aside.order.join() === "code__title,code__aside,code__copy" && aside.rightAligned,
        `cards: code aside is not between the title and the copy button (${JSON.stringify(aside)})`,
      );
      check(
        Number(aside.mark) > Number(aside.plainWeight) && aside.quiet !== aside.text,
        `cards: tok-mark / tok-quiet draw nothing (${JSON.stringify(aside)})`,
      );
      check(
        aside.copied.includes('"id": "lnk_8Hq2"') && !aside.copied.includes("tok-"),
        `cards: marked runs reached the copied source (${aside.copied})`,
      );
      await p.close();
    }

    for (const width of [1440, 375]) {
      const p = await open("prose", width);
      const sizes = await p.$eval("#cat-prose-article", (el) => {
        const px = (sel: string) => parseFloat(getComputedStyle(el.querySelector(sel)!).fontSize);
        return { p: px("p"), h2: px("h2"), h3: px("h3"), li: px("li"), td: px("td") };
      });
      const [h2, h3] = width < 576 ? [1.5, 1.25] : [1.75, 1.35];
      check(
        Math.abs(sizes.h2 - sizes.p * h2) < 0.5 && Math.abs(sizes.h3 - sizes.p * h3) < 0.5 && sizes.li === sizes.p &&
          sizes.td === sizes.p,
        `cards: prose headings do not scale from the body, or lists/tables are smaller at ${width} (${
          JSON.stringify(sizes)
        })`,
      );
      await p.close();
    }
  }

  if (group === "marketing") {
    const pr = await open("pricing", 1440);
    const name = await pr.$eval(".pricing__name", (el) => parseFloat(getComputedStyle(el).fontSize));
    check(name >= 24, `marketing: a plan's name is not a title (${name}px)`);
    await pr.close();

    const r = await open("reveal", 1440);
    const reveal = await r.evaluate(() => {
      const start = (id: string) => {
        const el = document.getElementById(id)!;
        el.style.transition = "none";
        el.classList.remove("is-revealed");
        const o = getComputedStyle(el).opacity;
        el.classList.add("is-revealed");
        el.style.transition = "";
        return o;
      };
      return { rise: start("cat-reveal-rise"), hide: start("cat-reveal-hide"), fade: start("cat-reveal-fade") };
    });
    check(
      reveal.rise === "1" && reveal.hide === "0" && reveal.fade === "0",
      `marketing: Reveal hides text by default (${JSON.stringify(reveal)})`,
    );
    // Walk the steps 20px at a time: the current step — and its media — is
    // the one whose text is nearest the middle of the viewport (the band
    // trigger lagged ~40px behind it, a picture of the step before beside
    // text that was wholly on screen). Near-ties (< 24px apart) are skipped.
    const disagree = await r.evaluate(async () => {
      const section = document.getElementById("cat-scroll-steps")!;
      const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const top = section.getBoundingClientRect().top + scrollY - innerHeight / 2;
      const end = top + section.offsetHeight;
      const bad: string[] = [];
      let sampled = 0;
      for (let y = top; y < end; y += 20) {
        scrollTo({ top: y, behavior: "instant" });
        await frame();
        const middle = innerHeight / 2;
        const ranked = [...section.querySelectorAll<HTMLElement>("[data-scroll-step]")].map((s) => {
          const b = s.querySelector(".scroll-steps__text")!.getBoundingClientRect();
          return {
            id: s.dataset.scrollStep,
            d: b.bottom < middle ? middle - b.bottom : b.top > middle ? b.top - middle : 0,
          };
        }).sort((a, b) => a.d - b.d);
        if (ranked.length > 1 && ranked[1].d - ranked[0].d < 24) continue;
        sampled++;
        const want = ranked[0].id;
        const step = section.querySelector<HTMLElement>("[data-scroll-step].is-active")?.dataset.scrollStep;
        const media = section.querySelector<HTMLElement>("[data-scroll-step-media].is-active")?.dataset
          .scrollStepMedia;
        if (step !== want || media !== want) bad.push(`${Math.round(y)}: text ${want}, step ${step}, media ${media}`);
      }
      if (sampled < 20) bad.push(`only ${sampled} positions sampled`);
      return bad;
    });
    check(disagree.length === 0, `marketing: ScrollSteps' stage disagrees with the text (${disagree.slice(0, 4)})`);
    const title = await r.$eval(
      "#cat-scroll-steps .scroll-steps__text > h3",
      (el) => parseFloat(getComputedStyle(el).fontSize),
    );
    check(title >= 28, `marketing: a ScrollSteps title is body-sized (${title}px)`);
    // ScrollSteps dim: false — a step that is not current keeps the text colour.
    const dim = await r.$eval("#cat-scroll-steps-md", (el) => {
      const [a, b] = [...el.querySelectorAll(".scroll-steps__step")];
      return getComputedStyle(a).color === getComputedStyle(b).color;
    });
    check(dim, "marketing: ScrollSteps dim: false still mutes the steps that are not current");
    await r.close();

    // ScrollSteps renders media twice: unique ids, each copy wired to itself,
    // nothing focusable that is not on screen — phone and desktop.
    for (const width of [375, 1280]) {
      const d = await open("reveal", width, 800);
      await d.$eval("#cat-scroll-steps-ids", (el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
      await pause(300);
      const wiring = await d.evaluate(() => {
        const section = document.getElementById("cat-scroll-steps-ids")!;
        const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
        const stage = section.querySelector(".scroll-steps__stage")!;
        const inStage = (el: Element | null) => !!el && stage.contains(el);
        const visible = (el: Element) => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && getComputedStyle(el).visibility === "visible";
        };
        const focusable = [...section.querySelectorAll<HTMLElement>("a[href],button,input,[tabindex]")]
          .filter(visible);
        return {
          dupes: [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))],
          ariaHidden: section.querySelectorAll("[aria-hidden='true'] :is(a[href],button,input,[tabindex])").length,
          label: inStage(document.getElementById(stage.querySelector("label")!.htmlFor)),
          help: inStage(document.getElementById(stage.querySelector("input")!.getAttribute("aria-describedby")!)),
          link: inStage(document.querySelector(stage.querySelector("a")!.getAttribute("href")!)),
          outside: stage.querySelectorAll("a[href='#elsewhere']").length,
          focusable: focusable.length,
          stray: focusable.filter((el) => !el.closest(".scroll-steps__media.is-active, .scroll-steps__inline-media"))
            .map((el) => el.outerHTML.slice(0, 60)),
        };
      });
      check(wiring.dupes.length === 0, `marketing: duplicate ids on the reveal page at ${width}: ${wiring.dupes}`);
      check(wiring.ariaHidden === 0, `marketing: ScrollSteps has focusable controls under aria-hidden at ${width}`);
      check(wiring.label && wiring.help && wiring.link, "marketing: a stage copy's references left the copy");
      check(wiring.outside === 2, "marketing: a reference outside the media was rewritten");
      check(wiring.focusable > 0, `marketing: ScrollSteps media has no reachable control at ${width}`);
      check(wiring.stray.length === 0, `marketing: hidden media takes focus at ${width}: ${wiring.stray}`);
      // Keyboard: Tab through the section lands only on what is on screen.
      await d.$eval("#cat-scroll-steps-ids .scroll-steps__list", (el) => {
        el.setAttribute("tabindex", "-1");
        (el as HTMLElement).focus();
      });
      const visited: boolean[] = [];
      for (let i = 0; i < 12; i++) {
        await d.keyboard.press("Tab");
        const step = await d.evaluate(() => {
          const el = document.activeElement!;
          if (!el.closest("#cat-scroll-steps-ids")) return null;
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility === "visible";
        });
        if (step === null) break;
        visited.push(step);
      }
      check(
        visited.length > 0 && visited.every(Boolean),
        `marketing: Tab reached something off screen in ScrollSteps at ${width}: ${visited}`,
      );
      // axe on this section at this width (aria-hidden-focus is a wcag2a rule).
      await d.addScriptTag({ content: axeSource });
      const axeIds = await d.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const result = await (globalThis as any).axe.run("#cat-scroll-steps-ids", {
          preload: false,
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
        // deno-lint-ignore no-explicit-any
        return result.violations.map((v: any) => `${v.id}: ${v.nodes[0].target}`);
      });
      check(axeIds.length === 0, `marketing: axe on ScrollSteps at ${width}: ${axeIds}`);
      await d.close();
    }

    // SiteFooter tag: a div in a layout's footer, styled the same, no nested footer.
    const foot = await open("site-footer", 1280);
    const feet = await foot.evaluate(() => {
      const div = document.getElementById("cat-footer-div")!;
      const plain = document.getElementById("cat-footer-tag")!;
      return {
        div: div.tagName,
        plain: plain.tagName,
        nested: document.querySelectorAll("footer footer").length,
        sameLook: getComputedStyle(div).borderTopWidth === getComputedStyle(plain).borderTopWidth &&
          getComputedStyle(div).backgroundColor === getComputedStyle(plain).backgroundColor,
      };
    });
    check(feet.div === "DIV" && feet.plain === "FOOTER", `marketing: SiteFooter tag ignored (${JSON.stringify(feet)})`);
    check(feet.nested === 0, "marketing: SiteFooter nests a footer in a footer");
    check(feet.sameLook, "marketing: SiteFooter looks different as a div");
    await foot.close();

    // Focus inside a fading picture moves with the step, without scrolling,
    // and comes back to the same control on the way back.
    const f = await open("reveal", 1280, 800);
    const toStep = async (step: string) => {
      await f.evaluate((want) => {
        const text = document.querySelector(`#cat-scroll-steps-ids [data-scroll-step="${want}"] .scroll-steps__text`)!;
        const box = text.getBoundingClientRect();
        scrollTo({ top: scrollY + box.top + box.height / 2 - innerHeight / 2, behavior: "instant" });
      }, step);
      await pause(150);
    };
    const focusState = () =>
      f.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const media = el.closest<HTMLElement>("[data-scroll-step-media]");
        const active = document.querySelector<HTMLElement>("#cat-scroll-steps-ids [data-scroll-step-media].is-active")!;
        return {
          tag: el.tagName,
          class: el.className,
          media: media?.dataset.scrollStepMedia,
          step: el.dataset.scrollStep,
          current: active.dataset.scrollStepMedia,
          y: Math.round(scrollY),
        };
      });
    await toStep("0");
    const dot = '#cat-scroll-steps-ids [data-scroll-step-media="0"] .carousel__dot';
    await f.$eval(dot, (el) => (el as HTMLElement).focus({ preventScroll: true }));
    const start = await focusState();
    await toStep("1");
    const moved1 = await focusState();
    check(
      moved1.media === "1" && moved1.current === "1" && moved1.class === start.class,
      `marketing: focus did not move to the new ScrollSteps picture (${JSON.stringify(moved1)})`,
    );
    await pause(200);
    const settled = await focusState();
    check(settled.y === moved1.y, `marketing: carrying focus scrolled the page (${moved1.y} → ${settled.y})`);
    await toStep("2");
    const onStep = await focusState();
    check(
      onStep.step === "2",
      `marketing: a picture with no controls did not hand focus to its step (${JSON.stringify(onStep)})`,
    );
    await toStep("1");
    await toStep("0");
    const back = await f.evaluate((selector) => document.activeElement === document.querySelector(selector), dot);
    check(back, "marketing: scrolling back does not restore the focused ScrollSteps control");
    // Focus elsewhere stays where it is.
    await f.$eval("#cat-scroll-steps-ids h3", (el) => {
      el.setAttribute("tabindex", "-1");
      (el as HTMLElement).focus({ preventScroll: true });
    });
    await toStep("1");
    const stayed = await f.evaluate(() => document.activeElement?.tagName);
    check(stayed === "H3", `marketing: a step change moved focus that was not in a picture (${stayed})`);
    await f.close();

    // Carousel, Console v4's asks: side arrows, the stacked fallback, page scroll.
    const c = await open("carousel", 1440, 900);
    const noId = await c.$eval("#cat-carousel-no-id", (el) => {
      const inner = el.querySelector<HTMLElement>("[data-carousel]")!;
      const before = inner.querySelector("[data-carousel-slide]")!.getBoundingClientRect().left;
      inner.querySelector<HTMLElement>("[data-carousel-next]")!.click();
      return { id: inner.id, before, dots: inner.querySelectorAll(".carousel__dot").length };
    });
    check(
      noId.id === "" && noId.dots === 2,
      `marketing: a Carousel without an id is not wired (${JSON.stringify(noId)})`,
    );
    await pause(500);
    const noIdMoved = await c.$eval("#cat-carousel-no-id [data-carousel-track]", (el) => el.scrollLeft);
    check(noIdMoved > 0, "marketing: Next does nothing on a Carousel without an id");
    await c.$eval("#cat-carousel-sides", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await pause(300);
    const sides = await c.evaluate(() => {
      const root = document.getElementById("cat-carousel-sides")!;
      const track = root.querySelector(".carousel__track")!.getBoundingClientRect();
      const prev = root.querySelector(".carousel__side--prev")!.getBoundingClientRect();
      const next = root.querySelector(".carousel__side--next")!.getBoundingClientRect();
      const mid = track.top + track.height / 2;
      return {
        size: Math.round(prev.width),
        centred: Math.abs(prev.top + prev.height / 2 - mid) <= 1 && Math.abs(next.top + next.height / 2 - mid) <= 1,
        // Fully outside the slides where the viewport has the room (size +
        // gap + edge), as far out as fits otherwise, never off screen.
        outside: (track.left >= 64 ? prev.right <= track.left : prev.left >= 7) &&
          (document.documentElement.clientWidth - track.right >= 64
            ? next.left >= track.right
            : next.right <= document.documentElement.clientWidth - 7),
        grid: getComputedStyle(root.querySelector(".carousel__track")!).display,
      };
    });
    await c.click("#cat-carousel-sides .carousel__side--next");
    await pause(800);
    const moved = await c.$eval(
      "#cat-carousel-sides",
      (el) => el.querySelector('[data-carousel-to][aria-current="true"]')?.getAttribute("data-carousel-to"),
    );
    check(
      sides.size >= 44 && sides.centred && sides.outside && sides.grid !== "grid" && moved === "1",
      `marketing: Carousel controls "sides" (${JSON.stringify({ sides, moved })})`,
    );

    // Page scroll: the track follows the page; each slide holds for 80% of
    // its screen (40% each side), the outgoing slide fades while it moves;
    // the band is the pin plus one screen per later slide; slides fill the
    // frame; next and dot 1 (from above) scroll the page.
    const page = await c.evaluate(async () => {
      const root = document.getElementById("cat-carousel-page")!;
      const track = root.querySelector<HTMLElement>(".carousel__track")!;
      const slides = [...root.querySelectorAll<HTMLElement>("[data-carousel-slide]")];
      const pin = root.querySelector<HTMLElement>("[data-carousel-pin]")!;
      const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const top = parseFloat(getComputedStyle(pin).top);
      const start = root.getBoundingClientRect().top + scrollY - top;
      const length = root.offsetHeight - pin.offsetHeight;
      const n = slides.length;
      const seg = length / (n - 1);
      const target = (i: number) =>
        slides[i].offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingInlineStart);
      const at = async (y: number) => {
        scrollTo({ top: y, behavior: "instant" });
        await frame();
        return {
          left: Math.round(track.scrollLeft),
          dot: root.querySelector('[data-carousel-to][aria-current="true"]')?.getAttribute("data-carousel-to"),
          pinTop: Math.round(pin.getBoundingClientRect().top),
          fade: [slides[1].style.opacity, slides[2].style.opacity],
        };
      };
      const one = await at(start + seg);
      const hold = await at(start + seg * 1.35);
      const mid = await at(start + seg * 1.5);
      const next = await at(start + seg * 1.65);
      const past = await at(start + length + 2);
      const fill = Math.abs(
        slides[0].offsetHeight - (track.clientHeight - parseFloat(getComputedStyle(track).paddingBlockStart) * 2),
      ) <= 1;
      return {
        pinned: root.hasAttribute("data-carousel-pinned"),
        band: Math.round(root.offsetHeight - (innerHeight - top) - (n - 1) * innerHeight),
        one,
        hold,
        mid,
        next,
        past: past.pinTop < Math.round(top),
        fill,
        t1: Math.round(target(1)),
        t2: Math.round(target(2)),
        top: Math.round(top),
        start: Math.round(start),
      };
    });
    await c.evaluate(() =>
      scrollTo({
        top: document.getElementById("cat-carousel-page")!.getBoundingClientRect().top + scrollY - innerHeight * 2 + 1,
        behavior: "instant",
      })
    );
    await pause(100);
    const y0 = await c.evaluate(() => scrollY);
    await c.$eval("#cat-carousel-page .carousel__side--next", (el) => (el as HTMLElement).click());
    await pause(1200);
    const afterNext = await c.evaluate(() => ({ y: Math.round(scrollY) }));
    await c.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await pause(100);
    await c.$eval('#cat-carousel-page [data-carousel-to="0"]', (el) => (el as HTMLElement).click());
    await pause(1500);
    const dot1 = await c.evaluate(() => Math.round(scrollY));
    check(
      page.pinned && Math.abs(page.band) <= 1 && Math.abs(page.one.left - page.t1) <= 1 && page.one.dot === "1" &&
        Math.abs(page.hold.left - page.t1) <= 1 && page.mid.left > page.t1 && page.mid.left < page.t2 &&
        Math.abs(Number(page.mid.fade[0]) - 0.5) < 0.1 && page.mid.fade[1] === "" &&
        Math.abs(page.next.left - page.t2) <= 1 && page.next.dot === "2" && page.one.pinTop === page.top &&
        page.past && page.fill && afterNext.y > y0 + 100 && Math.abs(dot1 - page.start) <= 2,
      `marketing: Carousel scroll "page" (${JSON.stringify({ page, y0, afterNext, dot1 })})`,
    );
    // Too short a screen for the tallest slide: a list, not a clipped pin.
    await c.setViewport({ width: 1440, height: 520 });
    await pause(400);
    const unfit = await c.$eval("#cat-carousel-page", (el) => ({
      pinned: el.hasAttribute("data-carousel-pinned"),
      grid: getComputedStyle(el.querySelector(".carousel__track")!).display,
    }));
    await c.setViewport({ width: 1440, height: 900 });
    await pause(400);
    const refit = await c.$eval("#cat-carousel-page", (el) => el.hasAttribute("data-carousel-pinned"));
    check(
      !unfit.pinned && unfit.grid === "grid" && refit,
      `marketing: Carousel scroll "page" pins a slide taller than the frame (${JSON.stringify({ unfit, refit })})`,
    );
    await c.close();

    // Stacked: below 768, under reduced motion, and without the script.
    const stackedAt = async (label: string, width: number, opts: { reduced?: boolean; js?: boolean }) => {
      const sp = await browser.newPage();
      await sp.setJavaScriptEnabled(opts.js !== false);
      if (opts.reduced) await sp.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await sp.setViewport({ width, height: 800 });
      await sp.goto(`file://${root}/${fileOf("carousel")}`, { waitUntil: "networkidle0", timeout: 30000 });
      const st = await sp.$eval("#cat-carousel-sides", (el) => ({
        grid: getComputedStyle(el.querySelector(".carousel__track")!).display,
        bar: getComputedStyle(el.querySelector(".carousel__bar")!).display,
        arrow: el.querySelector(".carousel__side")!.getClientRects().length === 0 ? "none" : "shown",
      }));
      const pageMode = opts.js === false ? null : await sp.$eval(
        "#cat-carousel-page",
        (el) => el.hasAttribute("data-carousel-pinned"),
      );
      check(
        st.grid === "grid" && st.bar === "none" && st.arrow === "none" && !pageMode,
        `marketing: Carousel does not stack ${label} (${JSON.stringify({ st, pageMode })})`,
      );
      await sp.close();
    };
    await stackedAt("below 768", 375, {});
    await stackedAt("under reduced motion", 1440, { reduced: true });
    await stackedAt("without the script", 1440, { js: false });

    for (const [width, height] of [[1440, 900], [375, 740]]) {
      const h = await open("hero", width, height);
      const fill = await h.evaluate(() => {
        const hero = document.getElementById("cat-hero-fill")!;
        const b = hero.getBoundingClientRect();
        const foot = hero.querySelector(".hero__footer")!.getBoundingClientRect();
        const offset = parseFloat(getComputedStyle(hero).getPropertyValue("--hero-fill-offset")) * 16;
        return {
          height: Math.round(b.height),
          want: Math.round(innerHeight - offset),
          footIn: foot.bottom <= b.bottom,
        };
      });
      check(
        Math.abs(fill.height - fill.want) <= 1 && fill.footIn,
        `marketing: Hero fill is not the first screen at ${width} (${JSON.stringify(fill)})`,
      );
      await h.close();
    }
  }
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
    // Required, nothing picked. A plain form: the browser's check reaches the
    // hidden native <select> it cannot focus — form.js takes the report over
    // and shows it on the visible field (it used to block with no message).
    const reqState = (id: string) =>
      page.evaluate((id) => {
        const ctl = document.getElementById(id)!;
        const host = ctl.closest(".form-field") ?? ctl.closest("[data-combobox]")!;
        return {
          error: host.querySelector(".form-field__error")?.textContent ?? null,
          invalid: ctl.getAttribute("aria-invalid"),
          red: ctl.closest("[data-combobox]")!.classList.contains("combobox--invalid"),
          focus: document.activeElement?.id,
          message: (ctl as HTMLInputElement).validationMessage ?? "",
        };
      }, id);
    await go(page, "select");
    await trapSubmits("#cat-req-plain");
    await page.$eval("#cat-req-plain", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await clickIn("#cat-req-plain-go");
    await pause();
    const plainBlocked = { subs: (await submits()).length, ...(await reqState("cat-req-plain-sel")) };
    await page.click("#cat-req-plain-sel");
    await pause();
    await clickIn("#cat-req-plain-sel-list [data-value=accra]");
    await pause();
    const plainFixed = await reqState("cat-req-plain-sel");
    await clickIn("#cat-req-plain-go");
    await pause();
    const plainSent = await submits();
    check(
      plainBlocked.subs === 0 && plainBlocked.error === "Please select an item in the list." &&
        plainBlocked.invalid === "true" && plainBlocked.red && plainBlocked.focus === "cat-req-plain-sel" &&
        plainFixed.error === null && plainFixed.invalid === null && !plainFixed.red &&
        plainSent.length === 1 && plainSent[0].endsWith("|city=accra"),
      `forms: required Select in a plain form (${JSON.stringify({ plainBlocked, plainFixed, plainSent })})`,
    );
    // Form({ validate }): reported with requiredMessage, cleared live by a search pick.
    await trapSubmits("#cat-req-val");
    await clickIn("#cat-req-val-go");
    await pause();
    const valBlocked = { subs: (await submits()).length, ...(await reqState("cat-req-val-sel")) };
    await page.keyboard.press("Space");
    await pause();
    await page.keyboard.type("ath");
    await page.keyboard.press("Enter");
    await pause();
    const valFixed = await reqState("cat-req-val-sel");
    await clickIn("#cat-req-val-go");
    await pause();
    const valSent = await submits();
    check(
      valBlocked.subs === 0 && valBlocked.error === "Choose the city you are based in." &&
        valBlocked.focus === "cat-req-val-sel" && valBlocked.red && valFixed.error === null &&
        valFixed.focus === "cat-req-val-sel" && valSent.length === 1 && valSent[0].endsWith("|city=athens"),
      `forms: required Select in Form({ validate }) (${JSON.stringify({ valBlocked, valFixed, valSent })})`,
    );

    await go(page, "combobox");
    // Required Combobox, single and multi: typed text is not a pick; removing
    // the last token makes the multi invalid again.
    await trapSubmits("#cat-req-cb");
    await page.$eval("#cat-req-cb", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.focus("#cat-req-cb-one");
    await page.keyboard.type("Acc");
    await page.keyboard.press("Escape");
    await clickIn("#cat-req-cb-go");
    await pause();
    const cbBlocked = {
      subs: (await submits()).length,
      one: await reqState("cat-req-cb-one"),
      many: await reqState("cat-req-cb-many"),
    };
    await clickIn("#cat-req-cb-one-list [data-value=accra]");
    await clickIn("#cat-req-cb-many-list [data-value=amsterdam]");
    await pause();
    const cbFixed = { one: await reqState("cat-req-cb-one"), many: await reqState("cat-req-cb-many") };
    await clickIn("#cat-req-cb [data-combobox-remove=amsterdam]");
    await pause();
    const cbEmptied = await reqState("cat-req-cb-many");
    await clickIn("#cat-req-cb-many-list [data-value=athens]");
    await page.keyboard.press("Escape");
    await clickIn("#cat-req-cb-go");
    await pause();
    const cbSent = await submits();
    check(
      cbBlocked.subs === 0 && cbBlocked.one.error === "Please select an item in the list." &&
        cbBlocked.one.focus === "cat-req-cb-one" && cbBlocked.one.red &&
        cbBlocked.many.error === "Add at least one region." && cbBlocked.many.invalid === "true" &&
        cbFixed.one.error === null && cbFixed.many.error === null && !cbFixed.many.red &&
        cbEmptied.error === "Add at least one region." && cbSent.length === 1 &&
        cbSent[0].endsWith("|owner=accra&regions=athens"),
      `forms: required Combobox single + multi (${JSON.stringify({ cbBlocked, cbFixed, cbEmptied, cbSent })})`,
    );
    // A plain form: the browser's own bubble, on the visible input.
    await trapSubmits("#cat-req-cb-plain");
    await clickIn("#cat-req-cb-plain-go");
    await pause();
    const cbPlain = { subs: (await submits()).length, ...(await reqState("cat-req-cb-plain-many")) };
    await clickIn("#cat-req-cb-plain-many-list [data-value=auckland]");
    await page.keyboard.press("Escape");
    await clickIn("#cat-req-cb-plain-go");
    await pause();
    const cbPlainSent = await submits();
    check(
      cbPlain.subs === 0 && cbPlain.message === "Please select at least one item." &&
        cbPlain.focus === "cat-req-cb-plain-many" && cbPlainSent.length === 1 &&
        cbPlainSent[0].endsWith("|regions=auckland"),
      `forms: required multi Combobox in a plain form (${JSON.stringify({ cbPlain, cbPlainSent })})`,
    );
    // A multi list says so to a screen reader; a single one does not.
    const multiselectable = await page.evaluate(() => ({
      many: document.getElementById("cat-req-cb-many-list")?.getAttribute("aria-multiselectable"),
      one: document.getElementById("cat-req-cb-one-list")?.getAttribute("aria-multiselectable"),
    }));
    check(
      multiselectable.many === "true" && multiselectable.one === null,
      `forms: multi Combobox listbox is aria-multiselectable (${JSON.stringify(multiselectable)})`,
    );

    // hideSelected: a pick keeps its row while the list is open, leaves it on
    // the next open; a search that finds only picks says so; removing a
    // token brings the option back.
    const cbList = (id: string) =>
      page.evaluate((id) => {
        const root = document.getElementById(id)!.closest("[data-combobox]")!;
        const list = document.getElementById(`${id}-list`)!;
        const seen = (el: Element | null) => !!el && (el as HTMLElement).offsetParent !== null;
        return {
          open: !list.hidden,
          rows: Array.from(list.querySelectorAll('[role="option"]:not(.combobox__empty)')).filter(seen).map((o) =>
            o.getAttribute("data-value")
          ),
          empty: seen(list.querySelector(".combobox__empty:not([data-combobox-note])")),
          note: seen(list.querySelector("[data-combobox-note]"))
            ? list.querySelector("[data-combobox-note]")!.textContent
            : null,
          tokens: Array.from(root.querySelectorAll(".combobox__token")).map((t) => t.textContent!.trim()),
          caret: !!root.querySelector(".combobox__caret"),
          value: (document.getElementById(id) as HTMLInputElement).value,
        };
      }, id);
    await page.$eval("#cat-cb-hide", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.focus("#cat-cb-hide");
    await pause();
    const hideFirst = await cbList("cat-cb-hide");
    await clickIn("#cat-cb-hide-list [data-value=amsterdam]");
    await pause();
    const hidePicked = await cbList("cat-cb-hide");
    await page.keyboard.press("Escape");
    await clickIn("#cat-cb-hide");
    await pause();
    const hideReopen = await cbList("cat-cb-hide");
    await page.keyboard.type("acc");
    await pause();
    const hideOnlyPicks = await cbList("cat-cb-hide");
    await page.$eval("#cat-cb-hide", (el) => {
      (el as HTMLInputElement).value = "";
    });
    await page.keyboard.type("zzz");
    await pause();
    const hideNone = await cbList("cat-cb-hide");
    await page.$eval("#cat-cb-hide", (el) => {
      (el as HTMLInputElement).value = "";
    });
    await page.keyboard.type("a");
    await page.$eval(
      "#cat-cb-hide-list",
      (list) => (list.closest("[data-combobox]")!.querySelector("[data-combobox-remove=accra]") as HTMLElement).click(),
    );
    await pause();
    const hideRemoved = await cbList("cat-cb-hide");
    await page.keyboard.press("Escape");
    check(
      hideFirst.open && !hideFirst.rows.includes("accra") && hideFirst.rows.length === 5 &&
        hidePicked.rows.includes("amsterdam") && hidePicked.rows.length === 5 &&
        hidePicked.tokens.join() === "Accra,Amsterdam" &&
        hideReopen.open && !hideReopen.rows.includes("amsterdam") && hideReopen.rows.length === 4 &&
        hideOnlyPicks.rows.length === 0 && hideOnlyPicks.note === "Already selected." && !hideOnlyPicks.empty &&
        hideNone.rows.length === 0 && hideNone.note === null && hideNone.empty &&
        hideRemoved.rows.includes("accra") && hideRemoved.tokens.join() === "Amsterdam",
      `forms: multi Combobox hides picks on reopen (${
        JSON.stringify({ hideFirst, hidePicked, hideReopen, hideOnlyPicks, hideNone, hideRemoved })
      })`,
    );

    // openOn: "type" + minChars: 2 — shut on focus, click and ArrowDown;
    // opens from two characters, shuts below them; a pick clears and shuts.
    await page.$eval("#cat-cb-type", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.focus("#cat-cb-type");
    await clickIn("#cat-cb-type");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.type("a");
    await pause();
    const typeShort = await cbList("cat-cb-type");
    await page.keyboard.type("m");
    await pause();
    const typeOpen = await cbList("cat-cb-type");
    await page.keyboard.press("Backspace");
    await pause();
    const typeBack = await cbList("cat-cb-type");
    await page.keyboard.type("ms");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await pause();
    const typePicked = await cbList("cat-cb-type");
    const typeFocus = await page.evaluate(() => document.activeElement?.id);
    check(
      !typeShort.open && !typeShort.caret && typeOpen.open && typeOpen.rows.join() === "amsterdam" && !typeBack.open &&
        !typePicked.open && typePicked.tokens.join() === "Amsterdam" && typePicked.value === "" &&
        typeFocus === "cat-cb-type",
      `forms: Combobox openOn "type" (${JSON.stringify({ typeShort, typeOpen, typeBack, typePicked, typeFocus })})`,
    );

    // caret: false, total, selectedOptions.
    const cbExtras = await page.evaluate(() => ({
      caretHide: !!document.querySelector("#cat-cb-hide-list")?.closest("[data-combobox]")?.querySelector(
        ".combobox__caret",
      ),
      caretOff: !!document.querySelector("#cat-cb-nocaret-list")?.closest("[data-combobox]")?.querySelector(
        ".combobox__caret",
      ),
      more: document.querySelector("#cat-cb-total-list .combobox__more")?.textContent,
      count: document.querySelector("#cat-cb-total-list .combobox__count")?.textContent,
      tokens: Array.from(
        document.querySelector("#cat-cb-selopts-list")!.closest("[data-combobox]")!.querySelectorAll(
          ".combobox__token",
        ),
      ).map((t) => t.textContent!.trim()),
    }));
    check(
      cbExtras.caretHide && !cbExtras.caretOff && cbExtras.more === "Showing 5 of 9,812. Keep typing to narrow." &&
        cbExtras.count === "9,812 matches" && cbExtras.tokens.join() === "Grace Hopper,Accra",
      `forms: Combobox caret / total / selectedOptions (${JSON.stringify(cbExtras)})`,
    );

    await go(page, "form");
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

    await go(page, "select");
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

    await go(page, "combobox");
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

    await go(page, "datetimepicker");
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

    await go(page, "segmented");
    // A Segmented in a dialog that was closed at load is placed when it opens.
    await page.$eval('[data-modal-open="#cat-seg-dialog"]', (el) => (el as HTMLElement).click());
    await pause(400);
    const segWidth = await page.$eval(
      "#cat-seg-in-dialog",
      (el) => parseFloat((el as HTMLElement).style.getPropertyValue("--segmented-w") || "0"),
    );
    check(segWidth > 20, `forms: segmented in a dialog not measured when opened (--segmented-w ${segWidth})`);
    await page.$eval("#cat-seg-dialog [data-modal-close]", (el) => (el as HTMLElement).click());
    await pause();

    await go(page, "combobox");
    // Combobox({ loadOnFocus }): the first focus fetches once.
    await page.$eval("#cat-cb-focus", (el) => el.scrollIntoView({ block: "center" }));
    await page.focus("#cat-cb-focus");
    await pause();
    const focusLoad = await page.$eval("#cat-cb-focus", (el) => ({
      attr: el.hasAttribute("data-combobox-load-on-focus"),
      loaded: el.hasAttribute("data-combobox-loaded"),
      open: !document.getElementById("cat-cb-focus-list")!.hasAttribute("hidden"),
    }));
    check(
      focusLoad.attr && focusLoad.loaded && focusLoad.open,
      `forms: combobox loadOnFocus (${JSON.stringify(focusLoad)})`,
    );
    await page.keyboard.press("Escape");

    await go(page, "segmented");
    // Segmented counts
    const counts = await page.$$eval(
      "#cat-seg-count .segmented__count",
      (els) =>
        els.map((e) => `${e.textContent?.trim()}${e.classList.contains("segmented__count--alert") ? "!" : ""}`).join(),
    );
    check(counts === "48.2k,120,3!,0!", `forms: segmented counts (${counts})`);
    const countTitle = await page.$eval("#cat-seg-count .segmented__count", (e) => e.getAttribute("title"));
    check(countTitle === "48,213", `forms: segmented countTitle (${countTitle})`);
  }

  if (group === "data") {
    await go(page, "data-table");
    // A phone: responsive "cards" lays each row out as a labelled card, the
    // eight-page pagination folds to prev · "Page 2 of 8" · next, and the
    // page never scrolls sideways.
    {
      const phone = await browser.newPage();
      await phone.setViewport({ width: 375, height: 800 });
      await phone.goto(page.url(), { waitUntil: "networkidle0", timeout: 30000 });
      const cards = await phone.evaluate(() => {
        const t = document.getElementById("cat-dt-cards")!;
        const row = t.querySelector("tbody tr.data-table__row") as HTMLElement;
        const status = row.querySelector("td[data-label='Status']") as HTMLElement;
        // Chrome reports `attr(data-label)` as the computed content; "none" means no label drawn.
        const label = getComputedStyle(status, "::before").content;
        const thead = t.querySelector("thead")!.getBoundingClientRect();
        const pag = t.querySelector(".pagination")!;
        const visiblePages = [...pag.querySelectorAll(".pagination__item--page")].filter((li) =>
          (li as HTMLElement).offsetParent !== null
        ).length;
        const statusText = pag.querySelector(".pagination__status") as HTMLElement | null;
        return {
          rowHeight: row.getBoundingClientRect().height,
          display: getComputedStyle(row).display,
          label,
          theadHidden: thead.width <= 1,
          visiblePages,
          status: statusText && statusText.offsetParent !== null ? statusText.textContent : "",
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      check(
        cards.rowHeight > 60 && cards.display === "grid" && cards.label !== "none" && cards.label !== "" &&
          cards.theadHidden,
        `data@375: responsive cards (${JSON.stringify(cards)})`,
      );
      check(
        cards.visiblePages === 0 && cards.status === "Page 2 of 8",
        `data@375: pagination folds to a status (${JSON.stringify(cards)})`,
      );
      check(cards.overflow <= 0, `data@375: page is ${cards.overflow}px wider than the viewport`);
      await phone.close();
    }

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

    const grouped = await page.$eval("#cat-dt-groups", (t) => ({
      headings: [...t.querySelectorAll("tr.data-table__group > th")].map((th) =>
        `${th.textContent}:${th.getAttribute("colspan")}:${getComputedStyle(th).position}`
      ).join(),
      muted: t.querySelectorAll("tr.data-table__row.cat-row-muted[data-status=Paused][data-row-key='2']").length,
      rows: t.querySelectorAll("tr.data-table__row").length,
    }));
    check(
      grouped.headings === "Active:3:static,Paused:3:static,Active:3:static" && grouped.muted === 1 &&
        grouped.rows === 3,
      `data: rowGroup / rowAttrs (${JSON.stringify(grouped)})`,
    );
    await go(page, "avatar");
    const avatar = await page.evaluate(() => ({
      icon: !!document.querySelector("#cat-avatar-icon.avatar.avatar--sm.cat-av > svg"),
      group: !!document.querySelector(".avatar-group.cat-avg"),
    }));
    check(avatar.icon && avatar.group, `data: avatar markup initials / class merge (${JSON.stringify(avatar)})`);

    await go(page, "timeline");
    const tl = await page.evaluate(() => ({
      tones: document.querySelectorAll("#cat-tl-tones .timeline__item--danger .timeline__marker svg").length,
      text: !!document.querySelector("#cat-tl-tones .timeline__text"),
      tlAttrs: !!document.querySelector(
        "ol#cat-tl-tones.timeline.cat-tl[data-kind=tones] > li.timeline__item.cat-tl-danger",
      ),
    }));
    await go(page, "empty");
    const misc = {
      ...tl,
      ...(await page.evaluate(() => ({
        ownIcon: !!document.querySelector(".empty__icon > .cat-own-icon"),
        emptyHtml: !!document.querySelector("#cat-empty-details .empty__text strong"),
        details: !!document.querySelector("#cat-empty-details .empty__text + .empty__details .badge"),
      }))),
    };
    check(
      misc.tones === 1 && misc.text && misc.ownIcon && misc.tlAttrs && misc.emptyHtml && misc.details,
      `data: timeline tones+attrs / empty Html icon, text, details (${JSON.stringify(misc)})`,
    );
  }

  if (group === "feedback") {
    await go(page, "alert");
    const roles = await page.$$eval(
      "#cat-alert-roles > .alert",
      (els) => els.map((e) => e.getAttribute("role")).join(),
    );
    check(roles === "status,alert,alert,,note", `feedback: alert roles by variant / override / none / note (${roles})`);
    const slots = await page.$eval("#cat-alert-slots", (box) => {
      const [deadline, billing, prose] = [...box.querySelectorAll(":scope > .alert")];
      const body = deadline.querySelector(".alert__body")!.getBoundingClientRect();
      const aside = deadline.querySelector(".alert__aside")!.getBoundingClientRect();
      return {
        beside: aside.left >= body.right - 1 && aside.top < body.bottom,
        badge: !!deadline.querySelector(".alert__aside > .badge"),
        link: !!billing.querySelector(".alert__aside > a"),
        bodyAttrs: !!billing.querySelector(".alert__body.cat-alert-body[data-kind=billing]"),
        prose: prose.querySelector(".alert__text")?.tagName,
      };
    });
    check(
      slots.beside && slots.badge && slots.link && slots.bodyAttrs && slots.prose === "P",
      `feedback: alert aside / bodyAttrs / textTag (${JSON.stringify(slots)})`,
    );
    // On a phone an aside holding an action wraps under the text; a badge stays beside it.
    await page.setViewport({ width: 375, height: 800 });
    await pause(200);
    const phone = await page.$eval("#cat-alert-slots", (box) => {
      const [deadline, billing] = [...box.querySelectorAll(":scope > .alert")];
      const pos = (alert: Element) => {
        const body = alert.querySelector(".alert__body")!.getBoundingClientRect();
        const aside = alert.querySelector(".alert__aside")!.getBoundingClientRect();
        const icon = alert.querySelector(".alert__icon")?.getBoundingClientRect();
        return {
          under: aside.top >= body.bottom - 1,
          beside: aside.left >= body.right - 1,
          // A long body stays beside the icon (it used to wrap under it) and the
          // wrapped action lines up with the text.
          bodyBesideIcon: !icon || (body.left >= icon.right - 1 && body.top < icon.bottom),
          alignedWithText: Math.abs(aside.left - body.left) <= 2,
        };
      };
      // icon: false + a theme ::before icon: the token alone lines the action up with the text.
      const before = box.querySelector(".cat-alert-before-icon")!;
      const beforeBody = before.querySelector(".alert__body")!.getBoundingClientRect();
      const beforeAside = before.querySelector(".alert__aside")!.getBoundingClientRect();
      const beforeIcon = {
        under: beforeAside.top >= beforeBody.bottom - 1,
        alignedWithText: Math.abs(beforeAside.left - beforeBody.left) <= 2,
      };
      return {
        link: pos(billing),
        badge: pos(deadline),
        beforeIcon,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    await page.setViewport({ width: 1280, height: 900 });
    await pause(200);
    check(
      phone.link.under && phone.link.bodyBesideIcon && phone.link.alignedWithText && phone.badge.beside &&
        phone.badge.bodyBesideIcon && phone.beforeIcon.under && phone.beforeIcon.alignedWithText &&
        phone.overflow <= 0,
      `feedback: alert aside on a phone (${JSON.stringify(phone)})`,
    );

    await go(page, "modal");
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
    await pause();
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
    await go(page, "dropdown");
    // A long Dropdown: capped and scrolling, search focused on open, a parent
    // kept (and its sublist opened) for a matching child, restored on close.
    await page.$eval("#cat-dd-long", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.click("#cat-dd-long .dropdown__trigger");
    await pause();
    const ddOpen = await page.evaluate(() => {
      const panel = document.getElementById("cat-dd-long-panel")!;
      const body = panel.querySelector(".dropdown__body")!;
      const cap = parseFloat(getComputedStyle(panel).maxHeight);
      const search = document.getElementById("cat-dd-long-search") as HTMLInputElement;
      return {
        capped: cap > 0 && panel.getBoundingClientRect().height <= cap + 1,
        scrolls: body.scrollHeight > body.clientHeight,
        focus: document.activeElement?.id,
        formless: search.form === null && !search.name,
      };
    });
    await page.keyboard.type("holm");
    await pause();
    const ddFiltered = await page.evaluate(() => {
      const panel = document.getElementById("cat-dd-long-panel")!;
      const shown = [...panel.querySelectorAll(".dropdown__body li")].filter((li) => li.getClientRects().length)
        .map((li) =>
          li.querySelector(":scope > a .menu__link-label, :scope > button .menu__link-label")!.textContent!.trim()
        );
      const parent = panel.querySelector("[data-toggle='#cat-dd-long-menu-sub-0']")!;
      return { shown: shown.join(), expanded: parent.getAttribute("aria-expanded") };
    });
    await page.keyboard.press("ArrowDown");
    const firstItem = await page.evaluate(() =>
      document.activeElement?.querySelector(".menu__link-label")?.textContent?.trim()
    );
    await page.focus("#cat-dd-long-search");
    await page.$eval("#cat-dd-long-search", (el) => ((el as HTMLInputElement).value = ""));
    await page.keyboard.type("xyz");
    await pause();
    const ddEmpty = await page.$eval(
      "#cat-dd-long-panel [data-dropdown-empty]",
      (el) => (el as HTMLElement).hidden ? null : el.textContent,
    );
    await page.keyboard.press("Escape");
    await pause();
    const ddClosed = await page.evaluate(() => ({
      closed: document.getElementById("cat-dd-long-panel")!.hidden,
      focus: document.activeElement?.closest(".dropdown")?.id,
      search: (document.getElementById("cat-dd-long-search") as HTMLInputElement).value,
      sublist: (document.getElementById("cat-dd-long-menu-sub-0") as HTMLElement).hidden,
      allBack: [...document.querySelectorAll("#cat-dd-long-panel li")].every((li) => !(li as HTMLElement).hidden),
    }));
    check(
      ddOpen.capped && ddOpen.scrolls && ddOpen.focus === "cat-dd-long-search" && ddOpen.formless &&
        ddFiltered.shown === "Nordics,Stockholm,Stockholm" && ddFiltered.expanded === "true" &&
        firstItem === "Nordics" && ddEmpty === "No city matches." && ddClosed.closed &&
        ddClosed.focus === "cat-dd-long" && ddClosed.search === "" && ddClosed.sublist && ddClosed.allBack,
      `actions: long searchable dropdown (${JSON.stringify({ ddOpen, ddFiltered, firstItem, ddEmpty, ddClosed })})`,
    );
    const noSearch = await page.$eval("#cat-dd-plain", (el) => !el.querySelector("[data-dropdown-search]"));
    check(noSearch, "actions: Dropdown({ searchable: false }) still renders a search box");

    await go(page, "button");
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
    await go(page, "tabs");
    await clickIn("#cat-tablinks a:nth-child(2)");
    await pause();
    const tabs = await page.evaluate(() => ({
      current: document.querySelector("#cat-tablinks [aria-current=page]")?.textContent?.trim(),
      selected: document.querySelectorAll("#cat-tablinks [aria-selected]").length,
      tabTitle: document.querySelector("#cat-tablinks .tabs__count")?.getAttribute("title"),
      tabList: !!document.querySelector("#cat-tablinks > .tabs__list.cat-tablinks-list[data-kind=links]"),
    }));
    await go(page, "wizard");
    const wizard = await page.evaluate(() => ({
      stepsOnly: !document.querySelector("#cat-wz-steps .wizard__content") &&
        document.querySelector("#cat-wz-steps")!.classList.contains("wizard--steps-only"),
      wizard: (() => {
        const ol = document.querySelector("#cat-wz-steps ol")!;
        return `${ol.getAttribute("aria-label")}|${ol.classList.contains("cat-wz-list")}|${
          ol.querySelector("[aria-current=step] .wizard__step-label")?.textContent?.trim()
        }|${ol.querySelector(".wizard__step--done .sr-only")?.textContent}`;
      })(),
    }));
    // The page's own header is level 1; the catalogued level-2 one sits in a case.
    await go(page, "page-header");
    const header = await page.evaluate(() => ({
      sub: !!document.querySelector(".cat-case .page-header--sub h2.page-header__title"),
      badge: !!document.querySelector(".cat-case .page-header--sub .page-header__title-row .badge"),
    }));
    const cards = { ...tabs, ...wizard, ...header };
    check(
      cards.current === "Clicks" && cards.selected === 0 && cards.stepsOnly && cards.sub && cards.badge &&
        cards.tabTitle === "1,204" && cards.tabList && cards.wizard === "Import steps|true|Columns|Done: ",
      `cards: TabLinks / Wizard steps-only / PageHeader level 2 (${JSON.stringify(cards)})`,
    );
  }

  if (group === "navigation") {
    await go(page, "breadcrumb");
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

// CATALOGUE_GROUPS=forms,data runs only those groups (a debugging aid; CI runs all).
const onlyGroups = (getEnv().CATALOGUE_GROUPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const wanted = (group: string) => !onlyGroups.length || onlyGroups.includes(group);
/* ------------------------------------------- every component's own page */
// Several component pages at a time, each lane on one isolated tab.
const lanes: Page[] = [];
await pool(entries.filter((entry) => wanted(entry.group)), async (entry, _i, worker) => {
  const page = lanes[worker] ??= await openPage(true);
  const file = fileOf(entry.name);
  await go(page, entry.name);
  const html = await readTextFile(`demo/${file}`);
  if (/ style="/.test(html)) fail(`${file}: markup contains an inline style attribute (CSP §9)`);
  // A second class attribute is silently dropped by the parser: a caller's
  // attrs.class must merge (classAttrs), never follow the component's own.
  const twoClasses = html.match(/<[a-z][a-z0-9-]*\s[^>]*?\bclass="[^"]*"[^>]*?\sclass="[^"]*"/g) ?? [];
  if (twoClasses.length) fail(`${file}: ${twoClasses.length} tag(s) with two class attributes, e.g. ${twoClasses[0]}`);

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
  check(
    onPage.sections.join() === entry.name,
    `${file}: catalogue sections ${onPage.sections.join() || "none"}, expected ${entry.name}`,
  );
  check(
    onPage.cases === entry.cases.length,
    `${file}: ${onPage.cases} cases on the page, ${entry.cases.length} catalogued`,
  );
  check(onPage.emptyCases.length === 0, `${file}: empty cases: ${onPage.emptyCases.join(", ")}`);
  check(onPage.charts === onPage.chartEls, `${file}: ${onPage.chartEls - onPage.charts} chart(s) did not draw`);
  check(onPage.overflow <= 0, `${file}: page overflows horizontally by ${onPage.overflow}px`);
  await axePass(page, file);

  await page.screenshot({ path: `${outDir}/${entry.name}-light.png` });
  await page.click("[data-theme-toggle]");
  await pause(400);
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
  await page.screenshot({ path: `${outDir}/${entry.name}-dark.png` });
});
for (const lane of lanes) await closeIsolated(lane);

/* --------------------------------------------- behaviour, per group */
// One tab, in order: consecutive steps on the same page build on its state.
const page = await openPage();
// Each block moves the one tab to the page that holds what it drives
// (`go`); consecutive steps on the same page keep its state.
for (const group of catalogueGroups) {
  if (!wanted(group.id)) continue;
  await page.goto("about:blank");
  if (group.id === "forms") {
    await go(page, "slider");
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

    await go(page, "combobox");
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

    await go(page, "datepicker");
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

    await go(page, "segmented");
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

    await go(page, "select");
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

    await go(page, "input");
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
    await go(page, "select");
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
    // A long Select: capped and scrolling, opens on its pick with focus in
    // the search box, filters as you type, Enter takes the first match.
    await page.$eval("#cat-sel-long", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.click("#cat-sel-long");
    await pause();
    const longOpen = await page.evaluate(() => {
      const list = document.getElementById("cat-sel-long-list")!;
      const box = document.getElementById("cat-sel-long-listbox")!;
      const cap = parseFloat(getComputedStyle(list).maxHeight);
      const pick = box.querySelector("[data-value=tokyo]")!.getBoundingClientRect();
      const view = box.getBoundingClientRect();
      const search = document.getElementById("cat-sel-long-search") as HTMLInputElement;
      return {
        capped: cap > 0 && list.getBoundingClientRect().height <= cap + 1,
        scrolls: box.scrollHeight > box.clientHeight,
        pickInView: pick.top >= view.top - 1 && pick.bottom <= view.bottom + 1,
        focus: document.activeElement?.id,
        formless: search.form === null && !search.name,
        role: box.getAttribute("role"),
      };
    });
    await page.keyboard.type("par");
    await pause();
    const filtered = await page.evaluate(() => {
      const opts = [...document.querySelectorAll("#cat-sel-long-listbox [role=option]")] as HTMLElement[];
      return {
        shown: opts.filter((o) => !o.hidden).map((o) => o.getAttribute("data-value")).join(),
        active: document.querySelector("#cat-sel-long-listbox [data-active]")?.getAttribute("data-value"),
      };
    });
    await page.keyboard.press("Enter");
    await pause();
    const longPicked = await page.evaluate(() => ({
      native: (document.getElementById("cat-sel-long-native") as HTMLSelectElement).value,
      text: document.getElementById("cat-sel-long")!.textContent!.trim(),
      closed: document.getElementById("cat-sel-long-list")!.hidden,
      focus: document.activeElement?.id,
    }));
    check(
      longOpen.capped && longOpen.scrolls && longOpen.pickInView && longOpen.focus === "cat-sel-long-search" &&
        longOpen.formless && longOpen.role === "listbox" && filtered.shown === "paris" &&
        filtered.active === "paris" && longPicked.native === "paris" && longPicked.text === "Paris" &&
        longPicked.closed && longPicked.focus === "cat-sel-long",
      `forms: long searchable select (${JSON.stringify({ longOpen, filtered, longPicked })})`,
    );
    // Typing on the closed field starts a search; no match shows emptyText;
    // Escape closes back to the field and the next open starts clean.
    await page.keyboard.type("qq");
    await pause();
    const typedOpen = await page.evaluate(() => ({
      open: !document.getElementById("cat-sel-long-list")!.hidden,
      value: (document.getElementById("cat-sel-long-search") as HTMLInputElement).value,
      empty: (() => {
        const e = document.querySelector("#cat-sel-long-listbox .combobox__empty") as HTMLElement | null;
        return e && !e.hidden ? e.textContent : null;
      })(),
    }));
    await page.keyboard.press("Escape");
    await pause();
    const escaped = await page.evaluate(() => ({
      closed: document.getElementById("cat-sel-long-list")!.hidden,
      focus: document.activeElement?.id,
    }));
    // Opens on Paris (the pick); 12 more rows is well past the visible window.
    for (let i = 0; i < 13; i++) await page.keyboard.press("ArrowDown");
    await pause();
    const walked = await page.evaluate(() => {
      const box = document.getElementById("cat-sel-long-listbox")!;
      const active = box.querySelector("[data-active]") as HTMLElement | null;
      const r = active?.getBoundingClientRect();
      const v = box.getBoundingClientRect();
      return {
        search: (document.getElementById("cat-sel-long-search") as HTMLInputElement).value,
        all: [...box.querySelectorAll("[role=option]:not(.combobox__empty)")].every((o) => !(o as HTMLElement).hidden),
        inView: !!r && r.top >= v.top - 1 && r.bottom <= v.bottom + 1,
        scrolled: box.scrollTop > 0,
        active: active?.getAttribute("data-value"),
      };
    });
    await page.keyboard.press("Escape");
    check(
      typedOpen.open && typedOpen.value === "qq" && typedOpen.empty === "No city matches." && escaped.closed &&
        escaped.focus === "cat-sel-long" && walked.search === "" && walked.all && walked.inView && walked.scrolled &&
        walked.active === "taipei",
      `forms: select type-to-search / Escape / arrow walk (${JSON.stringify({ typedOpen, escaped, walked })})`,
    );
    // searchable: false keeps the native-style type-ahead.
    await page.$eval("#cat-sel-plain", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.focus("#cat-sel-plain");
    await page.keyboard.type("b");
    await pause();
    const plainSel = await page.evaluate(() => ({
      search: !!document.querySelector("#cat-sel-plain-list [data-combobox-search]"),
      native: (document.getElementById("cat-sel-plain-native") as HTMLSelectElement).value,
    }));
    check(
      !plainSel.search && plainSel.native === "baghdad",
      `forms: Select({ searchable: false }) (${JSON.stringify(plainSel)})`,
    );

    await go(page, "combobox");
    // A searchable combobox keeps its list open on a click into its input.
    await page.$eval("#reviewer", (el) => el.scrollIntoView({ block: "center" }));
    await page.click("#reviewer");
    await pause();
    await page.click("#reviewer");
    await pause();
    const stays = await page.$eval("#reviewer-list", (el) => !el.hasAttribute("hidden"));
    await page.keyboard.press("Escape");
    check(stays, "forms: a second click in a searchable combobox's input closed its list");

    await go(page, "editor");
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

    await go(page, "dropzone");
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

    await go(page, "form");
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
    await go(page, "input");
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
    await go(page, "textarea");
    const h0 = await page.$eval("#cat-ta-auto", (el) => el.getBoundingClientRect().height);
    await page.type("#cat-ta-auto", "one\ntwo\nthree\nfour\nfive\nsix");
    await pause();
    const h1 = await page.$eval("#cat-ta-auto", (el) => el.getBoundingClientRect().height);
    check(h1 > h0 + 30, `forms: autosize textarea grows (${h0} → ${h1})`);
    await go(page, "form");
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
    await go(page, "input");
    await page.type("#inv-email", "grace");
    await pause();
    const dirty = await page.$eval("#cat-invite", (f) => f.hasAttribute("data-dirty") && f.hasAttribute("data-guard"));
    check(dirty, "forms: a guarded form marks itself dirty on input");

    await go(page, "card-fields");
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

    await go(page, "otp");
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

    await go(page, "select");
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

    await go(page, "timepicker");
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
    await pause();
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

    await go(page, "datetimepicker");
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
      await local.goto(`file://${root}/${fileOf("datetimepicker")}`, { waitUntil: "load" });
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
      await plain.goto(`file://${root}/${fileOf("timepicker")}`, { waitUntil: "load" });
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
      await plain.goto(`file://${root}/${fileOf("datetimepicker")}`, { waitUntil: "load" });
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
      // The site header's theme switch: one stylesheet after the bundle.
      await page.select("#site-theme-native", label);
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
    await page.select("#site-theme-native", "base");
    await pause(300);
  }

  if (group.id === "feedback") {
    await go(page, "toast");
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

    await go(page, "modal");
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
    await pause();
    await page.click("[aria-controls=cat-modal-at-time-list]");
    await pause();
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
    await go(page, "data-table");
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
    await go(page, "command");
    await page.focus("#palette .command__input");
    await page.keyboard.press("ArrowDown");
    const cmdActive = await page.$eval("#palette [role=option][data-active]", (el) => el.id).catch(() => null);
    check(cmdActive === "palette-item-0", `navigation: command ArrowDown activates first item (${cmdActive})`);
    await page.click("#palette [data-command-dismiss]");
    const cmdQuery = await page.$eval("#palette .command__input", (el) => (el as HTMLInputElement).value);
    check(cmdQuery === "", "navigation: command esc clears the query first");
  }

  if (group.id === "actions") {
    await go(page, "popover");
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
  await outsmartFixes(page, group.id);
  await brevilyDesignFixes(group.id);
  await designAsks(group.id);
  await playbookAsks(group.id);
}

await browser.close();
await writeTextFile(`${outDir}/axe.json`, JSON.stringify(axeReport, null, 2));
const total = entries.reduce((n, e) => n + e.cases.length, 0);
console.log(
  `\n${issues.length} issue(s). ${entries.length} components, ${total} cases, one page each. Screenshots in ${outDir}/`,
);
if (issues.length) {
  console.log(issues.map((i) => `  - ${i}`).join("\n"));
  exit(1);
}
