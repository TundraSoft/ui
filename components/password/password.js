/*
 * Password field (PasswordInput): the Show/Hide toggle flips the input's
 * type; the strength bar scores the value on every keystroke — length,
 * character classes, repeated characters, keyboard/number sequences and
 * the most common passwords — into levels 1–4 written to
 * `data-strength-level` on the root (0 while empty; CSS colours the
 * segments). With `data-strength-min` on the input, a value below that
 * level is reported through setCustomValidity so form.js shows the
 * message inline like any other rule. Input is handled in the capture
 * phase so the validity is already updated when form.js (a bubbling
 * listener) reads it for the same keystroke.
 */
(() => {
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

  function update(input) {
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
    if (input?.matches?.("[data-password] .password__input")) update(input);
  }, true);

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest?.("[data-password-reveal]");
    if (!toggle) return;
    const input = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.textContent = show
      ? toggle.getAttribute("data-label-hide") || "Hide"
      : toggle.getAttribute("data-label-show") || "Show";
    input.focus();
  });

  function initAll() {
    document.querySelectorAll("[data-password] .password__input").forEach((input) => {
      if (input.value) update(input);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
