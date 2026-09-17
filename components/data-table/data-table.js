/*
 * Data table: row selection is a pure view concern until submitted, so it
 * lives here rather than round-tripping. The checkboxes are the source of
 * truth the server reads back on submit; the bulk bar just mirrors them.
 * Runs once on load and after every rAPId swap.
 */
(() => {
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
  });

  document.addEventListener("click", (event) => {
    const clear = event.target.closest?.("[data-bulk-clear]");
    if (!clear) return;
    const table = clear.closest(".data-table");
    if (!table) return;
    table.querySelectorAll("[data-select-row]").forEach((box) => setRow(box, false));
    refresh(table);
  });

  function initAll() {
    document.querySelectorAll(".data-table").forEach(refresh);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  document.addEventListener("rapid:swapped", initAll);
})();
