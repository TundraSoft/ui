/*
 * Floating panels that stay on screen. Two tools, both CSSOM-only (no
 * style attribute, so a strict CSP is fine):
 *
 * `uiFloat.fit(panel)` — for a panel the stylesheet already positions
 * (absolute, under or beside its trigger): measures it and, when it runs
 * off the viewport sideways, writes `--float-shift-x` (px) on it. The
 * panel's CSS applies that through `translate` (never `transform`, which
 * the enter/exit keyframes own). Returns the shift. `{ flip: true }` also
 * reports `below: false` when the panel would run off the bottom and the
 * space above the trigger is larger, so the caller can add its "above"
 * class; pass the trigger as `anchor` for that.
 *
 * `uiFloat.place(anchor, panel, opts)` — for a `position: fixed` panel:
 * puts it on `side` (bottom|top|left|right) of the anchor, aligned
 * start|center|end, `offset` px away; flips to the opposite side when
 * there is no room, shifts along the other axis to stay `gutter` px
 * inside the viewport, and sets `data-side` on the panel for an arrow.
 * `uiFloat.follow(anchor, panel, opts)` keeps placing it on scroll and
 * resize until the returned stop function is called.
 */
(() => {
  const GUTTER = 8;

  /**
   * The panel's box as laid out, not as its enter animation is drawing it
   * this frame (a scale from 98% would measure 2% small). The animation is
   * switched off for the measurement and starts afresh after it.
   */
  function measure(panel) {
    const prior = panel.style.animationName;
    panel.style.animationName = "none";
    const r = panel.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    if (prior) panel.style.animationName = prior;
    else panel.style.removeProperty("animation-name");
    return { r, w, h };
  }

  function fit(panel, { gutter = GUTTER, anchor, flip = false } = {}) {
    if (!panel) return { shift: 0, below: true };
    panel.style.setProperty("--float-shift-x", "0px");
    const { r } = measure(panel);
    const vw = document.documentElement.clientWidth;
    let shift = 0;
    if (r.right > vw - gutter) shift = vw - gutter - r.right;
    if (r.left + shift < gutter) shift = gutter - r.left;
    if (shift) panel.style.setProperty("--float-shift-x", `${Math.round(shift)}px`);
    else panel.style.removeProperty("--float-shift-x");
    let below = true;
    if (flip && anchor) {
      const a = anchor.getBoundingClientRect();
      const vh = document.documentElement.clientHeight;
      const roomBelow = vh - a.bottom;
      const roomAbove = a.top;
      if (r.height + gutter > roomBelow && roomAbove > roomBelow) below = false;
    }
    return { shift, below };
  }

  function place(anchor, panel, { side = "bottom", align = "center", offset = 8, gutter = GUTTER } = {}) {
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const { w, h } = measure(panel);
    const rtl = getComputedStyle(panel).direction === "rtl";
    const vertical = side === "top" || side === "bottom";

    let s = side;
    if (s === "bottom" && a.bottom + offset + h > vh - gutter && a.top - offset - h >= gutter) s = "top";
    else if (s === "top" && a.top - offset - h < gutter && a.bottom + offset + h <= vh - gutter) s = "bottom";
    else if (s === "right" && a.right + offset + w > vw - gutter && a.left - offset - w >= gutter) s = "left";
    else if (s === "left" && a.left - offset - w < gutter && a.right + offset + w <= vw - gutter) s = "right";

    let left;
    let top;
    if (vertical) {
      top = s === "bottom" ? a.bottom + offset : a.top - offset - h;
      const startEdge = rtl ? a.right - w : a.left;
      const endEdge = rtl ? a.left : a.right - w;
      left = align === "start" ? startEdge : align === "end" ? endEdge : a.left + a.width / 2 - w / 2;
      left = Math.max(gutter, Math.min(left, vw - gutter - w));
    } else {
      left = s === "right" ? a.right + offset : a.left - offset - w;
      top = align === "start" ? a.top : align === "end" ? a.bottom - h : a.top + a.height / 2 - h / 2;
      top = Math.max(gutter, Math.min(top, vh - gutter - h));
    }
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.setAttribute("data-side", s);
    // Where the anchor's centre falls along the panel, for an arrow.
    const centre = vertical ? a.left + a.width / 2 - left : a.top + a.height / 2 - top;
    panel.style.setProperty("--float-anchor", `${Math.round(centre)}px`);
    return s;
  }

  function follow(anchor, panel, opts) {
    const update = () => place(anchor, panel, opts);
    update();
    addEventListener("scroll", update, { capture: true, passive: true });
    addEventListener("resize", update, { passive: true });
    return () => {
      removeEventListener("scroll", update, { capture: true });
      removeEventListener("resize", update);
    };
  }

  function clear(panel) {
    if (!panel) return;
    panel.style.removeProperty("left");
    panel.style.removeProperty("top");
    panel.style.removeProperty("--float-shift-x");
    panel.style.removeProperty("--float-anchor");
    panel.removeAttribute("data-side");
  }

  globalThis.uiFloat = { fit, place, follow, clear };
})();
