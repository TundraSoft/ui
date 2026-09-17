/*
 * Slider: sync the painted track to the native <input type="range">.
 * --slider-pct is the only channel; the CSS owns everything visual. Runs
 * on load and after every rAPId swap, because a swapped-in fragment
 * arrives with no inline state (CSP: the template never emits one).
 *
 * The <output> text is server-rendered (possibly via a `format()` the
 * browser cannot run), so it is only rewritten on user input — using
 * `data-slider-labels` for stepped sliders or `data-slider-unit` for
 * counted ones.
 */
(() => {
  function paint(input) {
    const root = input.closest("[data-slider]");
    if (!root) return null;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const pct = max === min ? 0 : ((Number(input.value) - min) / (max - min)) * 100;
    root.style.setProperty("--slider-pct", `${pct.toFixed(2)}%`);
    return root;
  }

  function label(root, input) {
    const out = root.querySelector("[data-slider-output]");
    if (!out) return;
    const value = Number(input.value);
    const labels = root.getAttribute("data-slider-labels");
    if (labels) {
      const step = Number(input.step || 1);
      const i = Math.round((value - Number(input.min || 0)) / step);
      let parsed = [];
      try {
        parsed = JSON.parse(labels);
      } catch { /* malformed — fall through to the number */ }
      out.textContent = parsed[i] ?? input.value;
      root.querySelectorAll(".slider__scale-item").forEach((el, n) => {
        el.classList.toggle("slider__scale-item--active", n === i);
      });
      return;
    }
    const unit = root.getAttribute("data-slider-unit");
    const one = root.getAttribute("data-slider-unit-one") || unit;
    out.textContent = unit ? `${input.value} ${value === 1 ? one : unit}` : input.value;
  }

  function initAll() {
    document.querySelectorAll("[data-slider] .slider__input").forEach(paint);
  }

  document.addEventListener("input", (event) => {
    if (!event.target.matches?.("[data-slider] .slider__input")) return;
    const root = paint(event.target);
    if (root) label(root, event.target);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  document.addEventListener("rapid:swapped", initAll);
})();
