/*
 * Carousel: drives a snapping scroll track (`[data-carousel-track]`).
 * Prev/next scroll one slide (smoothly; instantly under reduced motion),
 * dots jump to a slide, Left/Right on the focused track or region do the
 * same, and the active slide — the one most in view — is tracked with an
 * IntersectionObserver so the dots and the end-state of the buttons stay
 * right however the track was scrolled. `data-carousel-loop` wraps at the
 * ends; `data-carousel-autoplay="<ms>"` advances on a timer that pauses
 * while the region is hovered or holds focus, and while it is off screen.
 */
(() => {
  const reduced = () => globalThis.uiMotion.reduced(); // shared/js/motion.js
  const state = new WeakMap();

  const slidesOf = (root) => Array.from(root.querySelectorAll("[data-carousel-slide]"));
  const trackOf = (root) => root.querySelector("[data-carousel-track]");

  function goTo(root, index, { smooth = true } = {}) {
    const slides = slidesOf(root);
    const track = trackOf(root);
    if (!slides.length || !track) return;
    const loop = root.hasAttribute("data-carousel-loop");
    let i = index;
    if (loop) i = (i + slides.length) % slides.length;
    else i = Math.max(0, Math.min(slides.length - 1, i));
    const slide = slides[i];
    track.scrollTo({
      left: slide.offsetLeft - track.offsetLeft - (parseFloat(getComputedStyle(track).paddingInlineStart) || 0),
      behavior: smooth && !reduced() ? "smooth" : "instant",
    });
  }

  function current(root) {
    return state.get(root)?.index ?? 0;
  }

  function setActive(root, index) {
    const s = state.get(root);
    if (!s || s.index === index) return;
    s.index = index;
    const slides = slidesOf(root);
    root.querySelectorAll("[data-carousel-to]").forEach((dot) => {
      if (Number(dot.getAttribute("data-carousel-to")) === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    const loop = root.hasAttribute("data-carousel-loop");
    const prev = root.querySelector("[data-carousel-prev]");
    const next = root.querySelector("[data-carousel-next]");
    if (prev) prev.disabled = !loop && index <= 0;
    if (next) next.disabled = !loop && index >= slides.length - 1;
  }

  /* -------------------------------------------------------- autoplay */
  function schedule(root) {
    const s = state.get(root);
    if (!s || !s.autoplay) return;
    clearTimeout(s.timer);
    if (s.hovered || s.focused || !s.visible || reduced()) {
      root.setAttribute("data-carousel-paused", "");
      return;
    }
    root.removeAttribute("data-carousel-paused");
    s.timer = setTimeout(() => {
      const n = slidesOf(root).length;
      const next = current(root) + 1;
      goTo(root, next >= n && !root.hasAttribute("data-carousel-loop") ? 0 : next);
      schedule(root);
    }, s.autoplay);
  }

  /* ------------------------------------------------------------ init */
  function init(root) {
    if (state.has(root)) return;
    const s = {
      index: -1,
      autoplay: Number(root.getAttribute("data-carousel-autoplay")) || 0,
      hovered: false,
      focused: false,
      visible: true,
      timer: 0,
    };
    state.set(root, s);
    const slides = slidesOf(root);
    const track = trackOf(root);
    if (track && typeof IntersectionObserver === "function") {
      // The slide with the largest visible share is the active one.
      const ratios = new Map();
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best = 0;
        let bestRatio = -1;
        slides.forEach((slide, i) => {
          const r = ratios.get(slide) ?? 0;
          if (r > bestRatio + 0.01) {
            bestRatio = r;
            best = i;
          }
        });
        // With several slides per view the last ones can never be "most
        // visible": the scroll end counts as the last slide, the start as
        // the first, so the dots and the buttons agree with the track.
        const max = track.scrollWidth - track.clientWidth;
        const x = Math.abs(track.scrollLeft);
        if (max > 2 && x >= max - 2) best = slides.length - 1;
        else if (x <= 2) best = 0;
        setActive(root, best);
      }, { root: track, threshold: [0, 0.25, 0.5, 0.75, 1] });
      slides.forEach((slide) => io.observe(slide));
      const vis = new IntersectionObserver((entries) => {
        s.visible = entries.some((e) => e.isIntersecting);
        schedule(root);
      }, { threshold: 0.2 });
      vis.observe(root);
    } else {
      setActive(root, 0);
    }
    root.addEventListener("pointerenter", () => {
      s.hovered = true;
      schedule(root);
    });
    root.addEventListener("pointerleave", () => {
      s.hovered = false;
      schedule(root);
    });
    root.addEventListener("focusin", () => {
      s.focused = true;
      schedule(root);
    });
    root.addEventListener("focusout", (event) => {
      if (root.contains(event.relatedTarget)) return;
      s.focused = false;
      schedule(root);
    });
    schedule(root);
  }

  document.addEventListener("click", (event) => {
    const prev = event.target.closest?.("[data-carousel-prev]");
    const next = event.target.closest?.("[data-carousel-next]");
    const dot = event.target.closest?.("[data-carousel-to]");
    const root = (prev ?? next ?? dot)?.closest("[data-carousel]");
    if (!root) return;
    if (prev) goTo(root, current(root) - 1);
    else if (next) goTo(root, current(root) + 1);
    else goTo(root, Number(dot.getAttribute("data-carousel-to")));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const root = event.target.closest?.("[data-carousel]");
    if (!root || event.target.closest("input, textarea, select, [contenteditable]")) return;
    const rtl = getComputedStyle(root).direction === "rtl";
    const forward = (event.key === "ArrowRight") !== rtl;
    event.preventDefault();
    goTo(root, current(root) + (forward ? 1 : -1));
  });

  const initAll = () => document.querySelectorAll("[data-carousel]").forEach(init);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
