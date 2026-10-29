/*
 * Context menu: an element with `data-context-menu="#id"` opens that
 * `[data-context-menu-panel]` at the pointer on `contextmenu` (right-click,
 * or the platform's long press), after a 600ms press that does not move on
 * touch, and at the element itself on Shift+F10 or the Menu key. The panel
 * is placed through shared/js/float.js (flips above when there is no room
 * below, shifts sideways to stay on screen), its links and buttons become
 * `role="menuitem"`s walked by the arrow keys, Home and End; a pick,
 * Escape, an outside press, a scroll or a resize closes it (uiMotion.exit,
 * then hidden) and focus returns to the element it opened on.
 */
(() => {
  const PRESS_MS = 600;
  const MOVE_PX = 10;
  let openPanel = null;
  let opener = null;
  let press = null;
  let pressedAt = 0;

  const panelFor = (el) => {
    const sel = el.getAttribute("data-context-menu") ?? "";
    const panel = sel && sel !== "#" ? document.querySelector(sel) : null;
    return panel?.hasAttribute("data-context-menu-panel") ? panel : null;
  };

  const items = (panel) =>
    Array.from(panel.querySelectorAll("a[href], button:not([disabled])")).filter((el) =>
      el.getClientRects().length > 0
    );

  function close(restoreFocus) {
    const panel = openPanel;
    if (!panel) return;
    const from = opener;
    openPanel = null;
    opener = null;
    const hide = () => {
      panel.hidden = true;
      globalThis.uiFloat?.clear(panel);
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(panel, hide);
    else hide();
    if (restoreFocus && from?.isConnected) from.focus({ preventScroll: true });
  }

  /** Open `panel` for `el` at a point, or at the element's box. */
  function open(el, panel, x, y) {
    if (openPanel && openPanel !== panel) close(false);
    globalThis.uiMotion?.cancelExit(panel);
    openPanel = panel;
    opener = el;
    // A Menu's lists are structure only inside a role="menu".
    panel.querySelectorAll("ul:not([role]), li:not([role])").forEach((el) => el.setAttribute("role", "none"));
    items(panel).forEach((item) => {
      if (!item.hasAttribute("role")) item.setAttribute("role", "menuitem");
      item.setAttribute("tabindex", "-1");
    });
    panel.hidden = false;
    const anchor = x === undefined ? el : { getBoundingClientRect: () => new DOMRect(x, y, 0, 0) };
    if (globalThis.uiFloat) globalThis.uiFloat.place(anchor, panel, { side: "bottom", align: "start", offset: 2 });
    (items(panel)[0] ?? panel).focus({ preventScroll: true });
  }

  document.addEventListener("contextmenu", (event) => {
    const el = event.target.closest?.("[data-context-menu]");
    if (!el) return;
    const panel = panelFor(el);
    if (!panel) return;
    event.preventDefault();
    // A long press already opened it (and some platforms fire this after).
    if (Date.now() - pressedAt < 500) return;
    open(el, panel, event.clientX, event.clientY);
  });

  // Touch: a press that stays put for a moment.
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    const el = event.target.closest?.("[data-context-menu]");
    const panel = el && panelFor(el);
    if (!panel) return;
    const { clientX: x, clientY: y } = event;
    press = {
      x,
      y,
      timer: setTimeout(() => {
        press = null;
        pressedAt = Date.now();
        open(el, panel, x, y);
      }, PRESS_MS),
    };
  }, { passive: true });
  const cancelPress = (event) => {
    if (!press) return;
    if (event.type === "pointermove" && Math.hypot(event.clientX - press.x, event.clientY - press.y) < MOVE_PX) return;
    clearTimeout(press.timer);
    press = null;
  };
  document.addEventListener("pointermove", cancelPress, { passive: true });
  document.addEventListener("pointerup", cancelPress, { passive: true });
  document.addEventListener("pointercancel", cancelPress, { passive: true });

  document.addEventListener("keydown", (event) => {
    // Open from the keyboard, at the element.
    if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      const el = event.target.closest?.("[data-context-menu]");
      const panel = el && panelFor(el);
      if (!panel) return;
      event.preventDefault();
      open(el, panel);
      return;
    }
    if (!openPanel) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (!openPanel.contains(event.target)) return;
    const list = items(openPanel);
    const i = list.indexOf(event.target);
    let next;
    if (event.key === "ArrowDown") next = list[(i + 1) % list.length];
    else if (event.key === "ArrowUp") next = list[(i - 1 + list.length) % list.length];
    else if (event.key === "Home") next = list[0];
    else if (event.key === "End") next = list[list.length - 1];
    else if (event.key === "Tab") {
      close(true);
      return;
    }
    if (!next) return;
    event.preventDefault();
    next.focus({ preventScroll: true });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!openPanel || openPanel.contains(event.target)) return;
    close(false);
  });

  document.addEventListener("click", (event) => {
    if (!openPanel || !openPanel.contains(event.target)) return;
    const item = event.target.closest("a[href], button");
    if (item && !item.hasAttribute("data-toggle")) close(true);
  });

  addEventListener("scroll", () => openPanel && close(false), { capture: true, passive: true });
  addEventListener("resize", () => openPanel && close(false), { passive: true });
})();
