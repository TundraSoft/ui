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
  function refresh(table) {
    const bar = table.querySelector("[data-bulk-bar]");
    const rows = table.querySelectorAll("[data-select-row]");
    const checked = table.querySelectorAll("[data-select-row]:checked").length;

    if (bar) {
      bar.hidden = checked === 0;
      const count = bar.querySelector("[data-bulk-count]");
      if (count) count.textContent = checked === 1 ? "1 row selected" : `${checked} rows selected`;
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

  document.addEventListener("click", (event) => {
    const clear = event.target.closest?.("[data-bulk-clear]");
    if (!clear) return;
    const table = clear.closest(".data-table");
    if (!table) return;
    table.querySelectorAll("[data-select-row]").forEach((box) => setRow(box, false));
    refresh(table);
    remember(table);
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

  function initAll(keepSelection) {
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
