/*
 * Dropdown: [data-toggle] (shared/js/toggle.js) opens the panel; this
 * closes it on outside click, on choosing an item (a link, button or
 * rAPId action inside the panel), and on Escape — scoped to the dropdown
 * that has focus, falling back to all open ones. Focus returns to the
 * trigger on Escape.
 *
 * Inside a scroll container (a table body, a card with overflow) an
 * absolutely-positioned panel gets clipped, so the panel is switched to
 * fixed positioning at the trigger's viewport rect (set through the
 * CSSOM, which strict CSP allows — unlike a style *attribute*). A scroll
 * or resize re-places it while the trigger is still inside its container's
 * box, and closes it once the trigger scrolls out of view. (Closing on any
 * scroll made a keyboard user lose the menu: `html:focus-within` scrolls
 * smoothly, so the scroll from tabbing to the trigger is still running
 * when Enter opens it.)
 */
(() => {
  const openPanels = () => document.querySelectorAll(".dropdown__panel.is-open");
  const triggerFor = (panel) => document.querySelector(`[data-toggle="#${CSS.escape(panel.id)}"]`);
  const CLIPPERS = ".data-table__scroll, [data-dropdown-clip]";

  function place(panel, trigger) {
    if (!trigger?.closest(CLIPPERS)) return;
    const r = trigger.getBoundingClientRect();
    panel.classList.add("dropdown__panel--fixed");
    const width = panel.offsetWidth;
    const alignEnd = panel.classList.contains("dropdown__panel--end");
    let left = alignEnd ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, innerWidth - width - 8));
    let top = r.bottom + 4;
    if (top + panel.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - panel.offsetHeight - 4);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function close(panel, trigger) {
    panel.setAttribute("hidden", "");
    panel.classList.remove("is-open", "dropdown__panel--fixed");
    panel.style.removeProperty("left");
    panel.style.removeProperty("top");
    trigger?.setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", (event) => {
    openPanels().forEach((panel) => {
      const trigger = triggerFor(panel);
      if (trigger?.contains(event.target)) {
        // toggle.js just opened it (its listener runs first) — place it.
        if (!panel.classList.contains("dropdown__panel--fixed")) place(panel, trigger);
        return;
      }
      if (panel.contains(event.target)) {
        // A choice was made — close, unless the click was on something
        // that keeps the panel useful (a nested toggle, a form field).
        const item = event.target.closest("a[href], button, [data-action]");
        if (!item || item.hasAttribute("data-toggle")) return;
      }
      close(panel, trigger);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const own = event.target.closest?.(".dropdown");
    const panels = own ? own.querySelectorAll(".dropdown__panel.is-open") : openPanels();
    let closed = false;
    panels.forEach((panel) => {
      const trigger = triggerFor(panel);
      close(panel, trigger);
      trigger?.focus();
      closed = true;
    });
    if (closed) event.preventDefault();
  });

  // Still inside its container's box (the viewport does not matter: a
  // panel that follows an off-screen trigger is off-screen too, and the
  // page may be mid-scroll towards a trigger that was just focused).
  const inView = (trigger) => {
    const clip = trigger.closest(CLIPPERS)?.getBoundingClientRect();
    const r = trigger.getBoundingClientRect();
    return !clip || (r.bottom > clip.top && r.top < clip.bottom && r.right > clip.left && r.left < clip.right);
  };
  const followFixed = () => {
    document.querySelectorAll(".dropdown__panel--fixed.is-open").forEach((panel) => {
      const trigger = triggerFor(panel);
      if (trigger && inView(trigger)) place(panel, trigger);
      else close(panel, trigger);
    });
  };
  addEventListener("scroll", followFixed, { capture: true, passive: true });
  addEventListener("resize", followFixed, { passive: true });
})();
