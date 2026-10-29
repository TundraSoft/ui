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
 *
 * 4. Reading progress: `[data-scroll-progress]` gets `--scroll-progress`
 *    (0–1, CSSOM) per scroll frame — the page's own progress, or that of
 *    the element the attribute's selector names. A page-wide bar is left
 *    to CSS where `animation-timeline: scroll()` exists.
 *
 * 5. Count-up: `[data-count-up]` counts from `data-count-from` to its
 *    value over `data-count-duration` ms the first time it is seen,
 *    writing `Intl.NumberFormat` output each frame and ending on the text
 *    the server rendered. Nothing moves under reduced motion.
 *
 * 6. Scroll steps: inside `[data-scroll-steps]`, the `[data-scroll-step]`
 *    crossing the middle band of the viewport is current — `is-active` +
 *    `aria-current="step"` on it, `is-active` on the stage's matching
 *    `[data-scroll-step-media]`.
 */
(() => {
  const reduced = () => globalThis.uiMotion.reduced(); // shared/js/motion.js
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

  /* --------------------------------------------------- scroll progress */
  const progressBars = new Set();
  const cssProgress = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()");

  function paintProgress() {
    const doc = document.documentElement;
    for (const bar of progressBars) {
      if (!bar.isConnected) {
        progressBars.delete(bar);
        continue;
      }
      const sel = bar.getAttribute("data-scroll-progress");
      let p;
      if (sel) {
        const target = document.querySelector(sel);
        if (!target) continue;
        const r = target.getBoundingClientRect();
        const span = r.height - innerHeight;
        // Taller than the viewport: how much of it has been read. Shorter:
        // how far it has travelled up through the viewport.
        p = span > 0 ? -r.top / span : (innerHeight - r.top) / (innerHeight + r.height);
      } else {
        const span = doc.scrollHeight - innerHeight;
        p = span <= 0 ? 1 : doc.scrollTop / span;
      }
      bar.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, p))));
    }
  }

  let progressFrame = 0;
  const scheduleProgress = () => {
    if (!progressFrame && progressBars.size) {
      progressFrame = requestAnimationFrame(() => {
        progressFrame = 0;
        paintProgress();
      });
    }
  };

  function initProgress(root) {
    root.querySelectorAll?.("[data-scroll-progress]").forEach((bar) => {
      // A page-wide bar draws itself where the browser has scroll timelines.
      if (cssProgress && bar.getAttribute("data-scroll-progress") === "") return;
      progressBars.add(bar);
    });
    if (root.matches?.("[data-scroll-progress]")) progressBars.add(root);
    paintProgress();
  }

  addEventListener("scroll", scheduleProgress, { passive: true });
  addEventListener("resize", scheduleProgress, { passive: true });

  /* ---------------------------------------------------------- count-up */
  function formatter(el, decimals) {
    const format = el.getAttribute("data-count-format") || "number";
    const locale = el.getAttribute("data-count-locale") || document.documentElement.lang || "en";
    const opts = { maximumFractionDigits: decimals, minimumFractionDigits: decimals };
    if (format === "compact") {
      Object.assign(opts, { notation: "compact", maximumFractionDigits: 1, minimumFractionDigits: 0 });
    } else if (format === "percent") opts.style = "percent";
    else if (format.startsWith("currency:")) Object.assign(opts, { style: "currency", currency: format.slice(9) });
    try {
      return new Intl.NumberFormat(locale, opts);
    } catch {
      return new Intl.NumberFormat("en", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
    }
  }

  function countUp(el) {
    const to = parseFloat(el.getAttribute("data-count-up"));
    const from = parseFloat(el.getAttribute("data-count-from")) || 0;
    const ms = parseInt(el.getAttribute("data-count-duration"), 10) || 1200;
    const decimals = parseInt(el.getAttribute("data-count-decimals"), 10) || 0;
    const final = el.textContent;
    if (!Number.isFinite(to) || reduced()) return;
    const fmt = formatter(el, decimals);
    const start = performance.now();
    el.setAttribute("data-counting", "");
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        el.textContent = fmt.format(from + (to - from) * eased);
        requestAnimationFrame(tick);
      } else {
        el.textContent = final;
        el.removeAttribute("data-counting");
      }
    };
    requestAnimationFrame(tick);
  }

  const countObserver = hasIO
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        countObserver.unobserve(e.target);
        countUp(e.target);
      }
    }, { threshold: 0.5 })
    : null;

  const counted = new WeakSet();
  function initCountUp(root) {
    root.querySelectorAll?.("[data-count-up]").forEach((el) => {
      if (counted.has(el)) return;
      counted.add(el);
      if (countObserver) countObserver.observe(el);
    });
  }

  /* ------------------------------------------------------ scroll steps */
  function activate(section, index) {
    section.querySelectorAll("[data-scroll-step]").forEach((step) => {
      const on = step.getAttribute("data-scroll-step") === index;
      step.classList.toggle("is-active", on);
      if (on) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
    section.querySelectorAll("[data-scroll-step-media]").forEach((media) => {
      media.classList.toggle("is-active", media.getAttribute("data-scroll-step-media") === index);
    });
  }

  // The step crossing the middle band (40%–60% of the viewport) is current.
  const stepObserver = hasIO
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const section = e.target.closest("[data-scroll-steps]");
        if (section) activate(section, e.target.getAttribute("data-scroll-step"));
      }
    }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 })
    : null;

  const stepped = new WeakSet();
  function initSteps(root) {
    if (!stepObserver) return;
    root.querySelectorAll?.("[data-scroll-steps]").forEach((section) => {
      if (stepped.has(section)) return;
      stepped.add(section);
      section.querySelectorAll("[data-scroll-step]").forEach((step) => stepObserver.observe(step));
    });
  }

  /* -------------------------------------------------------------- init */
  function initAll(root = document) {
    initReveal(root);
    initParallax(root);
    initLazy(root);
    initProgress(root);
    initCountUp(root);
    initSteps(root);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
  document.addEventListener(
    "rapid:swapped",
    (event) => initAll(event.target instanceof Element ? event.target : document),
  );
})();
