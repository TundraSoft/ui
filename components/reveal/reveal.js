/*
 * Scroll effects, three in one file:
 *
 * 1. Reveal: `[data-reveal]` blocks get `is-revealed` as they enter the
 *    viewport (IntersectionObserver). `[data-reveal-repeat]` loses it
 *    again on the way out. Inside a `[data-reveal-stagger]` group each
 *    child is numbered (`--reveal-index`, CSSOM) so the stylesheet delays
 *    it by that many steps. Blocks already on screen at init reveal at
 *    once; under reduced motion everything reveals immediately.
 *
 * 2. Parallax: `[data-parallax="0.2"]` blocks drift against the scroll
 *    by that fraction of their distance from the viewport's centre —
 *    only while on screen, one transform per animation frame, and never
 *    under reduced motion or on a coarse pointer (a phone composites its
 *    own scroll; a transform per frame on top of it judders).
 *
 * 3. Lazy sections: `[data-lazy-section][data-action]` are fetched with
 *    `window.rapid.swap(url, section)` when they come within their
 *    `data-lazy-margin` (default 200px) of the viewport. Without the
 *    runtime the section keeps what it holds (`data-lazy-inert`).
 */
(() => {
  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const hasIO = typeof IntersectionObserver === "function";

  /* ------------------------------------------------------------ reveal */
  function reveal(el) {
    el.classList.add("is-revealed");
  }

  const revealObserver = hasIO
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          reveal(e.target);
          if (!e.target.hasAttribute("data-reveal-repeat")) revealObserver.unobserve(e.target);
        } else if (e.target.hasAttribute("data-reveal-repeat")) {
          e.target.classList.remove("is-revealed");
        }
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 })
    : null;

  const watched = new WeakSet();
  function initReveal(root) {
    root.querySelectorAll?.("[data-reveal-stagger]").forEach((group) => {
      Array.from(group.children).forEach((child, i) => child.style.setProperty("--reveal-index", String(i)));
    });
    root.querySelectorAll?.("[data-reveal]").forEach((el) => {
      if (watched.has(el)) return;
      watched.add(el);
      if (!revealObserver || reduced()) {
        reveal(el);
        return;
      }
      const r = el.getBoundingClientRect();
      // Already on screen (or above it): no reason to wait for a scroll.
      if (r.top < innerHeight && r.bottom > 0) reveal(el);
      if (r.top < innerHeight && r.bottom > 0 && !el.hasAttribute("data-reveal-repeat")) return;
      revealObserver.observe(el);
    });
  }

  /* ---------------------------------------------------------- parallax */
  const active = new Set();
  let frame = 0;

  function paint() {
    frame = 0;
    const vh = innerHeight;
    for (const el of active) {
      const factor = parseFloat(el.getAttribute("data-parallax")) || 0;
      const r = el.getBoundingClientRect();
      const centre = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${Math.round(-centre * factor)}px, 0)`;
    }
  }

  const schedule = () => {
    if (!frame && active.size) frame = requestAnimationFrame(paint);
  };

  const parallaxObserver = hasIO
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) active.add(e.target);
        else {
          active.delete(e.target);
          e.target.style.removeProperty("transform");
        }
      }
      schedule();
    }, { rootMargin: "20% 0px" })
    : null;

  const parallaxed = new WeakSet();
  function initParallax(root) {
    if (!parallaxObserver || reduced() || coarse()) return;
    root.querySelectorAll?.("[data-parallax]").forEach((el) => {
      if (parallaxed.has(el)) return;
      parallaxed.add(el);
      parallaxObserver.observe(el);
    });
  }

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });

  /* ------------------------------------------------------ lazy sections */
  const lazyObservers = new Map(); // rootMargin → observer

  function load(section) {
    const url = section.getAttribute("data-action");
    const rapid = globalThis.rapid;
    if (!url || typeof rapid?.swap !== "function") {
      section.setAttribute("data-lazy-inert", "");
      return;
    }
    section.setAttribute("data-lazy-loading", "");
    Promise.resolve(rapid.swap(url, section)).catch(() => {}).then(() => {
      section.removeAttribute("data-lazy-loading");
    });
  }

  const lazied = new WeakSet();
  function initLazy(root) {
    root.querySelectorAll?.("[data-lazy-section][data-action]").forEach((section) => {
      if (lazied.has(section) || section.hasAttribute("data-lazy-inert")) return;
      lazied.add(section);
      if (!hasIO) {
        load(section);
        return;
      }
      const margin = section.getAttribute("data-lazy-margin") || "200px 0px";
      let observer = lazyObservers.get(margin);
      if (!observer) {
        observer = new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            observer.unobserve(e.target);
            load(e.target);
          }
        }, { rootMargin: margin });
        lazyObservers.set(margin, observer);
      }
      observer.observe(section);
    });
  }

  /* -------------------------------------------------------------- init */
  function initAll(root = document) {
    initReveal(root);
    initParallax(root);
    initLazy(root);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
  document.addEventListener(
    "rapid:swapped",
    (event) => initAll(event.target instanceof Element ? event.target : document),
  );
})();
