/*
 * Collapsible: a native <details class="collapsible"> — its <summary>
 * opens and closes it with no script, and an accordion's rows share a
 * `name`, which modern browsers make exclusive natively. This script
 * adds the motion: a summary click is taken over so the panel's grid row
 * animates 0fr → 1fr (collapsible.css — no measuring) and `open` comes
 * off only once a closing row has finished. To animate the row an
 * accordion closes too, the script moves each row's `name` into
 * `data-collapsible-name` and keeps the group exclusive itself (also when
 * the browser opens a row on its own: find-in-page, a fragment inside it).
 *
 * A row is a deep-link target: when the address hash names a row's id (or
 * anything inside one), the row — and every row around it — opens, the
 * rest of its accordion closes, and a target that was hidden is scrolled
 * into view (under scroll-padding-top). On arrival this runs as the script
 * loads and again at DOMContentLoaded, with no transition, so the page
 * paints already open; hashchange and a click on a link to the current
 * hash do the same. Without the script the anchor still lands on the row.
 */
(() => {
  const reduced = () => globalThis.uiMotion?.reduced() ?? false;
  const ROW = "details.collapsible";

  const panelOf = (row) => row.querySelector(":scope > .collapsible__panel");
  const groupOf = (row) => row.closest("[data-accordion-group]");
  /** The other open rows of the row's own accordion. */
  const siblings = (row) => {
    const group = groupOf(row);
    if (!group) return [];
    return [...group.querySelectorAll(`${ROW}[open]`)].filter((other) => other !== row && groupOf(other) === group);
  };

  /** Moves native exclusivity into the script, so a closing row can animate. */
  function adopt(scope = document) {
    scope.querySelectorAll(`${ROW}[name]`).forEach((row) => {
      row.setAttribute("data-collapsible-name", row.getAttribute("name"));
      row.removeAttribute("name");
    });
  }

  function setOpen(row, on) {
    const panel = panelOf(row);
    if (!panel) {
      row.open = on;
      return;
    }
    if (on) {
      row.classList.remove("is-closing");
      row.open = true;
      panel.classList.add("is-collapsed", "is-animating");
      // Start from 0fr, then let the transition carry it to 1fr.
      void panel.offsetHeight;
      panel.classList.remove("is-collapsed");
      settle(row, panel);
      return;
    }
    row.classList.add("is-closing");
    panel.classList.add("is-collapsed", "is-animating");
    settle(row, panel, () => {
      row.open = false;
      row.classList.remove("is-closing");
      panel.classList.remove("is-collapsed");
    });
  }

  /** After the row transition (or at once under reduced motion). */
  function settle(row, panel, then) {
    const closing = row.classList.contains("is-closing");
    const finish = () => {
      panel.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      panel.classList.remove("is-animating");
      // Only if nothing reversed the row meanwhile.
      if (closing && row.classList.contains("is-closing")) then?.();
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

  /** Opens or closes a row at once: no transition, nothing left animating. */
  function setNow(row, on) {
    row.classList.remove("is-closing");
    panelOf(row)?.classList.remove("is-collapsed", "is-animating");
    row.open = on;
  }

  document.addEventListener("click", (event) => {
    const summary = event.target.closest?.("summary.collapsible__trigger");
    const row = summary?.parentElement;
    if (!row?.matches(ROW)) return;
    // A link or control inside the summary keeps its own click (natively
    // it does not toggle the row either).
    const control = event.target.closest("a, button, input, select, textarea, label");
    if (control && summary.contains(control)) return;
    event.preventDefault();
    const open = !row.open || row.classList.contains("is-closing");
    if (open) siblings(row).forEach((other) => setOpen(other, false));
    setOpen(row, open);
  });

  // A row the browser opened itself (find-in-page, a fragment inside it, or
  // native `name` before adopt ran) still closes the rest of its group.
  document.addEventListener("toggle", (event) => {
    const row = event.target;
    if (!row.matches?.(ROW) || !row.open || row.classList.contains("is-closing")) return;
    siblings(row).forEach((other) => {
      if (!other.classList.contains("is-closing")) setNow(other, false);
    });
  }, true);

  function reveal() {
    let target = null;
    try {
      target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    } catch {
      target = null;
    }
    if (!target) return;
    // A target inside a closed row's panel could not be scrolled to; a row
    // itself is always visible, so the browser's own scroll stands.
    let hidden = false;
    for (let row = target.closest(ROW); row; row = row.parentElement?.closest(ROW)) {
      const shut = !row.open || row.classList.contains("is-closing");
      if (shut && panelOf(row)?.contains(target)) hidden = true;
      siblings(row).forEach((other) => {
        if (!other.contains(target)) setNow(other, false);
      });
      if (shut) setNow(row, true);
    }
    if (hidden) target.scrollIntoView({ block: "start", behavior: "instant" });
  }

  const init = () => {
    adopt();
    reveal();
  };

  addEventListener("hashchange", reveal);
  // A link to the hash already in the address fires no hashchange.
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (link && link.hash && link.hash === location.hash) setTimeout(reveal);
  });
  document.addEventListener("rapid:swapped", () => adopt());
  // At once (a deferred bundle, or one at the end of <body>, already has
  // the rows) and again when parsing ends, for a bundle in <head>.
  init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
})();
