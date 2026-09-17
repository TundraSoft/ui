/*
 * A pure opt-in marker — added, never assumed pre-set — so no core/layout
 * template needs to put a class on <html> or <body> (rAPId's own
 * `htmlDocument()` helper doesn't expose a hook for either). Every CSS
 * rule that depends on JS being available is written as `.js SELECTOR`,
 * so its absence (JS disabled, or this script not yet run) always means
 * the plain, functional fallback rendering — never a broken one.
 */
(() => {
  document.documentElement.classList.add("js");
})();
