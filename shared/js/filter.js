/*
 * Generic client-side search/filter: an element carrying
 * `data-filter-scope` defines a filterable region. Inside it, a
 * `[data-table-search]` input free-text filters, and any
 * `[data-table-filter]` control narrows further (both AND together) — a
 * <select>, or radio inputs (e.g. a Segmented group; only the checked
 * one counts, and an empty value means "all"). Filterable items are a
 * table's own `tbody tr` rows when the scope contains a `<table>`,
 * otherwise any `[data-filter-item]` — so the same mechanism works for
 * both a data table and a card grid. An optional `[data-filter-empty]`
 * element in the scope is shown only when nothing matches.
 */
(() => {
  function getItems(scope) {
    const table = scope.querySelector("table");
    if (table) return [...table.querySelectorAll("tbody tr")];
    return [...scope.querySelectorAll("[data-filter-item]")];
  }

  function applyFilters(scope) {
    const searchInput = scope.querySelector("[data-table-search]");
    const term = (searchInput?.value || "").trim().toLowerCase();
    const filters = [...scope.querySelectorAll("[data-table-filter]")]
      .filter((el) => !(el.type === "radio" || el.type === "checkbox") || el.checked)
      .map((el) => el.value)
      .filter(Boolean)
      .map((v) => v.toLowerCase());

    let visible = 0;
    getItems(scope).forEach((item) => {
      const text = item.textContent.toLowerCase();
      const matches = (!term || text.includes(term)) &&
        filters.every((f) => text.includes(f));
      item.hidden = !matches;
      if (matches) visible++;
    });

    const empty = scope.querySelector("[data-filter-empty]");
    if (empty) empty.hidden = visible > 0;
  }

  document.addEventListener("input", (event) => {
    if (!event.target.matches("[data-table-search]")) return;
    const scope = event.target.closest("[data-filter-scope]");
    if (scope) applyFilters(scope);
  });

  document.addEventListener("change", (event) => {
    if (!event.target.matches("[data-table-filter]")) return;
    const scope = event.target.closest("[data-filter-scope]");
    if (scope) applyFilters(scope);
  });
})();
