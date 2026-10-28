/*
 * Popover: toggle on [data-popover-trigger], dismiss on outside click or
 * Escape (scoped to the popover that has focus; Escape with focus
 * elsewhere closes them all). Focus returns to the trigger on close.
 */
(() => {
  function setOpen(pop, on) {
    const panel = pop.querySelector(".popover__panel");
    const trigger = pop.querySelector("[data-popover-trigger]");
    if (trigger) trigger.setAttribute("aria-expanded", on ? "true" : "false");
    if (!panel) return;
    if (on) {
      globalThis.uiMotion?.cancelExit(panel);
      pop.classList.remove("popover--above");
      panel.hidden = false;
      // Keep it on screen: shifted sideways into the viewport, flipped
      // above the trigger when the room below runs out (shared/js/float.js).
      const fit = globalThis.uiFloat?.fit(panel, { anchor: trigger ?? pop, flip: true });
      if (fit && !fit.below) pop.classList.add("popover--above");
      return;
    }
    const hide = () => {
      panel.hidden = true;
      globalThis.uiFloat?.clear(panel);
      pop.classList.remove("popover--above");
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(panel, hide);
    else hide();
  }

  // A panel open across a resize is re-fitted; a scroll is left alone
  // (it is absolutely positioned, so it moves with its trigger).
  addEventListener("resize", () => {
    document.querySelectorAll("[data-popover] .popover__panel:not([hidden])").forEach((panel) => {
      const pop = panel.closest("[data-popover]");
      const fit = globalThis.uiFloat?.fit(panel, {
        anchor: pop.querySelector("[data-popover-trigger]") ?? pop,
        flip: true,
      });
      pop.classList.toggle("popover--above", !!fit && !fit.below);
    });
  }, { passive: true });

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
