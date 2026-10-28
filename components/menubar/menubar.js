/*
 * Menubar: `[data-menubar]` holds `[data-menubar-button]`s, each with an
 * `aria-controls` panel. A click opens a panel (and closes any other, in
 * this bar or another); while one is open, hovering another button
 * switches to it. Keys on a button: ← → move (and switch an open menu),
 * ↓ / Enter / Space open with focus on the first item, Home / End jump.
 * In a panel: ↑ ↓ walk the items, ← → switch to the neighbouring menu,
 * Escape closes and returns focus to the button, Tab closes. An outside
 * press or a pick closes. Panels are fixed, placed under their button by
 * uiFloat.follow (re-placed on scroll, flipped above when there is no
 * room below, kept on screen) and exit through uiMotion.exit. Roving
 * tabindex: one button in the bar is tabbable.
 */
(() => {
  let openButton = null;
  let stopFollow = null;

  const panelOf = (button) => document.getElementById(button.getAttribute("aria-controls") ?? "");
  const buttonsOf = (bar) =>
    Array.from(bar.querySelectorAll("[data-menubar-button]")).filter((b) => b.getAttribute("aria-disabled") !== "true");
  const itemsOf = (panel) =>
    Array.from(panel.querySelectorAll("a[href], button:not([disabled])")).filter((el) =>
      el.getClientRects().length > 0
    );

  function rove(bar, button) {
    bar.querySelectorAll("[data-menubar-button]").forEach((b) => b.setAttribute("tabindex", b === button ? "0" : "-1"));
  }

  function close(restoreFocus) {
    const button = openButton;
    if (!button) return;
    openButton = null;
    stopFollow?.();
    stopFollow = null;
    const panel = panelOf(button);
    button.setAttribute("aria-expanded", "false");
    if (panel) {
      const hide = () => {
        panel.hidden = true;
        globalThis.uiFloat?.clear(panel);
      };
      if (globalThis.uiMotion) globalThis.uiMotion.exit(panel, hide);
      else hide();
    }
    if (restoreFocus) button.focus({ preventScroll: true });
  }

  function open(button, focusItem) {
    if (openButton && openButton !== button) close(false);
    const panel = panelOf(button);
    if (!panel) return;
    openButton = button;
    globalThis.uiMotion?.cancelExit(panel);
    button.setAttribute("aria-expanded", "true");
    rove(button.closest("[data-menubar]"), button);
    panel.hidden = false;
    panel.querySelectorAll("ul:not([role]), li:not([role])").forEach((el) => el.setAttribute("role", "none"));
    panel.querySelectorAll("a[href], button").forEach((el) => {
      if (!el.hasAttribute("role")) el.setAttribute("role", "menuitem");
      el.setAttribute("tabindex", "-1");
    });
    if (globalThis.uiFloat) {
      stopFollow = globalThis.uiFloat.follow(button, panel, { side: "bottom", align: "start", offset: 4 });
    }
    if (focusItem) {
      const items = itemsOf(panel);
      (focusItem === "last" ? items[items.length - 1] : items[0])?.focus({ preventScroll: true });
    }
  }

  function neighbour(button, dir) {
    const list = buttonsOf(button.closest("[data-menubar]"));
    const i = list.indexOf(button);
    return list[(i + dir + list.length) % list.length];
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-menubar-button]");
    if (button) {
      if (button.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      if (openButton === button) close(true);
      else open(button, false);
      return;
    }
    if (!openButton) return;
    const panel = panelOf(openButton);
    if (panel?.contains(event.target)) {
      const item = event.target.closest("a[href], button");
      if (item && !item.hasAttribute("data-toggle")) close(false);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!openButton) return;
    const bar = openButton.closest("[data-menubar]");
    if (bar?.contains(event.target)) return;
    close(false);
  });

  document.addEventListener("pointerover", (event) => {
    if (!openButton) return;
    const button = event.target.closest?.("[data-menubar-button]");
    if (!button || button === openButton || button.getAttribute("aria-disabled") === "true") return;
    if (button.closest("[data-menubar]") !== openButton.closest("[data-menubar]")) return;
    open(button, false);
  });

  document.addEventListener("keydown", (event) => {
    const button = event.target.closest?.("[data-menubar-button]");
    if (button) {
      const bar = button.closest("[data-menubar]");
      let next;
      switch (event.key) {
        case "ArrowRight":
          next = neighbour(button, 1);
          break;
        case "ArrowLeft":
          next = neighbour(button, -1);
          break;
        case "Home":
          next = buttonsOf(bar)[0];
          break;
        case "End":
          next = buttonsOf(bar).at(-1);
          break;
        case "ArrowDown":
        case "Enter":
        case " ":
          event.preventDefault();
          if (button.getAttribute("aria-disabled") !== "true") open(button, "first");
          return;
        case "ArrowUp":
          event.preventDefault();
          if (button.getAttribute("aria-disabled") !== "true") open(button, "last");
          return;
        case "Escape":
          if (openButton) {
            event.preventDefault();
            event.stopPropagation();
            close(true);
          }
          return;
        default:
          return;
      }
      if (!next) return;
      event.preventDefault();
      rove(bar, next);
      next.focus({ preventScroll: true });
      if (openButton && openButton !== next) open(next, false);
      return;
    }
    if (!openButton) return;
    const panel = panelOf(openButton);
    if (!panel?.contains(event.target)) return;
    const items = itemsOf(panel);
    const i = items.indexOf(event.target);
    let next;
    switch (event.key) {
      case "ArrowDown":
        next = items[(i + 1) % items.length];
        break;
      case "ArrowUp":
        next = items[(i - 1 + items.length) % items.length];
        break;
      case "Home":
        next = items[0];
        break;
      case "End":
        next = items.at(-1);
        break;
      case "ArrowRight":
      case "ArrowLeft": {
        event.preventDefault();
        const to = neighbour(openButton, event.key === "ArrowRight" ? 1 : -1);
        rove(to.closest("[data-menubar]"), to);
        open(to, "first");
        return;
      }
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
      default:
        return;
    }
    if (!next) return;
    event.preventDefault();
    next.focus({ preventScroll: true });
  });

  // The bar itself scrolling (a phone) moves the button away: close.
  document.addEventListener("scroll", (event) => {
    if (openButton && event.target instanceof Element && event.target.hasAttribute("data-menubar")) close(false);
  }, { capture: true, passive: true });
})();
