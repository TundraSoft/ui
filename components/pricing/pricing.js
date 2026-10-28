/*
 * Pricing toggle: the monthly / yearly radios (`[data-pricing-period]`)
 * mirror their value onto `data-billing` on the `[data-pricing]` root,
 * and the stylesheet shows the matching price. The radios are real form
 * controls, so the choice also submits; without this script both prices
 * show (pricing.css labels the yearly one).
 */
(() => {
  function sync(root) {
    const checked = root.querySelector("[data-pricing-period]:checked");
    if (checked) root.setAttribute("data-billing", checked.value);
  }

  document.addEventListener("change", (event) => {
    if (!event.target.matches?.("[data-pricing-period]")) return;
    const root = event.target.closest("[data-pricing]");
    if (root) sync(root);
  });

  const initAll = () => document.querySelectorAll("[data-pricing]").forEach(sync);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
