/* Generic dismiss: a `[data-dismiss]` button removes its closest
 * `[data-dismissible]` ancestor (used by alert, toast and banner) — after
 * the element's exit animation when its stylesheet has an `.is-closing`
 * rule (shared/js/motion.js), at once when it has none. */
(() => {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-dismiss]");
    if (!trigger) return;
    const target = trigger.closest("[data-dismissible]");
    if (!target) return;
    if (globalThis.uiMotion) globalThis.uiMotion.exit(target, () => target.remove());
    else target.remove();
  });
})();
