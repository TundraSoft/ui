/* Segmented: a thumb that glides to the checked option. The control is
 * still plain radios + labels (submits, works without JS); this only
 * measures the checked label and writes --segmented-x / --segmented-w
 * onto the root, which segmented.css turns into the moving surface.
 * Re-measured on change, on resize, after a rapid swap, and whenever the
 * control's own box changes size (a ResizeObserver) — so one inside a
 * <dialog>, <details> or tab panel that was hidden at load (measured 0
 * wide) is placed when it is shown.
 *
 * On a narrow screen the control scrolls sideways inside itself
 * (segmented.css caps it at its container). The thumb is positioned in the
 * scroll box's content, so the measurement adds the scroll offset, and the
 * checked option is scrolled into view on load and on change — without
 * moving the page, which scrollIntoView would. */
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
    // scrollLeft is 0 → negative in RTL, 0 → positive in LTR; adding it
    // turns the label's on-screen edge into its edge in the content.
    const x = rtl
      ? r.right - root.clientLeft - 3 - l.right - root.scrollLeft
      : l.left - r.left - root.clientLeft - 3 + root.scrollLeft;
    root.style.setProperty("--segmented-x", `${rtl ? -x : x}px`);
    root.style.setProperty("--segmented-w", `${l.width}px`);
    root.setAttribute("data-segmented-ready", "");
  }

  /** Scroll the control (only the control) so its checked label shows. */
  function reveal(root) {
    if (root.scrollWidth <= root.clientWidth) return;
    const label = root.querySelector(".segmented__input:checked")?.nextElementSibling;
    if (!label) return;
    const r = root.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    const pad = 8;
    if (l.left < r.left + pad) root.scrollLeft -= r.left + pad - l.left;
    else if (l.right > r.right - pad) root.scrollLeft += l.right - (r.right - pad);
  }

  const watched = new WeakSet();
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver((entries) => entries.forEach((e) => place(e.target)))
    : null;
  const initAll = () =>
    document.querySelectorAll("[data-segmented]").forEach((root) => {
      reveal(root);
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
    if (!root) return;
    reveal(root);
    place(root);
  });
})();
