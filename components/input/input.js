/*
 * Input behaviours, all delegated on document and keyed off data-*:
 *
 * Password (Input({ type: "password" })): the Show/Hide toggle flips the
 * input's type; the strength bar scores the value on every keystroke —
 * length, character classes, repeated characters, keyboard/number
 * sequences and the most common passwords — into levels 1–4 written to
 * `data-strength-level` on the root (0 while empty; CSS colours the
 * segments). With `data-strength-min` on the input, a value below that
 * level is reported through setCustomValidity so form.js shows the
 * message inline like any other rule. Input is handled in the capture
 * phase so the validity is already updated when form.js (a bubbling
 * listener) reads it for the same keystroke. A Caps Lock notice
 * ([data-password-caps]) shows while the key is on and the field focused.
 *
 * Counter ([data-counter] + [data-counter-for=id]): "n / max", warning
 * from 90%. Clear ([data-input-clear-button]): empties the control and
 * fires `input` so filters follow. Autosize ([data-autosize]): where
 * `field-sizing: content` is unsupported, the height follows scrollHeight
 * through the CSSOM.
 */
(() => {
  /* ----------------------------------------------------- password */
  const COMMON = new Set([
    "password",
    "password1",
    "passw0rd",
    "123456",
    "1234567",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty",
    "qwerty123",
    "abc123",
    "111111",
    "123123",
    "000000",
    "letmein",
    "welcome",
    "admin",
    "iloveyou",
    "monkey",
    "dragon",
    "login",
    "princess",
    "football",
    "master",
    "sunshine",
    "shadow",
    "superman",
    "michael",
    "baseball",
    "trustno1",
  ]);
  const SEQUENCE = /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwer|wert|asdf|sdfg|zxcv|xcvb)/i;

  function score(value, min) {
    if (!value) return 0;
    const lower = value.toLowerCase();
    if (COMMON.has(lower) || /^(.)\1+$/.test(value)) return 1;
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
    let level = 0;
    if (value.length >= min) level++;
    if (value.length >= 12) level++;
    if (classes >= 3) level++;
    if (classes === 4 || value.length >= 16) level++;
    if (SEQUENCE.test(lower) || /(.)\1{2,}/.test(value)) level--;
    return Math.max(1, Math.min(4, level));
  }

  function updateStrength(input) {
    const root = input.closest("[data-password]");
    if (!root) return;
    const strength = root.querySelector("[data-password-strength]");
    const min = Number(input.getAttribute("minlength")) || 8;
    const level = score(input.value, min);
    root.dataset.strengthLevel = String(level);
    if (strength) {
      strength.hidden = level === 0;
      const label = strength.querySelector("[data-password-label]");
      if (label) {
        const levels = (label.getAttribute("data-levels") || "Too weak|Weak|Good|Strong").split("|");
        label.textContent = level ? levels[level - 1] : "";
      }
    }
    const floor = Number(input.getAttribute("data-strength-min"));
    if (floor) {
      const weak = level > 0 && level < floor;
      input.setCustomValidity(weak ? input.getAttribute("data-msg-strength") || "Choose a stronger password" : "");
    }
  }

  document.addEventListener("input", (event) => {
    const input = event.target;
    if (input?.matches?.("[data-password] .password__input")) updateStrength(input);
  }, true);

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest?.("[data-password-reveal]");
    if (!toggle) return;
    const input = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(show));
    const label = toggle.querySelector("[data-password-reveal-label]");
    if (label) {
      label.textContent = show
        ? toggle.getAttribute("data-label-hide") || "Hide"
        : toggle.getAttribute("data-label-show") || "Show";
    }
    const iconShow = toggle.querySelector("[data-icon-show]");
    const iconHide = toggle.querySelector("[data-icon-hide]");
    if (iconShow) iconShow.hidden = show;
    if (iconHide) iconHide.hidden = !show;
    input.focus();
  });

  const capsNotice = (input, on) => {
    const notice = input.closest("[data-password]")?.querySelector("[data-password-caps]");
    if (notice) notice.hidden = !on;
  };
  for (const type of ["keydown", "keyup"]) {
    document.addEventListener(type, (event) => {
      const input = event.target;
      if (!input?.matches?.("[data-password] .password__input") || typeof event.getModifierState !== "function") return;
      capsNotice(input, event.getModifierState("CapsLock"));
    });
  }
  document.addEventListener("focusout", (event) => {
    if (event.target?.matches?.("[data-password] .password__input")) capsNotice(event.target, false);
  });

  /* ------------------------------------------------------ counter */
  function updateCounter(control) {
    const id = control.id;
    const counter = id && document.querySelector(`[data-counter-for="${CSS.escape(id)}"]`);
    if (!counter) return;
    const max = Number(control.getAttribute("maxlength")) || 0;
    const length = control.value.length;
    counter.textContent = `${length} / ${max}`;
    counter.classList.toggle("input__counter--near", max > 0 && length >= max * 0.9);
  }
  document.addEventListener("input", (event) => {
    if (event.target?.matches?.("[data-counter]")) updateCounter(event.target);
  });

  /* -------------------------------------------------------- clear */
  function updateClear(control) {
    const button = control.closest("[data-input-clear]")?.querySelector("[data-input-clear-button]");
    if (button) button.hidden = !control.value;
  }
  document.addEventListener("input", (event) => {
    if (event.target?.closest?.("[data-input-clear]")) updateClear(event.target);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-input-clear-button]");
    if (!button) return;
    const control = document.getElementById(button.getAttribute("aria-controls")) ??
      button.closest("[data-input-clear]")?.querySelector("input");
    if (!control) return;
    control.value = "";
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.focus();
  });

  /* ----------------------------------------------------- autosize */
  // `field-sizing: content` covers the no-JS case; with JS the height is
  // set from scrollHeight regardless (a `rows` attribute otherwise wins in
  // some engines), shrinking as well as growing.
  function autosize(control) {
    control.style.height = "auto";
    control.style.height = `${control.scrollHeight}px`;
  }
  document.addEventListener("input", (event) => {
    if (event.target?.matches?.("[data-autosize]")) autosize(event.target);
  });

  function initAll() {
    document.querySelectorAll("[data-password] .password__input").forEach((input) => {
      if (input.value) updateStrength(input);
    });
    document.querySelectorAll("[data-counter]").forEach(updateCounter);
    document.querySelectorAll("[data-input-clear] input").forEach(updateClear);
    document.querySelectorAll("[data-autosize]").forEach(autosize);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
