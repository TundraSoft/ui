/**
 * Click-through smoke test for the admin theme demo: opens every page,
 * exercises the interactive pieces (dark mode, sidebar collapse, modal,
 * dropdown, tabs, submenu, switches), and asserts BOTH the DOM state
 * (class/attribute toggled) AND the actual computed style changed —
 * a toggle that flips its own class but gets overridden by a later,
 * unlayered CSS rule is exactly the kind of bug a DOM-only check misses.
 *
 * Needs a local Chrome; screenshots land in `.test-output/` (gitignored).
 */
/// <reference lib="dom" />
import { ensureDir, realPath } from "@tundralibs/compat/file";
import { exit } from "@tundralibs/compat/runtime";
import { isBlockedRequest, isNetworkNoise, launch } from "./browser.ts";

const outDir = ".test-output/admin";
await ensureDir(outDir);

const browser = await launch();

const base = `file://${await realPath("demo/admin")}`;
const pages = [
  "dashboard",
  "projects",
  "team",
  "profile",
  "invoice",
  "tables",
  "forms",
  "settings",
  "lock-screen",
  "404",
];

type Issue = { page: string; kind: string; detail: string };
const issues: Issue[] = [];

for (const name of pages) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 1440, height: 900 });

  page.on("console", (msg) => {
    if ((msg.type() === "error" || msg.type() === "warn") && !isNetworkNoise(msg)) {
      issues.push({ page: name, kind: `console.${msg.type()}`, detail: msg.text() });
    }
  });
  page.on("pageerror", (err) => issues.push({ page: name, kind: "pageerror", detail: String(err) }));
  page.on(
    "requestfailed",
    (req) =>
      !isBlockedRequest(req) &&
      issues.push({ page: name, kind: "requestfailed", detail: `${req.url()} — ${req.failure()?.errorText}` }),
  );

  await page.goto(`${base}/${name}.html`, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${outDir}/${name}-initial.png`, fullPage: true });

  if (name === "dashboard") {
    const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const toggle = await page.$("[data-theme-toggle]");
    if (!toggle) issues.push({ page: name, kind: "missing-element", detail: "[data-theme-toggle] not found" });
    else {
      await toggle.click();
      await new Promise((r) => setTimeout(r, 200));
      const bgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      if (bgAfter === bgBefore) {
        issues.push({
          page: name,
          kind: "visual-no-op",
          detail:
            `body background-color unchanged after dark-mode toggle click (${bgBefore}) — class/attr may have flipped with no visual effect`,
        });
      }
      await page.screenshot({ path: `${outDir}/${name}-dark-mode.png`, fullPage: true });
      await toggle.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    const collapseBtn = await page.$("[data-collapse]");
    if (!collapseBtn) issues.push({ page: name, kind: "missing-element", detail: "[data-collapse] not found" });
    else {
      const widthBefore = await page.evaluate(() => document.querySelector(".sidebar")?.getBoundingClientRect().width);
      await collapseBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      const widthAfter = await page.evaluate(() => document.querySelector(".sidebar")?.getBoundingClientRect().width);
      if (widthAfter === widthBefore) {
        issues.push({
          page: name,
          kind: "visual-no-op",
          detail: `sidebar width unchanged after collapse click (${widthBefore}px)`,
        });
      }
      // Icons must sit centred in the rail, not shoved against its edge
      // (a UA <ul> padding leak did exactly that once).
      const centred = await page.evaluate(() => {
        const rail = document.querySelector(".sidebar")!.getBoundingClientRect();
        const icon = document.querySelector(".sidebar .menu__icon")!.getBoundingClientRect();
        return {
          off: Math.abs(icon.left + icon.width / 2 - (rail.left + rail.width / 2)),
          inside: icon.right <= rail.right,
        };
      });
      if (centred.off > 4 || !centred.inside) {
        issues.push({
          page: name,
          kind: "collapsed-layout",
          detail: `menu icon off-centre by ${centred.off}px in the collapsed rail (inside=${centred.inside})`,
        });
      }
      await page.screenshot({ path: `${outDir}/${name}-collapsed.png`, fullPage: true });
      await collapseBtn.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    const modalOpener = await page.$("[data-modal-open]");
    if (!modalOpener) issues.push({ page: name, kind: "missing-element", detail: "[data-modal-open] not found" });
    else {
      await modalOpener.click();
      await new Promise((r) => setTimeout(r, 300));
      const modalOpen = await page.evaluate(() => document.querySelector("dialog.modal")?.hasAttribute("open"));
      if (!modalOpen) {
        issues.push({
          page: name,
          kind: "no-op-click",
          detail: "dialog did not open after clicking data-modal-open trigger",
        });
      }
      // Centred in both axes — a margin reset silently pins a native
      // <dialog> to the top-left, which a DOM-only "is it open" check misses.
      const offset = await page.evaluate(() => {
        const r = document.querySelector("dialog[open]")!.getBoundingClientRect();
        return {
          x: Math.abs(r.left + r.width / 2 - innerWidth / 2),
          y: Math.abs(r.top + r.height / 2 - innerHeight / 2),
        };
      });
      if (offset.x > 2 || offset.y > 2) {
        issues.push({
          page: name,
          kind: "modal-not-centered",
          detail: `dialog centre is off by ${offset.x}px × ${offset.y}px`,
        });
      }
      await page.screenshot({ path: `${outDir}/${name}-modal.png`, fullPage: true });
      const closer = await page.$("[data-modal-close]");
      if (closer) await closer.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    const dropdownTrigger = await page.$(".dropdown__trigger");
    if (!dropdownTrigger) issues.push({ page: name, kind: "missing-element", detail: ".dropdown__trigger not found" });
    else {
      await dropdownTrigger.click();
      await new Promise((r) => setTimeout(r, 200));
      const panelOpen = await page.evaluate(() => !document.querySelector(".dropdown__panel")?.hasAttribute("hidden"));
      if (!panelOpen) issues.push({ page: name, kind: "no-op-click", detail: "dropdown panel did not open" });
      await page.screenshot({ path: `${outDir}/${name}-dropdown.png`, fullPage: true });
    }
  }

  if (name === "profile") {
    const tabs = await page.$$(".tabs__tab");
    if (tabs.length < 2) {
      issues.push({ page: name, kind: "missing-element", detail: `expected >=2 .tabs__tab, found ${tabs.length}` });
    } else {
      await tabs[1].click();
      await new Promise((r) => setTimeout(r, 200));
      const selected = await page.evaluate((el) => el.getAttribute("aria-selected"), tabs[1]);
      if (selected !== "true") {
        issues.push({
          page: name,
          kind: "no-op-click",
          detail: "second tab did not become aria-selected=true after click",
        });
      }
      await page.screenshot({ path: `${outDir}/${name}-tab2.png`, fullPage: true });
    }
  }

  if (name === "forms") {
    const switchInput = await page.$(".switch__input");
    if (switchInput) {
      const before = await page.evaluate((el) => (el as HTMLInputElement).checked, switchInput);
      await switchInput.click();
      const after = await page.evaluate((el) => (el as HTMLInputElement).checked, switchInput);
      if (before === after) {
        issues.push({ page: name, kind: "no-op-click", detail: "switch checked state did not change on click" });
      }
    }
  }

  if (name === "tables") {
    const rowDropdown = await page.$(".dropdown__trigger");
    if (rowDropdown) {
      await rowDropdown.click();
      await new Promise((r) => setTimeout(r, 200));
      await page.screenshot({ path: `${outDir}/${name}-row-dropdown.png`, fullPage: true });
    }
  }

  if (name === "projects" || name === "team" || name === "tables") {
    const scope = await page.$("[data-filter-scope]");
    const searchInput = await scope?.$("[data-table-search]");
    if (!scope || !searchInput) {
      issues.push({ page: name, kind: "missing-element", detail: "[data-filter-scope] [data-table-search] not found" });
    } else {
      const itemSelector = (await scope.$("table")) ? "tbody tr" : "[data-filter-item]";
      const countBefore = (await scope.$$(`${itemSelector}:not([hidden])`)).length;
      await searchInput.type("zzz-no-such-match-zzz");
      await new Promise((r) => setTimeout(r, 150));
      const countAfterGarbage = (await scope.$$(`${itemSelector}:not([hidden])`)).length;
      if (countAfterGarbage !== 0) {
        issues.push({
          page: name,
          kind: "filter-no-op",
          detail:
            `expected 0 visible items after an unmatchable search, got ${countAfterGarbage} (started with ${countBefore})`,
        });
      }
      await page.evaluate((el) => (el as HTMLInputElement).value = "", searchInput);
      await searchInput.type("a");
      await new Promise((r) => setTimeout(r, 150));
      const countAfterReset = (await scope.$$(`${itemSelector}:not([hidden])`)).length;
      if (countAfterReset === 0) {
        issues.push({
          page: name,
          kind: "filter-no-op",
          detail: `search for "a" hid every item — filter may be stuck`,
        });
      }
      await page.screenshot({ path: `${outDir}/${name}-filtered.png`, fullPage: true });
    }
  }

  if (name === "settings") {
    // A fresh page/navigation, not a hash-only change on the existing one —
    // some browsers don't re-run deferred scripts for a same-document
    // hash change, which would make this a false negative either way.
    const deepLinkPage = await browser.newPage();
    await deepLinkPage.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await deepLinkPage.setViewport({ width: 1440, height: 900 });
    await deepLinkPage.goto(`${base}/settings.html#tab-billing`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 200));
    const selected = await deepLinkPage.evaluate(() =>
      document.querySelector("#tab-billing")?.getAttribute("aria-selected")
    );
    if (selected !== "true") {
      issues.push({
        page: name,
        kind: "deep-link-no-op",
        detail: "settings.html#tab-billing did not activate the Billing tab",
      });
    }
    // The sidebar must reflect the deep link: Settings expanded, Billing current,
    // and the tab must not be left holding fragment focus (stray focus ring).
    const side = await deepLinkPage.evaluate(() => ({
      expanded: document.querySelector('.sidebar [data-toggle][aria-expanded="true"]') !== null,
      sublistShown: !document.querySelector(".sidebar .menu__sublist")?.hasAttribute("hidden"),
      current: document.querySelector('.sidebar a[href="settings.html#tab-billing"]')?.getAttribute("aria-current"),
      tabFocused: document.activeElement?.id === "tab-billing",
    }));
    if (!side.expanded || !side.sublistShown) {
      issues.push({ page: name, kind: "submenu", detail: "Settings submenu not expanded on its own page" });
    }
    if (side.current !== "page") {
      issues.push({ page: name, kind: "submenu", detail: "Billing child link not marked aria-current=page" });
    }
    if (side.tabFocused) {
      issues.push({
        page: name,
        kind: "focus-ring",
        detail: "deep-linked tab kept fragment focus (paints a focus ring)",
      });
    }
    await deepLinkPage.screenshot({ path: `${outDir}/${name}-deep-link.png`, fullPage: true });
    await deepLinkPage.close();
  }

  // ---------------------------------------------------------------------
  // v2 scenarios — each asserts an observable outcome, not a class flip.
  // ---------------------------------------------------------------------
  const fail = (kind: string, detail: string) => issues.push({ page: name, kind, detail });
  const pause = (ms = 200) => new Promise((r) => setTimeout(r, ms));
  const isHidden = (sel: string) => page.$eval(sel, (el) => el.hasAttribute("hidden")).catch(() => null);
  const visibleCount = (scopeSel: string, itemSel: string) =>
    page.$$eval(`${scopeSel} ${itemSel}`, (els) => els.filter((el) => !el.hasAttribute("hidden")).length);

  if (name !== "lock-screen") {
    // Command palette: opens from the navbar trigger, closes on Escape.
    if ((await isHidden("#global-command")) !== true) fail("palette", "#global-command should start hidden");
    await page.click("[data-command-open]");
    await pause();
    if ((await isHidden("#global-command")) !== false) {
      fail("palette", "[data-command-open] did not open #global-command");
    }
    const focused = await page.evaluate(() => document.activeElement?.classList.contains("command__input"));
    if (!focused) fail("palette", "opening the palette did not focus its input");
    await page.keyboard.press("ArrowDown");
    const active = await page.$eval("#global-command [role=option][data-active]", (el) => el.textContent?.trim()).catch(
      () => null,
    );
    if (!active) fail("palette", "ArrowDown did not activate a result");
    if (name === "dashboard") await page.screenshot({ path: `${outDir}/${name}-palette.png` });
    // Typing filters the rendered list client-side (no data-action here).
    await page.keyboard.type("proj");
    await pause();
    const shown = await visibleCount("#global-command", "[role=option]");
    if (shown !== 2) {
      fail("palette-filter", `typing "proj" left ${shown} results visible, expected 2 (Projects, New project)`);
    }
    const groups = await visibleCount("#global-command", ".command__group");
    if (groups !== 2) fail("palette-filter", `${groups} group headings visible after filter, expected 2`);
    const countText = await page.$eval("#global-command .command__count", (el) => el.textContent);
    if (countText !== "2 results") fail("palette-filter", `count reads "${countText}"`);
    await page.keyboard.press("Escape"); // clears the query first…
    await pause();
    if ((await visibleCount("#global-command", "[role=option]")) !== 9) {
      fail("palette-filter", "Escape did not restore the full list");
    }
    await page.keyboard.press("Escape"); // …then closes
    await pause();
    if ((await isHidden("#global-command")) !== true) fail("palette", "Escape did not close the palette");
  }

  if (name !== "lock-screen" && name !== "404") {
    // Show toast: clones the page's <template> into the region.
    const toastsBefore = await page.$$eval("#toast-region .toast", (els) => els.length);
    await page.click("[data-toast-open]");
    await pause();
    const toastsAfter = await page.$$eval("#toast-region .toast", (els) => els.length);
    if (toastsAfter <= toastsBefore) fail("toast", "Show toast did not append a toast to #toast-region");
    const toastVisible = await page.$eval(
      "#toast-region .toast",
      (el) => getComputedStyle(el).opacity !== "0" && el.getBoundingClientRect().height > 0,
    );
    if (!toastVisible) fail("toast", "appended toast has no visible box");
  }

  if (name === "dashboard") {
    // Escape inside a combobox in a modal: first closes the list, second
    // must reach the <dialog> and close it (the combobox must not swallow it).
    await page.click("[data-modal-open='#create-project-modal']");
    await pause(300);
    await page.focus("#project-lead");
    await pause();
    await page.keyboard.press("Escape");
    await pause();
    const listClosed = await page.$eval("#project-lead-list", (el) => el.hasAttribute("hidden"));
    const stillOpen = await page.$eval("#create-project-modal", (el) => el.hasAttribute("open"));
    if (!listClosed || !stillOpen) {
      fail("escape", `first Escape: list hidden=${listClosed}, dialog open=${stillOpen} (expected true/true)`);
    }
    await page.keyboard.press("Escape");
    await pause();
    if (await page.$eval("#create-project-modal", (el) => el.hasAttribute("open"))) {
      fail("escape", "second Escape did not close the dialog — combobox swallowed it");
    }

    // ApexCharts is a deferred CDN script that runs AFTER dist/ui.js —
    // chart.js must retry on `load`, or the chart silently never renders.
    const chart = await page.waitForSelector("[data-chart] .apexcharts-canvas", { timeout: 10000 }).catch(() => null);
    if (!chart) fail("chart", "ApexCharts canvas never rendered (deferred library init retry broken?)");
    const timelineItems = await page.$$eval("#dashboard-activity .timeline__item", (els) => els.length);
    if (timelineItems < 4) fail("timeline", `expected 4 activity items, got ${timelineItems}`);
    const skeletons = await page.$$eval("#deploy-queue .skeleton", (els) => els.length);
    if (skeletons === 0) fail("skeleton", "lazy region has no skeleton placeholder");
    const sticky = await page.$eval("#recent-orders th", (el) => getComputedStyle(el).position);
    if (sticky !== "sticky") fail("data-table", `orders header position is ${sticky}, expected sticky`);
    await page.click('label[for="revenue-range-2"]');
    const range = await page.$eval("#revenue-range-2", (el) => (el as HTMLInputElement).checked);
    if (!range) fail("segmented", "clicking a segmented option did not check its radio");
  }

  if (name === "tables") {
    const scope = "#team-table";
    if ((await isHidden(`${scope} [data-bulk-bar]`)) !== true) {
      fail("bulk-bar", "bulk bar visible with nothing selected");
    }
    await page.click(`${scope} [data-select-row]`);
    await pause();
    if ((await isHidden(`${scope} [data-bulk-bar]`)) !== false) {
      fail("bulk-bar", "selecting a row did not show the bulk bar");
    }
    let count = await page.$eval(`${scope} [data-bulk-count]`, (el) => el.textContent);
    if (count !== "1 row selected") fail("bulk-bar", `count after one row: ${count}`);
    await page.click(`${scope} [data-select-all]`);
    await pause();
    count = await page.$eval(`${scope} [data-bulk-count]`, (el) => el.textContent);
    if (count !== "6 rows selected") fail("bulk-bar", `count after select-all: ${count}`);
    await page.screenshot({ path: `${outDir}/${name}-bulk.png`, fullPage: true });
    await page.click(`${scope} [data-bulk-clear]`);
    await pause();
    if ((await isHidden(`${scope} [data-bulk-bar]`)) !== true) fail("bulk-bar", "clear did not hide the bulk bar");
    // Bulk buttons are submits inside the table's own form, one `op` each;
    // the toolbar (search, status filter, date range) stays outside it.
    const bulkForm = await page.evaluate((scope) => {
      const form = document.querySelector(`${scope} form.data-table__form`);
      const buttons = [
        ...document.querySelectorAll(`${scope} [data-bulk-bar] button[type=submit]`),
      ] as HTMLButtonElement[];
      return {
        action: form?.getAttribute("data-action"),
        ops: buttons.map((b) => b.value).join(","),
        inForm: buttons.every((b) => b.closest("form") === form),
        toolbarOutside: !form?.querySelector(".data-table__toolbar"),
        rowsInside: !!form?.querySelector("[data-select-row][name=selected]"),
      };
    }, scope);
    if (!/^(paid,export,refund|role,export,deactivate)$/.test(bulkForm.ops) || !bulkForm.inForm || !bulkForm.action) {
      fail("bulk-bar", `bulk buttons are not submits of the table form (${JSON.stringify(bulkForm)})`);
    }
    if (!bulkForm.toolbarOutside || !bulkForm.rowsInside) {
      fail("bulk-bar", `bulk form must wrap the rows and not the toolbar (${JSON.stringify(bulkForm)})`);
    }

    // Segmented status filter drives filter.js (radio, not select).
    await page.click('label[for="team-status-2"]'); // Away
    await pause();
    const away = await visibleCount(scope, "tbody tr");
    if (away !== 1) fail("segmented-filter", `expected 1 visible row for Away, got ${away}`);
    await page.click('label[for="team-status-0"]'); // All
    await pause();
    const all = await visibleCount(scope, "tbody tr");
    if (all !== 6) fail("segmented-filter", `expected 6 rows after resetting to All, got ${all}`);

    // Empty state appears when a search matches nothing, and goes away again.
    const search = await page.$(`${scope} [data-table-search]`);
    await search!.type("zzz-nothing");
    await pause();
    if ((await isHidden(`${scope} [data-filter-empty]`)) !== false) {
      fail("filter-empty", "empty state not shown for an unmatchable search");
    }
    await page.screenshot({ path: `${outDir}/${name}-filter-empty.png`, fullPage: true });
    await page.evaluate((el) => {
      (el as HTMLInputElement).value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, search!);
    await pause();
    if ((await isHidden(`${scope} [data-filter-empty]`)) !== true) {
      fail("filter-empty", "empty state still shown after clearing search");
    }

    // Sort links carry aria-sort on the active column.
    const sorted = await page.$eval(`${scope} th[aria-sort]`, (el) => el.getAttribute("aria-sort")).catch(() => null);
    if (sorted !== "ascending") fail("data-table", `active sort header aria-sort=${sorted}`);

    // Orders toolbar: date-range picker floats — opening it must not
    // change the toolbar's height (that was the "date filter breaks UI" bug).
    const toolbarBefore = await page.$eval(
      "#orders-table .data-table__toolbar",
      (el) => el.getBoundingClientRect().height,
    );
    await page.click("#orders-table [data-datepicker-trigger]");
    await pause();
    if ((await isHidden("#orders-table-period-panel")) !== false) fail("datepicker", "orders date picker did not open");
    const toolbarAfter = await page.$eval(
      "#orders-table .data-table__toolbar",
      (el) => el.getBoundingClientRect().height,
    );
    if (toolbarAfter !== toolbarBefore) {
      fail("datepicker", `opening the picker reflowed the toolbar (${toolbarBefore}px → ${toolbarAfter}px)`);
    }
    const panelRight = await page.$eval("#orders-table-period-panel", (el) => el.getBoundingClientRect().right);
    const triggerRight = await page.$eval(
      "#orders-table [data-datepicker-trigger]",
      (el) => el.getBoundingClientRect().right,
    );
    if (Math.abs(panelRight - triggerRight) > 2) {
      fail("datepicker", `align=end panel right edge ${panelRight} vs trigger ${triggerRight}`);
    }
    await page.screenshot({ path: `${outDir}/${name}-datepicker.png` });
    await page.keyboard.press("Escape");
    await pause();
    if ((await isHidden("#orders-table-period-panel")) !== true) {
      fail("datepicker", "Escape did not close the orders date picker");
    }

    const inkAction = await page.$(".toast--ink .toast__action");
    if (!inkAction) fail("toast", "ink toast with Undo action not rendered");

    // Row-action menu on the LAST row must not be clipped by the scroll body.
    // The last row's action strip opens inside the row, fully visible in the scroll box.
    const kebabs = await page.$$("#team-table [data-row-actions]");
    await kebabs[kebabs.length - 1].click();
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#team-table .data-table__row-actions:not([hidden])") as HTMLElement | null;
        return !!el && el.getAnimations().length === 0;
      },
      { timeout: 2000 },
    ).catch(() => fail("row-actions", "last-row strip never opened"));
    const clip = await page.evaluate(() => {
      const strip = document.querySelector("#team-table .data-table__row-actions:not([hidden])")!;
      const scroll = document.querySelector("#team-table .data-table__scroll")!;
      const p = strip.getBoundingClientRect();
      const s = scroll.getBoundingClientRect();
      const at = document.elementFromPoint(p.right - 10, p.top + p.height / 2);
      return {
        inBox: p.left >= s.left - 1 && p.right <= s.right + 1 && p.bottom <= s.bottom + 1,
        visible: strip.contains(at),
      };
    });
    if (!clip.visible || !clip.inBox) fail("row-actions", `last-row strip is clipped (${JSON.stringify(clip)})`);
    await page.screenshot({ path: `${outDir}/${name}-row-menu.png` });
    await page.keyboard.press("Escape");
    await pause();
  }

  // ----- Mobile: the drawer must exist, open, close, and stay out of the tab order.
  if (name === "dashboard" || name === "tables") {
    await page.setViewport({ width: 375, height: 740 });
    await pause(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 0) fail("mobile-overflow", `page is ${overflow}px wider than a 375px viewport`);
    const toggle = await page.$(".navbar__toggle--sidebar");
    if (!toggle) fail("mobile-nav", "no sidebar toggle rendered at 375px — navigation unreachable");
    else {
      const before = await page.$eval(".sidebar", (el) => getComputedStyle(el).visibility);
      if (before !== "hidden") fail("mobile-nav", `closed drawer is visibility:${before} (still focusable off-screen)`);
      await toggle.click();
      await pause(400);
      const open = await page.$eval(".sidebar", (el) => ({
        cls: el.classList.contains("is-open"),
        vis: getComputedStyle(el).visibility,
        x: el.getBoundingClientRect().left,
        hidden: el.hasAttribute("hidden"),
      }));
      if (!open.cls || open.vis !== "visible" || open.x !== 0) {
        fail("mobile-nav", `drawer after toggle: ${JSON.stringify(open)}`);
      }
      await page.screenshot({ path: `${outDir}/${name}-mobile-drawer.png` });
      await page.keyboard.press("Escape");
      await pause(400);
      const closed = await page.$eval(
        ".sidebar",
        (el) => ({ cls: el.classList.contains("is-open"), hidden: el.hasAttribute("hidden") }),
      );
      if (closed.cls) fail("mobile-nav", "Escape did not close the drawer");
      if (closed.hidden) {
        fail("mobile-nav", "drawer got the hidden attribute — it would vanish on desktop after resize");
      }
      const focusOnToggle = await page.evaluate(() =>
        document.activeElement?.classList.contains("navbar__toggle--sidebar")
      );
      if (!focusOnToggle) fail("mobile-nav", "focus did not return to the toggle after Escape");
    }
    await page.screenshot({ path: `${outDir}/${name}-mobile.png`, fullPage: true });
    // Back to desktop: the sidebar must be a normal column again.
    await page.setViewport({ width: 1440, height: 900 });
    await pause(300);
    const desktop = await page.$eval(
      ".sidebar",
      (el) => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 100,
    );
    if (!desktop) fail("mobile-nav", "sidebar missing after resizing back to desktop");
  }

  if (name === "forms") {
    const fields = await page.$$eval(".alert--danger .alert__field", (els) => els.length);
    if (fields !== 2) fail("form-error", `FormErrorAlert rendered ${fields} field rows, expected 2`);

    await page.focus("#f-manager");
    await pause();
    if ((await isHidden("#f-manager-list")) !== false) fail("combobox", "manager combobox did not open on focus");
    await page.keyboard.type("jam");
    await pause();
    const matches = await visibleCount("#f-manager-list", "[role=option]");
    if (matches !== 1) fail("combobox-filter", `typing "jam" left ${matches} options, expected 1`);
    const hiddenGroups = await page.$$eval("#f-manager-list .combobox__group[hidden]", (els) => els.length);
    if (hiddenGroups !== 1) {
      fail("combobox-filter", `expected the emptied Engineering group hidden, got ${hiddenGroups} hidden groups`);
    }
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await pause();
    const picked = await page.$eval("#f-manager", (el) => (el as HTMLInputElement).value);
    if (picked !== "Jamie Sun") fail("combobox", `filter + ArrowDown + Enter picked "${picked}", expected "Jamie Sun"`);
    // Multi: typing filters, picking adds a token with a hidden input.
    await page.focus("#f-team");
    await page.keyboard.type("qa");
    await pause();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await pause();
    const qaToken = await page.$eval(
      "[data-combobox-name='teams']",
      (el) => Array.from(el.querySelectorAll(".combobox__token input")).map((i) => (i as HTMLInputElement).value),
    );
    if (!qaToken.includes("qa")) {
      fail("combobox-multi", `picking QA did not add a token (tokens: ${qaToken.join(",")})`);
    }
    await page.keyboard.press("Escape");

    const tokensBefore = await page.$$eval(
      "#f-team ~ .combobox__list, [data-combobox] .combobox__token",
      (els) => els.length,
    );
    await page.click("[data-combobox-remove]");
    await pause();
    const tokensAfter = await page.$$eval("[data-combobox] .combobox__token", (els) => els.length);
    if (tokensAfter !== tokensBefore - 1) fail("combobox-multi", `token removal: ${tokensBefore} → ${tokensAfter}`);

    await page.$eval("#f-seats", (el) => {
      (el as HTMLInputElement).value = "1";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const seats = await page.$eval(
      "#f-seats",
      (el) => el.closest("[data-slider]")!.querySelector("[data-slider-output]")!.textContent,
    );
    if (seats !== "1 seat") fail("slider", `slider output "${seats}", expected "1 seat"`);
    const pct = await page.$eval(
      "#f-seats",
      (el) => (el.closest("[data-slider]") as HTMLElement).style.getPropertyValue("--slider-pct"),
    );
    if (pct !== "5.00%") fail("slider", `--slider-pct ${pct}, expected 5.00%`);

    await page.click('label[for="f-role-0"]');
    const admin = await page.$eval("#f-role-0", (el) => (el as HTMLInputElement).checked);
    if (!admin) fail("segmented", "Role segmented did not switch to Admin");

    await page.click("#f-start [data-datepicker-trigger]");
    await pause();
    if ((await isHidden("#f-start-panel")) !== false) fail("datepicker", "start-date picker did not open");
    const disabledDays = await page.$$eval("#f-start-panel .datepicker__day[disabled]", (els) => els.length);
    if (disabledDays === 0) fail("datepicker", "min date did not disable earlier days");
    await page.screenshot({ path: `${outDir}/${name}-datepicker.png`, fullPage: true });
    await page.keyboard.press("Escape");

    const progress = await page.$eval("progress.dropzone__bar", (el) => (el as HTMLProgressElement).value);
    if (progress !== 72) fail("dropzone", `upload progress ${progress}, expected native <progress> at 72`);
    const filesBefore = await page.$$eval("#f-docs .dropzone__file", (els) => els.length);
    await page.click("#f-docs [data-dropzone-remove]");
    const filesAfter = await page.$$eval("#f-docs .dropzone__file", (els) => els.length);
    if (filesAfter !== filesBefore - 1) fail("dropzone", `remove: ${filesBefore} → ${filesAfter}`);

    // The form submits the option VALUE through a hidden input, never the label.
    const submitted = await page.$eval("[data-combobox] input[name='manager']", (el) => ({
      type: (el as HTMLInputElement).type,
      value: (el as HTMLInputElement).value,
    }));
    if (submitted.type !== "hidden" || submitted.value !== "js") {
      fail("combobox", `name=manager submits ${submitted.type}/"${submitted.value}", expected hidden/"js"`);
    }

    // Server-rendered format() output must survive load (slider.js only rewrites on input).
    const tierLabel = await page.$eval(
      "#f-tier",
      (el) => el.closest("[data-slider]")!.querySelector("[data-slider-output]")!.textContent,
    );
    if (tierLabel !== "Standard") {
      fail("slider", `stepped slider shows "${tierLabel}" on load, expected the server's "Standard"`);
    }
    await page.$eval("#f-tier", (el) => {
      (el as HTMLInputElement).value = "2";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const tierAfter = await page.$eval(
      "#f-tier",
      (el) => el.closest("[data-slider]")!.querySelector("[data-slider-output]")!.textContent,
    );
    if (tierAfter !== "Priority") {
      fail("slider", `stepped slider shows "${tierAfter}" after input, expected "Priority"`);
    }

    // Field error is wired to the input for screen readers.
    const described = await page.$eval("#f-email", (el) => ({
      by: el.getAttribute("aria-describedby"),
      invalid: el.getAttribute("aria-invalid"),
      exists: !!document.getElementById(el.getAttribute("aria-describedby") ?? ""),
    }));
    if (described.by !== "f-email-error" || !described.exists || described.invalid !== "true") {
      fail("a11y", `email field describedby=${described.by} invalid=${described.invalid}`);
    }

    // Client-mode date picker: pick two days → hidden inputs + label update.
    await page.click("#w-trial [data-datepicker-trigger]");
    await pause();
    const heading = await page.$eval("#w-trial .datepicker__month", (el) => el.textContent);
    await page.click('#w-trial button[data-month][data-nav="next"]'); // next month
    await pause();
    const heading2 = await page.$eval("#w-trial .datepicker__month", (el) => el.textContent);
    if (heading === heading2) fail("datepicker-client", `month nav did not re-render (${heading})`);
    await page.click('#w-trial button[data-day="2026-10-05"]');
    await page.click('#w-trial button[data-day="2026-10-09"]');
    await pause();
    const range = await page.$eval("#w-trial", (el) => ({
      start: (el.querySelector("[data-datepicker-start]") as HTMLInputElement).value,
      end: (el.querySelector("[data-datepicker-end]") as HTMLInputElement).value,
      label: el.querySelector("[data-datepicker-label]")!.textContent,
      closed: el.querySelector(".datepicker__panel")!.hasAttribute("hidden"),
    }));
    if (range.start !== "2026-10-05" || range.end !== "2026-10-09") {
      fail("datepicker-client", `range picked ${range.start}..${range.end}`);
    }
    if (range.label !== "5 Oct 2026 – 9 Oct 2026") fail("datepicker-client", `trigger label "${range.label}"`);
    if (!range.closed) fail("datepicker-client", "panel stayed open after completing a range");
  }

  if (name === "projects") {
    await page.click('label[for="project-view-1"]'); // list
    await pause();
    const view = await page.$eval("#projects-grid", (el) => el.getAttribute("data-view"));
    if (view !== "list") fail("view-switch", `data-view is ${view}, expected list`);
    const firstCardW = await page.$eval("#projects-grid > *", (el) => el.getBoundingClientRect().width);
    const gridW = await page.$eval("#projects-grid", (el) => el.getBoundingClientRect().width);
    if (Math.abs(firstCardW - gridW) > 2) {
      fail("view-switch", `list view card is ${firstCardW}px wide in a ${gridW}px grid`);
    }
    await page.screenshot({ path: `${outDir}/${name}-list.png`, fullPage: true });
    await page.click('label[for="project-view-0"]');
    await pause();
    await page.click("[data-modal-open='#create-project-modal']");
    await pause(300);
    if (!(await page.$eval("#create-project-modal", (el) => el.hasAttribute("open")))) {
      fail("modal", "New project did not open the modal");
    }
    await page.click("#create-project-modal [data-modal-close]");
    await pause();
  }

  if (name === "invoice") {
    await page.click("#download-options .dropdown__trigger");
    await pause();
    if ((await isHidden("#download-options-panel")) !== false) {
      fail("dropdown", "split-button caret did not open its menu");
    }
    const item = await page.$eval("#download-options-panel .menu__link", (el) => {
      const r = el.getBoundingClientRect();
      const panel = el.closest(".dropdown__panel")!.getBoundingClientRect();
      return { height: r.height, lineHeight: parseFloat(getComputedStyle(el).lineHeight), indent: r.left - panel.left };
    });
    if (item.height > item.lineHeight * 1.8) fail("dropdown", `menu label wraps (item ${item.height}px tall)`);
    if (item.indent > 16) {
      fail("dropdown", `menu items indented ${item.indent}px inside the panel (UA list padding leaking?)`);
    }
    await page.screenshot({ path: `${outDir}/${name}-split.png` });
    await page.keyboard.press("Escape");
    await pause();
  }

  if (name === "team") {
    await page.click("[data-modal-open='#invite-modal']");
    await pause(300);
    if (!(await page.$eval("#invite-modal", (el) => el.hasAttribute("open")))) {
      fail("modal", "Invite did not open the modal");
    }
    await page.click("#invite-modal [data-modal-close]");
    await pause();
    await page.click("[data-popover-trigger]");
    await pause();
    if ((await isHidden("#member-1")) !== false) fail("popover", "Contact popover did not open");
    await page.screenshot({ path: `${outDir}/${name}-popover.png` });
    await page.click("h1");
    await pause();
    if ((await isHidden("#member-1")) !== true) fail("popover", "popover did not close on outside click");
    await page.click('label[for="team-page-status-2"]'); // Away
    await pause();
    const away = await visibleCount("[data-filter-scope]", "[data-filter-item]");
    if (away !== 1) fail("segmented-filter", `expected 1 Away card, got ${away}`);
    await page.click('label[for="team-page-status-0"]');
    await pause();
  }

  if (name === "profile") {
    const tabs = await page.$$(".tabs__tab");
    await tabs[2].click();
    await pause();
    await page.click("#sessions [data-select-row]");
    await pause();
    if ((await isHidden("#sessions [data-bulk-bar]")) !== false) {
      fail("bulk-bar", "session selection did not show the bulk bar");
    }
    await page.screenshot({ path: `${outDir}/${name}-sessions.png`, fullPage: true });
    await tabs[1].click();
    await pause();
    const avatarFile = await page.$("#profile-avatar .dropzone__file--done");
    if (!avatarFile) fail("dropzone", "profile avatar upload row missing");
    await page.screenshot({ path: `${outDir}/${name}-edit.png`, fullPage: true });
  }

  if (name === "settings") {
    // A row action that "downloads" is a link to somewhere real, not a dead button.
    const pdf = await page.$eval(
      "#billing-history tbody tr .data-table__actions a",
      (a) => a.getAttribute("href"),
    ).catch(() => null);
    if (pdf !== "invoice.html") fail("data-table", `billing PDF action is not a link (${pdf})`);
    const before = await page.$$eval(
      "#workspace-recipients ~ * .combobox__token, [data-combobox] .combobox__token",
      (els) => els.length,
    );
    await page.click("[data-combobox-remove]");
    const after = await page.$$eval("[data-combobox] .combobox__token", (els) => els.length);
    if (after !== before - 1) fail("combobox-multi", `recipient removal: ${before} → ${after}`);
    const tabs = await page.$$(".tabs__tab");
    await tabs[2].click();
    await pause();
    const webhooks = await page.$("#panel-integrations .empty--inline, .tabs__panel:not([hidden]) .empty--inline");
    if (!webhooks) fail("empty", "webhooks inline empty state not rendered on Integrations tab");
    await page.screenshot({ path: `${outDir}/${name}-integrations.png`, fullPage: true });
    await page.click("[data-modal-open='#delete-workspace-modal']");
    await pause(300);
    const open = await page.$eval("#delete-workspace-modal", (el) => el.hasAttribute("open"));
    if (!open) fail("modal", "danger-zone modal did not open");
    await page.screenshot({ path: `${outDir}/${name}-danger.png` });
    await page.click("#delete-workspace-modal [data-modal-close]");
    await pause();
  }

  if (name === "invoice") {
    await page.click("[data-popover-trigger]");
    await pause();
    if ((await isHidden("#client-card")) !== false) fail("popover", "client popover did not open");
    await page.screenshot({ path: `${outDir}/${name}-popover.png` });
    await page.keyboard.press("Escape");
    const numeric = await page.$$eval("#invoice-items td.data-table__num", (els) => els.length);
    if (numeric === 0) fail("table", "invoice line items have no numeric cells");
  }

  if (name !== "lock-screen" && name !== "404") {
    const settingsToggle = await page.$('.sidebar [data-toggle][aria-expanded="false"]');
    if (settingsToggle) {
      await settingsToggle.click();
      await new Promise((r) => setTimeout(r, 200));
      const expanded = await page.evaluate((el) => el.getAttribute("aria-expanded"), settingsToggle);
      if (expanded !== "true") {
        issues.push({ page: name, kind: "no-op-click", detail: "sidebar Settings submenu did not expand" });
      }
      await page.screenshot({ path: `${outDir}/${name}-submenu.png`, fullPage: true });
    }
  }

  await page.close();
}

await browser.close();

if (issues.length > 0) {
  console.log(JSON.stringify(issues, null, 2));
}
console.log(`\n${issues.length} issue(s) found. Screenshots in ${outDir}/`);
if (issues.length > 0) exit(1);
