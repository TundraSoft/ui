/*
 * Popover: toggle on [data-popover-trigger], dismiss on outside click or
 * Escape (scoped to the popover that has focus; Escape with focus
 * elsewhere closes them all). Focus returns to the trigger on close.
 */
(() => {
  function setOpen(pop, on) {
    const panel = pop.querySelector(".popover__panel");
    const trigger = pop.querySelector("[data-popover-trigger]");
    if (panel) panel.hidden = !on;
    if (trigger) trigger.setAttribute("aria-expanded", on ? "true" : "false");
  }

  const openPanels = () => document.querySelectorAll("[data-popover] .popover__panel:not([hidden])");

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-popover-trigger]");
    if (trigger) {
      const pop = trigger.closest("[data-popover]");
      const panel = pop?.querySelector(".popover__panel");
      if (panel) setOpen(pop, panel.hidden);
      return;
    }
    const inside = event.target.closest?.("[data-popover]");
    openPanels().forEach((panel) => {
      const pop = panel.closest("[data-popover]");
      if (pop !== inside) setOpen(pop, false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const own = event.target.closest?.("[data-popover]");
    const targets = own ? [own] : Array.from(openPanels()).map((p) => p.closest("[data-popover]"));
    let closed = false;
    targets.forEach((pop) => {
      const panel = pop.querySelector(".popover__panel");
      if (!panel || panel.hidden) return;
      setOpen(pop, false);
      pop.querySelector("[data-popover-trigger]")?.focus();
      closed = true;
    });
    if (closed) event.preventDefault();
  });
})();
