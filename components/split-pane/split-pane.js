/*
 * Split pane: `[data-split-pane]` sets its `--split-start` custom property
 * (CSSOM, a percent) from `data-split-initial`, or the value stored under
 * `data-split-storage` in localStorage; `[data-split-separator]` changes
 * it by pointer drag (pointer capture), ← → / ↑ ↓ (2% a step, Shift 10%),
 * Home / End (min / max) and a double-click (back to the initial share).
 * `aria-valuenow` follows; a `split:change` event (`detail.value`) fires on
 * the root when the share changes.
 */
(() => {
  const ROOT = "[data-split-pane]";
  const num = (el, name, fallback) => {
    const v = Number(el.getAttribute(name));
    return Number.isFinite(v) && el.hasAttribute(name) ? v : fallback;
  };
  const clamp = (root, value) =>
    Math.min(num(root, "data-split-max", 80), Math.max(num(root, "data-split-min", 20), value));

  function stored(root) {
    const key = root.getAttribute("data-split-storage");
    if (!key) return null;
    try {
      const v = Number(localStorage.getItem(key));
      return v > 0 ? v : null;
    } catch {
      return null;
    }
  }

  function store(root, value) {
    const key = root.getAttribute("data-split-storage");
    if (!key) return;
    try {
      localStorage.setItem(key, String(Math.round(value * 10) / 10));
    } catch {
      // Storage unavailable: the position lasts for the page.
    }
  }

  function set(root, value, persist) {
    value = clamp(root, value);
    root.style.setProperty("--split-start", `${value}%`);
    root.querySelector("[data-split-separator]")?.setAttribute("aria-valuenow", String(Math.round(value)));
    if (persist) {
      store(root, value);
      root.dispatchEvent(new CustomEvent("split:change", { bubbles: true, detail: { value } }));
    }
  }

  const current = (root) =>
    parseFloat(root.style.getPropertyValue("--split-start")) || num(root, "data-split-initial", 50);

  function init(root) {
    if (root.hasAttribute("data-split-ready")) return;
    root.setAttribute("data-split-ready", "");
    set(root, stored(root) ?? num(root, "data-split-initial", 50), false);
  }

  const initAll = () => document.querySelectorAll(ROOT).forEach(init);

  const isVertical = (root) => root.classList.contains("split-pane--vertical");

  document.addEventListener("pointerdown", (event) => {
    const sep = event.target.closest?.("[data-split-separator]");
    if (!sep || event.button !== 0) return;
    const root = sep.closest(ROOT);
    if (!root) return;
    event.preventDefault();
    sep.setPointerCapture(event.pointerId);
    sep.classList.add("is-dragging");
    root.classList.add("is-dragging");
    const vertical = isVertical(root);
    const rtl = getComputedStyle(root).direction === "rtl";
    const box = root.getBoundingClientRect();
    const move = (e) => {
      if (e.pointerId !== event.pointerId) return;
      let pct;
      if (vertical) pct = ((e.clientY - box.top) / box.height) * 100;
      else {
        pct = ((e.clientX - box.left) / box.width) * 100;
        if (rtl) pct = 100 - pct;
      }
      set(root, pct, false);
    };
    const up = (e) => {
      if (e.pointerId !== event.pointerId) return;
      sep.removeEventListener("pointermove", move);
      sep.removeEventListener("pointerup", up);
      sep.removeEventListener("pointercancel", up);
      sep.classList.remove("is-dragging");
      root.classList.remove("is-dragging");
      set(root, current(root), true);
    };
    sep.addEventListener("pointermove", move);
    sep.addEventListener("pointerup", up);
    sep.addEventListener("pointercancel", up);
  });

  document.addEventListener("dblclick", (event) => {
    const sep = event.target.closest?.("[data-split-separator]");
    const root = sep?.closest(ROOT);
    if (!root) return;
    set(root, num(root, "data-split-initial", 50), true);
  });

  document.addEventListener("keydown", (event) => {
    const sep = event.target.closest?.("[data-split-separator]");
    const root = sep?.closest(ROOT);
    if (!root) return;
    const vertical = isVertical(root);
    const rtl = !vertical && getComputedStyle(root).direction === "rtl";
    const step = event.shiftKey ? 10 : 2;
    const grow = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const shrink = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    let next;
    if (event.key === grow) next = current(root) + step;
    else if (event.key === shrink) next = current(root) - step;
    else if (event.key === "Home") next = num(root, "data-split-min", 20);
    else if (event.key === "End") next = num(root, "data-split-max", 80);
    else if (event.key === "Enter") next = num(root, "data-split-initial", 50);
    else return;
    event.preventDefault();
    set(root, next, true);
  });

  document.addEventListener("rapid:swapped", initAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
