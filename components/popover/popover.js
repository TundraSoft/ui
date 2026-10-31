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
      const escaped = globalThis.uiFloat?.escape(trigger ?? pop, panel, {
        align: "center",
        offset: 8,
        onLeave: () => setOpen(pop, false),
      });
      if (escaped) return;
      // Keep it on screen: shifted sideways into the viewport, flipped
      // above the trigger when the room below runs out (shared/js/float.js).
      const fit = globalThis.uiFloat?.fit(panel, { anchor: trigger ?? pop, flip: true });
      if (fit && !fit.below) pop.classList.add("popover--above");
      return;
    }
    const hide = () => {
      panel.hidden = true;
      globalThis.uiFloat?.restore(panel);
      globalThis.uiFloat?.clear(panel);
      pop.classList.remove("popover--above");
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(panel, hide);
    else hide();
  }

  // Every open panel is fitted on load and after a swap (one rendered
  // `open` by the server never went through setOpen) and again across a
  // resize; a scroll is left alone (it is absolutely positioned, so it
  // moves with its trigger).
  function fitOpen() {
    document.querySelectorAll("[data-popover] .popover__panel:not([hidden], .float-escaped)").forEach((panel) => {
      const pop = panel.closest("[data-popover]");
      const fit = globalThis.uiFloat?.fit(panel, {
        anchor: pop.querySelector("[data-popover-trigger]") ?? pop,
        flip: true,
      });
      pop.classList.toggle("popover--above", !!fit && !fit.below);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fitOpen);
  else fitOpen();
  addEventListener("load", fitOpen);
  document.addEventListener("rapid:swapped", fitOpen);
  addEventListener("resize", fitOpen, { passive: true });

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
