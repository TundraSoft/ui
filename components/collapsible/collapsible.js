/*
 * Collapsible: opens and closes with a height animation (collapsible.css
 * transitions the panel's grid row 0fr → 1fr — no measuring), and in an
 * accordion ([data-accordion-group]) opening one closes the others. The
 * trigger is a plain [data-toggle] button, so without this script
 * shared/js/toggle.js still shows and hides the panel; this listener runs
 * in the capture phase and stops the event so the two never both act.
 */
(() => {
  const reduced = () => globalThis.uiMotion?.reduced() ?? false;

  function setOpen(trigger, panel, on) {
    trigger.setAttribute("aria-expanded", String(on));
    if (on) {
      panel.hidden = false;
      panel.classList.add("is-collapsed", "is-animating");
      // Start from 0fr, then let the transition carry it to 1fr.
      void panel.offsetHeight;
      panel.classList.add("is-open");
      panel.classList.remove("is-collapsed");
      settle(panel);
      return;
    }
    panel.classList.remove("is-open");
    panel.classList.add("is-collapsed", "is-animating");
    settle(panel, () => {
      panel.hidden = true;
    });
  }

  /** After the row transition (or at once under reduced motion). */
  function settle(panel, then) {
    const finish = () => {
      panel.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      panel.classList.remove("is-animating");
      if (panel.classList.contains("is-collapsed") && !panel.classList.contains("is-open")) then?.();
      else if (!panel.classList.contains("is-collapsed")) panel.classList.remove("is-collapsed");
    };
    const onEnd = (event) => {
      if (event.target === panel && event.propertyName === "grid-template-rows") finish();
    };
    if (reduced()) {
      finish();
      return;
    }
    panel.addEventListener("transitionend", onEnd);
    const timer = setTimeout(finish, 600);
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.(".collapsible__trigger[data-toggle]");
    if (!trigger) return;
    const panel = document.querySelector(trigger.getAttribute("data-toggle") ?? "");
    if (!panel || !panel.classList.contains("collapsible__panel")) return;
    event.stopPropagation();
    const open = trigger.getAttribute("aria-expanded") !== "true";
    const group = trigger.closest("[data-accordion-group]");
    if (open && group) {
      group.querySelectorAll('.collapsible__trigger[aria-expanded="true"]').forEach((other) => {
        if (other === trigger) return;
        const otherPanel = document.querySelector(other.getAttribute("data-toggle") ?? "");
        if (otherPanel) setOpen(other, otherPanel, false);
      });
    }
    setOpen(trigger, panel, open);
  }, true);
})();
