/* Segmented: a thumb that glides to the checked option. The control is
 * still plain radios + labels (submits, works without JS); this only
 * measures the checked label and writes --segmented-x / --segmented-w
 * onto the root, which segmented.css turns into the moving surface.
 * Re-measured on change, on resize, after a rapid swap, and whenever the
 * control's own box changes size (a ResizeObserver) — so one inside a
 * <dialog>, <details> or tab panel that was hidden at load (measured 0
 * wide) is placed when it is shown. */
(() => {
  function place(root) {
    const checked = root.querySelector(".segmented__input:checked");
    const label = checked?.nextElementSibling;
    if (!label) {
      root.style.setProperty("--segmented-w", "0px");
      return;
    }
    const r = root.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    const rtl = getComputedStyle(root).direction === "rtl";
    const x = rtl ? r.right - root.clientLeft - 3 - l.right : l.left - r.left - root.clientLeft - 3;
    root.style.setProperty("--segmented-x", `${rtl ? -x : x}px`);
    root.style.setProperty("--segmented-w", `${l.width}px`);
    root.setAttribute("data-segmented-ready", "");
  }

  const watched = new WeakSet();
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver((entries) => entries.forEach((e) => place(e.target)))
    : null;
  const initAll = () =>
    document.querySelectorAll("[data-segmented]").forEach((root) => {
      place(root);
      if (observer && !watched.has(root)) {
        watched.add(root);
        observer.observe(root);
      }
    });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  addEventListener("load", initAll);
  addEventListener("resize", initAll);
  document.addEventListener("rapid:swapped", initAll);
  document.addEventListener("change", (event) => {
    const root = event.target.closest?.("[data-segmented]");
    if (root) place(root);
  });
})();
