/*
 * Tooltip: shows `.tooltip__content` of a `[data-tooltip]` after the
 * pointer rests on it (`data-tooltip-delay` ms, default 150) or at once
 * on focus; hides on leave, blur and Escape. A tap toggles it (touch has
 * no hover). While shown the bubble is position: fixed and placed by
 * shared/js/float.js on `data-tooltip-side` (top|bottom|start|end), flipped
 * when there is no room and re-placed on scroll/resize; it leaves through
 * the shared exit animation (uiMotion.exit). One tooltip at a time. Where the
 * browser has the Popover API the bubble shows in the top layer, because a
 * fixed element still paints inside its stacking context: under a sticky
 * table header, say, when its trigger sits in a sticky cell.
 */
(() => {
  const timers = new WeakMap();
  const stops = new WeakMap();
  let current = null;

  const bubbleOf = (root) => root.querySelector(":scope > .tooltip__content");
  const canRaise = typeof HTMLElement.prototype.showPopover === "function";
  const raise = (bubble) => {
    if (!canRaise) return;
    bubble.setAttribute("popover", "manual");
    if (!bubble.matches(":popover-open")) bubble.showPopover();
  };
  const lower = (bubble) => {
    if (canRaise && bubble.matches("[popover]:popover-open")) bubble.hidePopover();
  };
  const sideOf = (root) => {
    const s = root.getAttribute("data-tooltip-side") || "top";
    const rtl = getComputedStyle(root).direction === "rtl";
    if (s === "start") return rtl ? "right" : "left";
    if (s === "end") return rtl ? "left" : "right";
    return s;
  };

  function show(root) {
    const bubble = bubbleOf(root);
    if (!bubble || !globalThis.uiFloat) return;
    if (current && current !== root) hide(current, true);
    clearTimeout(timers.get(root));
    globalThis.uiMotion?.cancelExit(bubble);
    bubble.classList.add("is-open");
    raise(bubble);
    const anchor = root.firstElementChild === bubble ? root : root.firstElementChild ?? root;
    stops.get(root)?.();
    stops.set(root, globalThis.uiFloat.follow(anchor, bubble, { side: sideOf(root), align: "center", offset: 6 }));
    current = root;
  }

  function hide(root, now = false) {
    clearTimeout(timers.get(root));
    const bubble = bubbleOf(root);
    if (!bubble || !bubble.classList.contains("is-open")) return;
    const done = () => {
      lower(bubble);
      bubble.classList.remove("is-open");
      stops.get(root)?.();
      stops.delete(root);
      globalThis.uiFloat?.clear(bubble);
      if (current === root) current = null;
    };
    if (now || !globalThis.uiMotion) done();
    else globalThis.uiMotion.exit(bubble, done);
  }

  function scheduleShow(root) {
    clearTimeout(timers.get(root));
    const delay = Number(root.getAttribute("data-tooltip-delay") ?? 150) || 0;
    timers.set(root, setTimeout(() => show(root), delay));
  }

  document.addEventListener("pointerenter", (event) => {
    const root = event.target.closest?.("[data-tooltip]");
    if (root && event.pointerType !== "touch") scheduleShow(root);
  }, true);

  document.addEventListener("pointerleave", (event) => {
    const root = event.target.closest?.("[data-tooltip]");
    if (root && event.target === root) hide(root);
  }, true);

  document.addEventListener("focusin", (event) => {
    const root = event.target.closest?.("[data-tooltip]");
    if (root) show(root);
  });

  document.addEventListener("focusout", (event) => {
    const root = event.target.closest?.("[data-tooltip]");
    if (root && !root.contains(event.relatedTarget)) hide(root);
  });

  // Touch: no hover, so a tap on the trigger toggles the bubble.
  document.addEventListener("click", (event) => {
    const root = event.target.closest?.("[data-tooltip]");
    if (!root) {
      if (current) hide(current);
      return;
    }
    if (!event.pointerType && !(event.sourceCapabilities?.firesTouchEvents)) return;
    const bubble = bubbleOf(root);
    if (bubble?.classList.contains("is-open")) hide(root);
    else show(root);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !current) return;
    hide(current);
  });

  // A bubble whose trigger left the page (a swap) must not linger.
  document.addEventListener("rapid:swapped", () => {
    if (current && !current.isConnected) {
      stops.get(current)?.();
      current = null;
    }
  });
})();
