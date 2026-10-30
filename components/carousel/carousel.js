/*
 * Carousel: drives a snapping scroll track (`[data-carousel-track]`).
 * Prev/next scroll one slide (smoothly; instantly under reduced motion),
 * dots jump to a slide, Left/Right on the focused track or region do the
 * same, and the active slide — the one most in view — is tracked with an
 * IntersectionObserver so the dots and the end-state of the buttons stay
 * right however the track was scrolled. `data-carousel-loop` wraps at the
 * ends; `data-carousel-autoplay="<ms>"` advances on a timer that pauses
 * while the region is hovered or holds focus, and while it is off screen.
 *
 * A stacked carousel (`stack*`: the stylesheet turns the track into a
 * grid) is left alone — no keys, no autoplay. `data-carousel-scroll="page"`
 * drives the track from the page's scroll instead: while it applies (not
 * stacked, not reduced motion, more than one slide) the root gets
 * `data-carousel-pinned` and `--carousel-page-count`, the track's
 * scrollLeft follows the page (each slide holds for `data-carousel-hold`,
 * default 80%, of its screen; the outgoing slide fades while it moves), and buttons, dots and keys scroll the page to a slide's place.
 */
(() => {
  const reduced = () => globalThis.uiMotion.reduced(); // shared/js/motion.js
  const state = new WeakMap();

  const slidesOf = (root) => Array.from(root.querySelectorAll("[data-carousel-slide]"));
  const trackOf = (root) => root.querySelector("[data-carousel-track]");
  const stacked = (root) => {
    const track = trackOf(root);
    return !!track && getComputedStyle(track).display === "grid";
  };
  const pinned = (root) => root.hasAttribute("data-carousel-pinned");
  /** The scrollLeft that brings a slide to the track's start edge. */
  const targetOf = (track, slide) =>
    slide.offsetLeft - track.offsetLeft - (parseFloat(getComputedStyle(track).paddingInlineStart) || 0);

  /* ----------------------------------------------------- side buttons */
  // Each side button goes outside the slides by its own size plus a gap
  // when the viewport has that room beside the carousel, otherwise as far
  // out as fits, and at most --space-2 inside the edge.
  const sided = new Set();
  function placeSides(root) {
    const button = root.querySelector(".carousel__side");
    const frame = root.querySelector(".carousel__frame");
    if (!button || !frame) return;
    const size = button.offsetWidth;
    const gap = 12;
    const inside = 8;
    const r = frame.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const rtl = getComputedStyle(root).direction === "rtl";
    const outset = (room) => Math.min(size + gap, Math.max(-inside, room - size - inside));
    const left = outset(r.left);
    const right = outset(vw - r.right);
    root.style.setProperty("--carousel-side-outset-start", `${rtl ? right : left}px`);
    root.style.setProperty("--carousel-side-outset-end", `${rtl ? left : right}px`);
  }

  /* ------------------------------------------------------ page scroll */
  const paged = new Set();
  /** Where the pinned band starts and how far the page scrolls through it. */
  function band(root) {
    const pin = root.querySelector("[data-carousel-pin]");
    const offset = pin ? parseFloat(getComputedStyle(pin).top) || 0 : 0;
    const start = root.getBoundingClientRect().top + scrollY - offset;
    return { start, length: Math.max(1, root.offsetHeight - (pin?.offsetHeight ?? 0)) };
  }

  /**
   * Measure the carousel as a plain row (the measuring class undoes the
   * pin's stretch and an "unfit" stack for one layout, never painted):
   * whether the page's own stack rules apply, and whether the tallest
   * slide fits the pinned frame — the screen under the header minus the
   * bar.
   */
  function measure(root) {
    const pin = root.querySelector("[data-carousel-pin]");
    const track = trackOf(root);
    if (!pin || !track) return { stack: true, fits: false };
    const stack = getComputedStyle(root).getPropertyValue("--carousel-stacked").trim() === "1";
    root.classList.add("carousel--measuring");
    const natural = track.offsetHeight;
    root.classList.remove("carousel--measuring");
    const bar = root.querySelector(".carousel__bar");
    const barHeight = bar && bar.offsetHeight ? bar.offsetHeight + (parseFloat(getComputedStyle(pin).rowGap) || 0) : 0;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    return { stack, fits: natural <= innerHeight - top - barHeight + 1 };
  }

  function layoutPage(root) {
    const n = slidesOf(root).length;
    const m = measure(root);
    const want = n > 1 && !reduced() && !m.stack;
    // Too tall for the frame: a list of the slides, not a clipped pin.
    const unfit = want && !m.fits;
    const on = want && m.fits;
    root.toggleAttribute("data-carousel-unfit", unfit);
    if (on !== pinned(root)) {
      if (on) {
        root.setAttribute("data-carousel-pinned", "");
        root.style.setProperty("--carousel-page-count", String(n));
      } else {
        root.removeAttribute("data-carousel-pinned");
        root.style.removeProperty("--carousel-page-count");
        slidesOf(root).forEach((slide) => slide.style.removeProperty("opacity"));
      }
    }
    if (on) followPage(root);
  }

  /** The share of each slide's screen it stays still (`data-carousel-hold`, 0–0.95). */
  const holdOf = (root) => {
    const h = Number(root.getAttribute("data-carousel-hold"));
    return Number.isFinite(h) && root.hasAttribute("data-carousel-hold") ? Math.max(0, Math.min(0.95, h)) : 0.8;
  };

  function followPage(root) {
    const slides = slidesOf(root);
    const track = trackOf(root);
    const n = slides.length;
    if (!track || n < 2) return;
    const { start, length } = band(root);
    const p = Math.max(0, Math.min(1, (scrollY - start) / length));
    const at = p * (n - 1);
    const i = Math.min(n - 2, Math.floor(at));
    // Each screen between two slides holds half the hold on the one, moves,
    // and holds the other half on the next: the first and last slides get
    // half a hold at the band's ends, the rest a whole one, and the move —
    // two half slides in the frame — is brief.
    const hold = holdOf(root);
    const t = Math.max(0, Math.min(1, (at - i - hold / 2) / (1 - hold)));
    const a = targetOf(track, slides[i]);
    const b = targetOf(track, slides[i + 1]);
    track.scrollLeft = a + (b - a) * t;
    // The outgoing slide fades as it leaves; the incoming one is opaque.
    slides.forEach((slide, k) => {
      if (k === i && t > 0 && t < 1) slide.style.opacity = String(1 - t);
      else slide.style.removeProperty("opacity");
    });
    setActive(root, Math.round(i + t));
  }

  let framed = false;
  function onPageScroll() {
    if (framed || paged.size === 0) return;
    framed = true;
    requestAnimationFrame(() => {
      framed = false;
      for (const root of paged) {
        if (!root.isConnected) paged.delete(root);
        else if (pinned(root)) followPage(root);
      }
    });
  }
  addEventListener("scroll", onPageScroll, { passive: true });
  addEventListener("resize", () => {
    paged.forEach(layoutPage);
    sided.forEach((root) => (root.isConnected ? placeSides(root) : sided.delete(root)));
  });
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change", () => {
    paged.forEach(layoutPage);
  });

  function goTo(root, index, { smooth = true } = {}) {
    const slides = slidesOf(root);
    const track = trackOf(root);
    if (!slides.length || !track || stacked(root)) return;
    if (pinned(root)) {
      // The page owns the track: scroll the page to the slide's place.
      const i = Math.max(0, Math.min(slides.length - 1, index));
      const { start, length } = band(root);
      scrollTo({
        top: start + (i / (slides.length - 1)) * length,
        behavior: smooth && !reduced() ? "smooth" : "instant",
      });
      return;
    }
    const loop = root.hasAttribute("data-carousel-loop");
    let i = index;
    if (loop) i = (i + slides.length) % slides.length;
    else i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: targetOf(track, slides[i]), behavior: smooth && !reduced() ? "smooth" : "instant" });
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
    const loop = root.hasAttribute("data-carousel-loop") && !pinned(root);
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
    if (s.hovered || s.focused || !s.visible || reduced() || stacked(root) || pinned(root)) {
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
        // A pinned carousel's active slide follows the page (followPage).
        if (pinned(root)) return;
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
    if (root.querySelector(".carousel__side")) {
      sided.add(root);
      placeSides(root);
    }
    if (root.getAttribute("data-carousel-scroll") === "page") {
      paged.add(root);
      layoutPage(root);
    }
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
    if (!root || event.target.closest("input, textarea, select, [contenteditable]") || stacked(root)) return;
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
