/* Generic dismiss: a `[data-dismiss]` button removes its closest
 * `[data-dismissible]` ancestor (used by both alert and toast). */
(() => {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-dismiss]");
    if (!trigger) return;
    trigger.closest("[data-dismissible]")?.remove();
  });
})();
