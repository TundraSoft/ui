/*
 * Number input: the two steppers call stepDown()/stepUp() on the native
 * field and announce the change (input + change events, so filters,
 * validators and autosubmit see a normal edit); holding one repeats (after
 * 400 ms, every 60 ms) until the pointer lifts or leaves; a stepper at
 * its bound is aria-disabled. With `data-number-group` the field shows
 * thousands separators while it is not focused: the native number field
 * cannot hold a formatted string, so it is switched to text for display
 * and back to number on focus — what submits is always the raw value.
 */
(() => {
  const fieldOf = (root) => root.querySelector(".number-input__field");
  const stepOf = (root, dir) => root.querySelector(`[data-number-step="${dir}"]`);

  function bounds(root) {
    const field = fieldOf(root);
    if (!field) return;
    const v = field.value === "" ? NaN : Number(field.value);
    const min = field.min === "" ? -Infinity : Number(field.min);
    const max = field.max === "" ? Infinity : Number(field.max);
    const down = stepOf(root, "down");
    const up = stepOf(root, "up");
    if (down) down.setAttribute("aria-disabled", String(!Number.isNaN(v) && v <= min));
    if (up) up.setAttribute("aria-disabled", String(!Number.isNaN(v) && v >= max));
  }

  function step(root, dir) {
    const field = fieldOf(root);
    if (!field || field.disabled || field.readOnly) return;
    const button = stepOf(root, dir);
    if (button?.getAttribute("aria-disabled") === "true") return;
    unformat(field);
    try {
      if (dir === "up") field.stepUp();
      else field.stepDown();
    } catch {
      // A value that is not on the step grid: snap to the nearest bound.
      const n = Number(field.value) || Number(field.min) || 0;
      const s = Number(field.step) || 1;
      field.value = String(dir === "up" ? n + s : n - s);
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    bounds(root);
  }

  /* -------------------------------------------------- thousands grouping */
  const grouped = (root) => root.hasAttribute("data-number-group");

  function format(field) {
    const raw = field.dataset.numberRaw ?? field.value;
    if (raw === "" || Number.isNaN(Number(raw))) return;
    field.dataset.numberRaw = raw;
    const digits = (raw.split(".")[1] ?? "").length;
    const text = new Intl.NumberFormat(document.documentElement.lang || undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(raw));
    field.type = "text";
    field.value = text;
  }

  function unformat(field) {
    if (field.type === "number") return;
    const raw = field.dataset.numberRaw;
    field.type = "number";
    if (raw !== undefined) field.value = raw;
    delete field.dataset.numberRaw;
  }

  /* ------------------------------------------------------------ events */
  let repeat = null;
  const stopRepeat = () => {
    if (!repeat) return;
    clearTimeout(repeat.delay);
    clearInterval(repeat.tick);
    repeat = null;
  };

  document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest?.("[data-number-step]");
    if (!button || event.button !== 0) return;
    const root = button.closest("[data-number-input]");
    if (!root) return;
    const dir = button.getAttribute("data-number-step");
    stopRepeat();
    repeat = {
      delay: setTimeout(() => {
        repeat.tick = setInterval(() => step(root, dir), 60);
      }, 400),
      tick: null,
    };
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((name) =>
    document.addEventListener(name, (event) => {
      if (event.target.closest?.("[data-number-step]") || name !== "pointerleave") stopRepeat();
    }, true)
  );

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-number-step]");
    if (!button) return;
    const root = button.closest("[data-number-input]");
    if (!root) return;
    event.preventDefault();
    step(root, button.getAttribute("data-number-step"));
    fieldOf(root)?.focus({ preventScroll: true });
  });

  document.addEventListener("input", (event) => {
    const root = event.target.closest?.("[data-number-input]");
    if (root && event.target === fieldOf(root)) bounds(root);
  });

  document.addEventListener("focusin", (event) => {
    const root = event.target.closest?.("[data-number-input]");
    if (root && grouped(root) && event.target === fieldOf(root)) unformat(event.target);
  });

  document.addEventListener("focusout", (event) => {
    const root = event.target.closest?.("[data-number-input]");
    if (root && grouped(root) && event.target === fieldOf(root)) {
      bounds(root);
      format(event.target);
    }
  });

  // A grouped field must submit its raw value.
  document.addEventListener("submit", (event) => {
    event.target.querySelectorAll?.("[data-number-group] .number-input__field").forEach(unformat);
  }, true);

  function initAll() {
    document.querySelectorAll("[data-number-input]").forEach((root) => {
      bounds(root);
      const field = fieldOf(root);
      if (field && grouped(root) && document.activeElement !== field) format(field);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
