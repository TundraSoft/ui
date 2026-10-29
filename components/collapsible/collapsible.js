/*
 * Collapsible: opens and closes with a height animation (collapsible.css
 * transitions the panel's grid row 0fr → 1fr — no measuring), and in an
 * accordion ([data-accordion-group]) opening one closes the others. The
 * trigger is a plain [data-toggle] button, so without this script
 * shared/js/toggle.js still shows and hides the panel; this listener runs
 * in the capture phase and stops the event so the two never both act.
 *
 * A row is a deep-link target: when the address hash names a row's id (or
 * anything inside one), the row — and every row around it — opens, the
 * rest of its accordion closes, and a target that was hidden is scrolled
 * into view (under scroll-padding-top). On arrival this runs as the script
 * loads and again at DOMContentLoaded, with no transition, so the page
 * paints already open; hashchange and a click on a link to the current
 * hash do the same. Without the script the anchor still lands on the
 * closed row.
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

  const parts = (row) => {
    const trigger = row.querySelector(":scope > .collapsible__heading > .collapsible__trigger[data-toggle]");
    const panel = trigger && document.querySelector(trigger.getAttribute("data-toggle") ?? "");
    return trigger && panel?.classList.contains("collapsible__panel") ? { trigger, panel } : null;
  };

  /** Opens or closes a row at once: no transition, nothing left animating. */
  function setNow(trigger, panel, on) {
    trigger.setAttribute("aria-expanded", String(on));
    panel.hidden = !on;
    panel.classList.remove("is-animating", on ? "is-collapsed" : "is-open");
    panel.classList.add(on ? "is-open" : "is-collapsed");
  }

  function reveal() {
    let target = null;
    try {
      target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    } catch {
      target = null;
    }
    if (!target) return;
    const hidden = !!target.closest(".collapsible__panel[hidden]");
    for (let row = target.closest(".collapsible"); row; row = row.parentElement?.closest(".collapsible")) {
      const own = parts(row);
      if (!own) continue;
      const group = row.closest("[data-accordion-group]");
      group?.querySelectorAll('.collapsible__trigger[aria-expanded="true"]').forEach((other) => {
        if (other === own.trigger || other.closest("[data-accordion-group]") !== group) return;
        const otherPanel = document.querySelector(other.getAttribute("data-toggle") ?? "");
        if (otherPanel && !otherPanel.contains(target)) setNow(other, otherPanel, false);
      });
      if (own.trigger.getAttribute("aria-expanded") !== "true" || own.panel.hidden) {
        setNow(own.trigger, own.panel, true);
      }
    }
    if (hidden) target.scrollIntoView({ block: "start", behavior: "instant" });
  }

  addEventListener("hashchange", reveal);
  // A link to the hash already in the address fires no hashchange.
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (link && link.hash && link.hash === location.hash) setTimeout(reveal);
  });
  // At once (a deferred bundle, or one at the end of <body>, already has
  // the rows) and again when parsing ends, for a bundle in <head>.
  reveal();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reveal);

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
