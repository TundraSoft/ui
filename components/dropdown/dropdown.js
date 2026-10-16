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
 *
 * Search (on unless `searchable: false`): `[data-dropdown-search]` filters
 * the panel's items — `[data-dropdown-item]`s, else its `<li>`s — by their
 * own label; a parent stays while a child matches, and a sublist that
 * holds a match opens for the search (and shuts again after). A panel with
 * no items hides the box. Opening focuses the box (not on a touch tap: a
 * phone keyboard would cover the menu); ↓ moves into the items, ↑/↓ walk
 * the visible ones, ↑ from the first returns to the box, and Enter in the
 * box takes the first match. Closing clears the search.
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

  const searchOf = (panel) => panel.querySelector("[data-dropdown-search]");
  function itemsOf(panel) {
    const body = panel.querySelector(".dropdown__body");
    if (!body) return [];
    const marked = body.querySelectorAll("[data-dropdown-item]");
    return Array.from(marked.length ? marked : body.querySelectorAll("li"));
  }
  /** An item's own label — a menu parent's button, not its whole sublist. */
  const labelOf = (item) =>
    (item.querySelector(":scope > a, :scope > button, :scope > .menu__link") ?? item).textContent.trim().toLowerCase();
  const visible = (el) => el.getClientRects().length > 0;
  /** The focusable controls of the visible items, in order. */
  const controlsOf = (panel) =>
    Array.from(panel.querySelectorAll(".dropdown__body a[href], .dropdown__body button:not([disabled])"))
      .filter(visible);

  function filter(panel, text) {
    const query = text.trim().toLowerCase();
    const items = itemsOf(panel);
    // Children before parents, so a parent knows whether a child matched.
    for (const item of items.slice().reverse()) {
      const childHit = items.some((other) => other !== item && item.contains(other) && !other.hidden);
      item.hidden = !(!query || labelOf(item).includes(query) || childHit);
    }
    // A parent that matched by its own label keeps its whole sublist.
    if (query) {
      items.filter((item) => !item.hidden && labelOf(item).includes(query)).forEach((item) => {
        items.forEach((other) => {
          if (item.contains(other)) other.hidden = false;
        });
      });
    }
    // Open the sublists that hold a match for the search; restore after.
    panel.querySelectorAll("[data-dropdown-opened]").forEach((list) => {
      if (query && list.closest("li:not([hidden])")) return;
      list.hidden = true;
      list.classList.remove("is-open");
      list.removeAttribute("data-dropdown-opened");
      panel.querySelector(`[data-toggle="#${CSS.escape(list.id)}"]`)?.setAttribute("aria-expanded", "false");
    });
    if (query) {
      panel.querySelectorAll(".dropdown__body li:not([hidden]) > ul[hidden]").forEach((list) => {
        if (!list.querySelector("li:not([hidden])")) return;
        list.hidden = false;
        list.classList.add("is-open");
        list.setAttribute("data-dropdown-opened", "");
        if (list.id) {
          panel.querySelector(`[data-toggle="#${CSS.escape(list.id)}"]`)?.setAttribute("aria-expanded", "true");
        }
      });
    }
    const empty = panel.querySelector("[data-dropdown-empty]");
    if (empty) empty.hidden = !query || items.some((item) => !item.hidden);
  }

  function reset(panel) {
    const box = searchOf(panel);
    if (!box) return;
    if (box.value) box.value = "";
    filter(panel, "");
    panel.querySelector(".dropdown__body")?.scrollTo?.(0, 0);
  }

  // Just opened: a fresh search, focused — or no box at all when there is
  // nothing in the panel to filter.
  function prepare(panel, event) {
    const box = searchOf(panel);
    if (!box) return;
    const wrap = box.closest(".dropdown__search") ?? box;
    wrap.hidden = itemsOf(panel).length === 0;
    if (wrap.hidden) return;
    reset(panel);
    if (event.pointerType !== "touch") box.focus({ preventScroll: true });
  }

  function close(panel, trigger) {
    reset(panel);
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
        if (!panel.classList.contains("dropdown__panel--fixed")) {
          place(panel, trigger);
          prepare(panel, event);
        }
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

  document.addEventListener("input", (event) => {
    if (!event.target.matches?.("[data-dropdown-search]")) return;
    const panel = event.target.closest(".dropdown__panel");
    if (panel) filter(panel, event.target.value);
  });

  // Arrows between the search box and the visible items; Enter in the box
  // takes the first match (and never submits a form around the dropdown).
  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
    const panel = event.target.closest?.(".dropdown__panel.is-open");
    if (!panel) return;
    const box = searchOf(panel);
    const controls = controlsOf(panel);
    if (event.target === box) {
      if (event.key === "ArrowUp") return;
      event.preventDefault();
      if (event.key === "Enter") {
        // The first match that is an item, not a parent's sublist toggle.
        if (box.value.trim()) (controls.find((c) => !c.hasAttribute("data-toggle")) ?? controls[0])?.click();
      } else controls[0]?.focus();
      return;
    }
    if (event.key === "Enter") return; // a focused link or button does its own thing
    const i = controls.indexOf(event.target);
    if (i < 0) return;
    event.preventDefault();
    const next = i + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) (box && visible(box) ? box : controls[controls.length - 1]).focus();
    else controls[next % controls.length].focus();
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
