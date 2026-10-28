/*
 * Colour picker ([data-color-picker]): the panel's square, hue and alpha
 * sliders, text field and presets all edit one HSV + alpha state; every
 * change paints the swatch, thumb and tracks through CSSOM custom
 * properties (--cp-hue, --cp-color, --cp-x, --cp-y), writes the native
 * <input type="color"> (#rrggbb, `change` fired on it), fills the hidden
 * input a non-hex `format` or `alpha` needs, updates the contrast ratio
 * against the panel's surface and fires `color-picker:change` on the root
 * (detail: { hex, rgb, hsl, alpha, value }). The square takes pointer drags
 * and arrow keys (Shift: ten steps). The trigger toggles the panel; it is
 * fitted to the viewport (shared/js/float.js), closes on outside click or
 * Escape, and focus returns to the trigger.
 */
(() => {
  const state = new WeakMap();

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

  function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    const [r, g, b] = h < 60
      ? [c, x, 0]
      : h < 120
      ? [x, c, 0]
      : h < 180
      ? [0, c, x]
      : h < 240
      ? [0, x, c]
      : h < 300
      ? [x, 0, c]
      : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return [h, max ? d / max : 0, max];
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
    }
    return [h, s * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] = h < 60
      ? [c, x, 0]
      : h < 120
      ? [x, c, 0]
      : h < 180
      ? [0, c, x]
      : h < 240
      ? [0, x, c]
      : h < 300
      ? [x, 0, c]
      : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  /** Any of #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), hsla() → { r, g, b, a } or null. */
  function parse(text) {
    const t = String(text ?? "").trim().toLowerCase();
    let m = t.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (m) {
      let h = m[1];
      if (h.length <= 4) h = h.split("").map((ch) => ch + ch).join("");
      const n = parseInt(h.slice(0, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
      return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a };
    }
    m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: alphaOf(m[4]) };
    m = t.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      const [r, g, b] = hslToRgb(+m[1] % 360, +m[2], +m[3]);
      return { r, g, b, a: alphaOf(m[4]) };
    }
    return null;
  }

  const alphaOf = (s) => s === undefined ? 1 : s.endsWith("%") ? clamp(parseFloat(s) / 100, 0, 1) : clamp(+s, 0, 1);

  const r = (n) => Math.round(n);
  const r1 = (n) => Math.round(n * 10) / 10;

  function formats(st) {
    const [R, G, B] = hsvToRgb(st.h, st.s, st.v);
    const hex = `#${hex2(R)}${hex2(G)}${hex2(B)}`;
    const a = st.alpha ? st.a : 1;
    const hexA = st.alpha ? `${hex}${hex2(a * 255)}` : hex;
    const rgb = st.alpha ? `rgb(${r(R)} ${r(G)} ${r(B)} / ${r1(a)})` : `rgb(${r(R)} ${r(G)} ${r(B)})`;
    const [H, S, L] = rgbToHsl(R, G, B);
    const hsl = st.alpha ? `hsl(${r(H)} ${r(S)}% ${r(L)}% / ${r1(a)})` : `hsl(${r(H)} ${r(S)}% ${r(L)}%)`;
    const value = st.format === "rgb" ? rgb : st.format === "hsl" ? hsl : hexA;
    return { hex, hexA, rgb, hsl, value, R, G, B, a };
  }

  function luminance(R, G, B) {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(R) + 0.7152 * f(G) + 0.0722 * f(B);
  }

  function contrast(root, R, G, B, a) {
    const surface = parse(getComputedStyle(root.querySelector(".color-picker__panel") ?? root).backgroundColor) ??
      { r: 255, g: 255, b: 255 };
    // Composite a translucent colour over the surface first.
    const cr = R * a + surface.r * (1 - a);
    const cg = G * a + surface.g * (1 - a);
    const cb = B * a + surface.b * (1 - a);
    const l1 = luminance(cr, cg, cb);
    const l2 = luminance(surface.r, surface.g, surface.b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function paint(root, { typing = false, notify = true } = {}) {
    const st = state.get(root);
    const f = formats(st);
    root.style.setProperty("--cp-hue", String(r(st.h)));
    root.style.setProperty("--cp-color", f.hexA);
    const area = root.querySelector("[data-color-picker-area]");
    if (area) {
      area.style.setProperty("--cp-x", `${st.s * 100}%`);
      area.style.setProperty("--cp-y", `${(1 - st.v) * 100}%`);
      area.setAttribute("aria-valuenow", String(r(st.v * 100)));
      area.setAttribute("aria-valuetext", `Saturation ${r(st.s * 100)}%, brightness ${r(st.v * 100)}%`);
    }
    const hue = root.querySelector("[data-color-picker-hue]");
    if (hue && document.activeElement !== hue) hue.value = String(r(st.h));
    const alpha = root.querySelector("[data-color-picker-alpha]");
    if (alpha && document.activeElement !== alpha) alpha.value = String(r(st.a * 100));
    const field = root.querySelector("[data-color-picker-field]");
    if (field && !typing) field.value = f.value;
    const text = root.querySelector("[data-color-picker-text]");
    if (text) text.textContent = f.value;
    const ratio = root.querySelector("[data-color-picker-contrast]");
    if (ratio) {
      const c = contrast(root, f.R, f.G, f.B, f.a);
      ratio.textContent = `${c.toFixed(2)}:1`;
      ratio.setAttribute("data-pass", c >= 4.5 ? "aa" : c >= 3 ? "large" : "fail");
    }
    root.querySelectorAll("[data-color-picker-preset]").forEach((btn) => {
      const p = parse(btn.getAttribute("data-color"));
      const same = p && r(p.r) === r(f.R) && r(p.g) === r(f.G) && r(p.b) === r(f.B);
      btn.setAttribute("aria-pressed", same ? "true" : "false");
    });
    root.setAttribute("data-color", f.value);
    const native = root.querySelector(".color-picker__native");
    const hidden = root.querySelector("[data-color-picker-value]");
    if (hidden) hidden.value = f.value;
    if (native && native.value !== f.hex) {
      native.value = f.hex;
      if (notify) native.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (notify && hidden) hidden.dispatchEvent(new Event("change", { bubbles: true }));
    if (notify) {
      root.dispatchEvent(
        new CustomEvent("color-picker:change", {
          bubbles: true,
          detail: { hex: f.hexA, rgb: f.rgb, hsl: f.hsl, alpha: f.a, value: f.value },
        }),
      );
    }
  }

  function setColor(root, parsed, opts) {
    const st = state.get(root);
    const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
    // A grey has no hue of its own: keep the one on the slider.
    if (s > 0 && v > 0) st.h = h;
    st.s = s;
    st.v = v;
    if (st.alpha) st.a = parsed.a;
    paint(root, opts);
  }

  function setup(root) {
    if (state.has(root)) return;
    const format = root.getAttribute("data-format") || "hex";
    const alpha = root.hasAttribute("data-alpha");
    const parsed = parse(root.getAttribute("data-color")) ?? { r: 59, g: 130, b: 246, a: 1 };
    const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
    state.set(root, { h, s, v, a: alpha ? parsed.a : 1, alpha, format });
    const native = root.querySelector(".color-picker__native");
    // A non-hex format or an alpha channel cannot ride the native input:
    // move the name to a hidden input the script keeps filled.
    if (native?.name && (format !== "hex" || alpha)) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = native.name;
      hidden.setAttribute("data-color-picker-value", "");
      native.removeAttribute("name");
      native.after(hidden);
    }
    root.querySelectorAll("[data-color-picker-preset]").forEach((btn) => {
      const p = parse(btn.getAttribute("data-color"));
      if (p) btn.style.setProperty("--cp-preset", `rgb(${r(p.r)} ${r(p.g)} ${r(p.b)} / ${p.a})`);
    });
    paint(root, { notify: false });
  }

  /* ---------------------------------------------------- open / close */
  const rootOf = (el) => el?.closest?.("[data-color-picker]");
  const panelOf = (root) => root.querySelector(".color-picker__panel");
  const triggerOf = (root) => root.querySelector("[data-color-picker-trigger]");
  const isOpen = (root) => !panelOf(root)?.hidden && !root.classList.contains("color-picker--inline");

  function open(root) {
    const panel = panelOf(root);
    const trigger = triggerOf(root);
    if (!panel || !trigger) return;
    globalThis.uiMotion?.cancelExit(panel);
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    root.classList.remove("color-picker--above");
    const fit = globalThis.uiFloat?.fit(panel, { anchor: trigger, flip: true });
    if (fit && !fit.below) root.classList.add("color-picker--above");
    root.querySelector("[data-color-picker-area]")?.focus({ preventScroll: true });
  }

  function close(root, { refocus = true } = {}) {
    const panel = panelOf(root);
    const trigger = triggerOf(root);
    if (!panel || panel.hidden || !trigger) return;
    trigger.setAttribute("aria-expanded", "false");
    const done = () => {
      panel.hidden = true;
      globalThis.uiFloat?.clear(panel);
      root.classList.remove("color-picker--above");
      if (refocus && trigger.isConnected) trigger.focus();
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(panel, done);
    else done();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-color-picker-trigger]");
    if (trigger) {
      const root = rootOf(trigger);
      if (!root || trigger.disabled) return;
      if (isOpen(root)) close(root);
      else open(root);
      return;
    }
    const preset = event.target.closest?.("[data-color-picker-preset]");
    if (preset) {
      const root = rootOf(preset);
      const p = parse(preset.getAttribute("data-color"));
      if (root && p) setColor(root, p);
      return;
    }
    // Outside click closes every open picker.
    document.querySelectorAll("[data-color-picker]").forEach((root) => {
      if (isOpen(root) && !root.contains(event.target)) close(root, { refocus: false });
    });
  });

  document.addEventListener("keydown", (event) => {
    const root = rootOf(event.target);
    if (!root) return;
    if (event.key === "Escape" && isOpen(root)) {
      event.preventDefault();
      event.stopPropagation();
      close(root);
      return;
    }
    const area = event.target.closest?.("[data-color-picker-area]");
    if (!area) return;
    const st = state.get(root);
    const step = (event.shiftKey ? 10 : 1) / 100;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft":
        st.s = clamp(st.s - step, 0, 1);
        break;
      case "ArrowRight":
        st.s = clamp(st.s + step, 0, 1);
        break;
      case "ArrowUp":
        st.v = clamp(st.v + step, 0, 1);
        break;
      case "ArrowDown":
        st.v = clamp(st.v - step, 0, 1);
        break;
      case "Home":
        st.s = 0;
        break;
      case "End":
        st.s = 1;
        break;
      default:
        handled = false;
    }
    if (!handled) return;
    event.preventDefault();
    paint(root);
  });

  /* ------------------------------------------------------- the square */
  function pick(root, area, event) {
    const st = state.get(root);
    const rect = area.getBoundingClientRect();
    st.s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    st.v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    paint(root);
  }

  document.addEventListener("pointerdown", (event) => {
    const area = event.target.closest?.("[data-color-picker-area]");
    const root = rootOf(area);
    if (!area || !root || root.hasAttribute("data-color-picker-disabled")) return;
    event.preventDefault();
    area.focus({ preventScroll: true });
    area.setPointerCapture?.(event.pointerId);
    pick(root, area, event);
    const move = (e) => pick(root, area, e);
    const up = () => {
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerup", up);
      area.removeEventListener("pointercancel", up);
    };
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerup", up);
    area.addEventListener("pointercancel", up);
  });

  /* ------------------------------------------------ sliders and field */
  document.addEventListener("input", (event) => {
    const el = event.target;
    const root = rootOf(el);
    if (!root || !state.has(root)) return;
    const st = state.get(root);
    if (el.matches("[data-color-picker-hue]")) {
      st.h = clamp(+el.value, 0, 360) % 360;
      paint(root);
    } else if (el.matches("[data-color-picker-alpha]")) {
      st.a = clamp(+el.value / 100, 0, 1);
      paint(root);
    } else if (el.matches("[data-color-picker-field]")) {
      const p = parse(el.value);
      el.setAttribute("aria-invalid", p ? "false" : "true");
      if (p) setColor(root, p, { typing: true });
    } else if (el.matches(".color-picker__native")) {
      // The native input, changed by hand (a no-JS page turned JS, or a
      // script): follow it.
      const p = parse(el.value);
      if (p) setColor(root, p, { notify: false });
    }
  });

  document.addEventListener("focusout", (event) => {
    const el = event.target;
    if (!el?.matches?.("[data-color-picker-field]")) return;
    const root = rootOf(el);
    if (root) paint(root, { notify: false });
    el.removeAttribute("aria-invalid");
  });

  function initAll() {
    document.querySelectorAll("[data-color-picker]").forEach(setup);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
  // The contrast ratio follows the theme.
  new MutationObserver(() => {
    document.querySelectorAll("[data-color-picker]").forEach((root) => {
      if (state.has(root)) paint(root, { notify: false });
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
