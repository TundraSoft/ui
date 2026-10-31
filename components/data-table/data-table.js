/*
 * Data table: row selection is a pure view concern until submitted, so it
 * lives here rather than round-tripping. The checkboxes are the source of
 * truth the server reads back on submit (`bulkAction` puts them in a
 * form); the bulk bar just mirrors them. Runs once on load and after
 * every rAPId swap.
 *
 * A sort or page link is an `outer` swap that replaces the whole table,
 * and the server cannot know what was checked — so the selection is
 * remembered per table id and re-applied after a GET swap (sort, page,
 * back/forward) to whichever remembered rows are still present. A POST
 * swap is the bulk form's own reply: the server rendered the selection it
 * wants (usually none), and that wins.
 *
 * Select all N (`DataTable.selectAll`): once every row on the page is
 * ticked, [data-bulk-select-all] shows; picking it sets the hidden
 * [data-bulk-all] to "1" (the server then acts on its whole match) and
 * the count reads the total. Unticking a row, Clear, or the same button
 * again returns to the ticked rows. The count's wording comes from
 * `data-one` / `data-other` on [data-bulk-count] (`{n}` = the number).
 *
 * `DataTable.pinEnd`: see fitPinned.
 */
(() => {
  /** table id → Set of checked row keys, as of the last change. */
  const memory = new Map();

  function remember(table) {
    if (!table.id) return;
    const keys = new Set();
    table.querySelectorAll("[data-select-row]:checked").forEach((box) => keys.add(box.value));
    memory.set(table.id, keys);
  }

  function restore(table) {
    const keys = table.id && memory.get(table.id);
    if (!keys?.size) return;
    table.querySelectorAll("[data-select-row]").forEach((box) => {
      if (keys.has(box.value)) setRow(box, true);
    });
  }
  const countText = (el, n) => {
    const one = el.getAttribute("data-one") || "1 row selected";
    const other = el.getAttribute("data-other") || "{n} rows selected";
    return n === 1 ? one : other.replace("{n}", n.toLocaleString("en-US"));
  };

  function refresh(table) {
    const bar = table.querySelector("[data-bulk-bar]");
    const rows = table.querySelectorAll("[data-select-row]");
    const checked = table.querySelectorAll("[data-select-row]:checked").length;

    if (bar) {
      bar.hidden = checked === 0;
      const everything = bar.querySelector("[data-bulk-all]");
      const offer = bar.querySelector("[data-bulk-select-all]");
      // Any row unticked after "Select all": back to the ticked rows.
      if (everything && everything.value === "1" && checked < rows.length) everything.value = "";
      const taken = everything?.value === "1";
      const count = bar.querySelector("[data-bulk-count]");
      if (count) count.textContent = taken && offer ? offer.getAttribute("data-selected") : countText(count, checked);
      if (offer) {
        const total = Number(offer.getAttribute("data-total") || 0);
        offer.hidden = !taken && (checked < rows.length || total <= rows.length);
        offer.textContent = taken ? offer.getAttribute("data-clear") : offer.getAttribute("data-label");
        offer.setAttribute("aria-pressed", String(taken));
      }
    }

    const all = table.querySelector("[data-select-all]");
    if (all) {
      all.checked = checked > 0 && checked === rows.length;
      all.indeterminate = checked > 0 && checked < rows.length;
    }
  }

  function setRow(box, on) {
    box.checked = on;
    box.closest("tr")?.classList.toggle("data-table__row--selected", on);
  }

  document.addEventListener("change", (event) => {
    const table = event.target.closest?.(".data-table");
    if (!table) return;
    if (event.target.matches("[data-select-all]")) {
      table.querySelectorAll("[data-select-row]").forEach((box) => setRow(box, event.target.checked));
    } else if (event.target.matches("[data-select-row]")) {
      setRow(event.target, event.target.checked);
    } else {
      return;
    }
    refresh(table);
    remember(table);
  });

  function clearAll(table) {
    const everything = table.querySelector("[data-bulk-all]");
    if (everything) everything.value = "";
    table.querySelectorAll("[data-select-row]").forEach((box) => setRow(box, false));
    refresh(table);
    remember(table);
  }

  document.addEventListener("click", (event) => {
    const clear = event.target.closest?.("[data-bulk-clear]");
    const table = (clear ?? event.target.closest?.("[data-bulk-select-all]"))?.closest(".data-table");
    if (!table) return;
    if (clear) {
      clearAll(table);
      return;
    }
    const everything = table.querySelector("[data-bulk-all]");
    if (!everything) return;
    if (everything.value === "1") {
      clearAll(table);
      return;
    }
    everything.value = "1";
    refresh(table);
  });

  /* Row action strips: one open at a time, Escape / close / outside click
     close it, focus returns to the kebab. */
  const strips = () => document.querySelectorAll(".data-table__row-actions:not([hidden])");
  const openerOf = (strip) => document.querySelector(`[data-row-actions="#${CSS.escape(strip.id)}"]`);

  function hideStrip(strip) {
    strip.classList.remove("is-closing");
    strip.hidden = true;
    strip.style.removeProperty("max-width");
  }

  function closeStrip(strip, refocus) {
    const opener = openerOf(strip);
    opener?.setAttribute("aria-expanded", "false");
    if (refocus) opener?.focus();
    if (strip.hidden || strip.classList.contains("is-closing")) return;
    // Play the slide out, then hide — unless motion is off (no animation
    // runs, so animationend would never come).
    strip.classList.add("is-closing");
    if (getComputedStyle(strip).animationName === "none") hideStrip(strip);
    else strip.addEventListener("animationend", () => hideStrip(strip), { once: true });
  }

  document.addEventListener("click", (event) => {
    const opener = event.target.closest?.("[data-row-actions]");
    const closer = event.target.closest?.("[data-row-actions-close]");
    if (closer) {
      const strip = closer.closest(".data-table__row-actions");
      if (strip) closeStrip(strip, true);
      return;
    }
    if (opener) {
      const strip = document.querySelector(opener.getAttribute("data-row-actions"));
      if (!strip) return;
      // Re-opening mid slide-out: settle it first, then open afresh.
      if (strip.classList.contains("is-closing")) hideStrip(strip);
      const open = strip.hidden;
      strips().forEach((s) => closeStrip(s, false));
      if (open) {
        // Never wider than the free part of the visible scroll box: the
        // sticky selection / pinned cells stay above the strip so the row
        // keeps its identity, so the strip stops where they end (CSSOM,
        // not an attribute — CSP-clean). Longer strips scroll sideways.
        const scroll = strip.closest(".data-table__scroll");
        if (scroll) {
          const left = scroll.getBoundingClientRect().left;
          const stuck = [...strip.closest("tr").querySelectorAll("td.data-table__select, td.data-table__cell--pinned")]
            .map((td) => td.getBoundingClientRect().right - left);
          strip.style.maxWidth = `${scroll.clientWidth - Math.max(0, ...stuck)}px`;
        }
        strip.hidden = false;
        opener.setAttribute("aria-expanded", "true");
        strip.querySelector("a, button")?.focus();
      }
      return;
    }
    strips().forEach((s) => {
      if (!s.contains(event.target)) closeStrip(s, false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const strip = event.target.closest?.(".data-table__row-actions");
    if (!strip) return;
    closeStrip(strip, true);
    event.preventDefault();
    event.stopPropagation();
  });

  /**
   * A stable `view-transition-name` per row (from its key, via the CSSOM —
   * no style attribute), so a sort or page swap under rAPId's View
   * Transition moves the rows that stayed instead of cross-fading the
   * whole table. Set after every swap too: the names must be on the new
   * rows before the browser captures the new state.
   */
  function nameRows(table) {
    if (!("viewTransitionName" in document.documentElement.style)) return;
    const id = (table.id || "table").replace(/[^a-zA-Z0-9_-]/g, "_");
    table.querySelectorAll("tr[data-row-key]").forEach((row) => {
      const key = (row.getAttribute("data-row-key") || "").replace(/[^a-zA-Z0-9_-]/g, "_");
      row.style.viewTransitionName = `${id}-${key}`;
    });
  }

  /* pinEnd: the scroll box is a tab stop only while there is something to
     scroll, and focus scrolling keeps clear of the pinned cell's width.
     Rows animating in can poke a few pixels past an uncapped box, so height
     only counts on a capped one. data-pin-fits drops the pinned edge. */
  function fitPinned(box) {
    const wide = box.scrollWidth > box.clientWidth + 1;
    const capped = getComputedStyle(box).maxHeight !== "none";
    if (wide || (capped && box.scrollHeight > box.clientHeight + 1)) box.setAttribute("tabindex", "0");
    else box.removeAttribute("tabindex");
    box.toggleAttribute("data-pin-fits", !wide);
    const pin = box.querySelector("thead th:last-child");
    if (pin) box.style.setProperty("--data-table-pin-end-width", `${pin.offsetWidth}px`);
  }
  const PIN_BOX = ".data-table--pin-end .data-table__scroll";
  const watched = new WeakSet();
  const pinObserver = "ResizeObserver" in window
    ? new ResizeObserver((entries) =>
      entries.forEach((entry) => {
        const box = entry.target.closest(PIN_BOX);
        if (box) fitPinned(box);
      })
    )
    : null;
  function watchPinned() {
    document.querySelectorAll(PIN_BOX).forEach((box) => {
      fitPinned(box);
      if (!pinObserver || watched.has(box)) return;
      watched.add(box);
      pinObserver.observe(box);
      const table = box.querySelector("table");
      if (table) pinObserver.observe(table);
    });
  }

  function initAll(keepSelection) {
    watchPinned();
    document.querySelectorAll(".data-table").forEach(nameRows);
    document.querySelectorAll(".data-table").forEach((table) => {
      if (keepSelection) restore(table);
      refresh(table);
      remember(table);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAll(false));
  } else {
    initAll(false);
  }
  document.addEventListener("rapid:swapped", (event) => {
    const method = String(event.detail?.method ?? "get").toLowerCase();
    initAll(method === "get");
  });
})();
