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
 * Masks ([data-mask], Input({ mask })): phone, date, time, currency, card,
 * postcode and custom patterns are formatted as typed, with the caret
 * kept after the same characters; `data-mask-raw` submits the raw value
 * through a hidden input the script adds. See the "masks" section.
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

  /* -------------------------------------------------------- masks */
  // Input({ mask }): the field is formatted from its significant
  // characters on every input — a paste, a drop or a keystroke all land
  // the same way — and the caret is put back after the same number of
  // significant characters it followed before. Backspace over a literal
  // the mask inserted skips it and deletes the character before it.
  // Impossible dates and times become a custom validity, set in the
  // capture phase so form.js reads it fresh on the same keystroke.
  const DIGIT = /[0-9]/;
  const LETTER = /\p{L}/u;
  const slotMatches = (slot, ch) =>
    slot === "#"
      ? DIGIT.test(ch)
      : slot === "A"
      ? LETTER.test(ch)
      : slot === "*"
      ? DIGIT.test(ch) || LETTER.test(ch)
      : false;

  /** Fill a pattern with the significant characters of `text`. */
  function byPattern(text, pattern) {
    const chars = text.split("").filter((ch) => DIGIT.test(ch) || LETTER.test(ch));
    let out = "";
    const sig = [];
    let i = 0;
    for (const slot of pattern) {
      const literal = !/[#A*]/.test(slot);
      if (literal) {
        if (i >= chars.length) break;
        out += slot;
        sig.push(false);
        continue;
      }
      while (i < chars.length && !slotMatches(slot, chars[i])) i++;
      if (i >= chars.length) break;
      out += slot === "A" ? chars[i].toUpperCase() : chars[i];
      sig.push(true);
      i++;
    }
    return { text: out, sig };
  }

  function groupDigits(digits, groups, max) {
    const d = digits.slice(0, max);
    const parts = [];
    let at = 0;
    for (const n of groups) {
      if (at >= d.length) break;
      parts.push(d.slice(at, at + n));
      at += n;
    }
    while (at < d.length) {
      parts.push(d.slice(at, at + 4));
      at += 4;
    }
    return parts.join(" ");
  }

  const sigOf = (text, keep) => text.split("").map((ch) => keep.test(ch));

  function separators(locale) {
    try {
      const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
      return {
        group: parts.find((p) => p.type === "group")?.value ?? ",",
        decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
      };
    } catch {
      return { group: ",", decimal: "." };
    }
  }

  /** The formatted text and, per character, whether it is one the person typed. */
  function format(input, text) {
    const kind = input.getAttribute("data-mask");
    const pattern = input.getAttribute("data-mask-pattern");
    if (kind === "custom" || kind === "date" || kind === "time") return byPattern(text, pattern || "");
    if (kind === "card") {
      const d = text.replace(/\D/g, "");
      const amex = /^3[47]/.test(d);
      const out = groupDigits(d, amex ? [4, 6, 5] : [4, 4, 4, 4], amex ? 15 : 19);
      return { text: out, sig: sigOf(out, DIGIT) };
    }
    if (kind === "phone") {
      const plus = text.trim().startsWith("+");
      const d = text.replace(/\D/g, "");
      let out;
      if (plus) {
        const cc = d.slice(0, d.length > 10 ? Math.min(3, d.length - 10) : 1);
        const rest = d.slice(cc.length);
        out = `+${cc}${rest ? " " + groupDigits(rest, [3, 3, 4], 12) : ""}`;
      } else out = groupDigits(d, [3, 3, 4], 15);
      return { text: out, sig: sigOf(out, /[0-9+]/) };
    }
    if (kind === "postcode") {
      const out = text.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").replace(/^ /, "").slice(0, 10);
      return { text: out, sig: sigOf(out, /[A-Z0-9]/) };
    }
    if (kind === "currency") {
      const { group, decimal } = separators(input.getAttribute("data-mask-locale") || "en-US");
      // The locale's group separator is never a decimal point here, so
      // "1.234,5" (de-DE) and "1,234.5" (en-US) both read as 1234.5.
      const ungrouped = group === decimal ? text : text.split(group).join("");
      const cleaned = ungrouped.replace(new RegExp(`[^0-9${decimal.replace(/[.\\]/g, "\\$&")}]`, "g"), "");
      const dot = cleaned.indexOf(decimal);
      const int = (dot < 0 ? cleaned : cleaned.slice(0, dot)).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      const frac = dot < 0 ? null : cleaned.slice(dot + 1).replace(/\D/g, "").slice(0, 2);
      let out = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
      if (frac !== null) out += decimal + frac;
      return { text: out, sig: sigOf(out, DIGIT) };
    }
    return { text, sig: text.split("").map(() => true) };
  }

  /** The value a server wants: digits (and a point) for currency, the significant characters otherwise. */
  function rawOf(input, formatted) {
    const kind = input.getAttribute("data-mask");
    if (kind === "currency") {
      const { decimal } = separators(input.getAttribute("data-mask-locale") || "en-US");
      const i = formatted.indexOf(decimal);
      const int = (i < 0 ? formatted : formatted.slice(0, i)).replace(/\D/g, "");
      const frac = i < 0 ? "" : formatted.slice(i + 1).replace(/\D/g, "");
      return int ? (frac ? `${int}.${frac}` : int) : "";
    }
    const { sig } = format(input, formatted);
    return formatted.split("").filter((_, i) => sig[i]).join("");
  }

  function checkMask(input, text) {
    const kind = input.getAttribute("data-mask");
    const msg = input.getAttribute("data-msg-mask");
    let bad = false;
    if (kind === "date" && text.length === (input.getAttribute("data-mask-pattern") || "").length) {
      const order = input.getAttribute("data-mask-order") || "mdy";
      const nums = text.split("/").map(Number);
      const d = nums[order.indexOf("d")];
      const m = nums[order.indexOf("m")];
      const y = nums[order.indexOf("y")];
      const days = new Date(y, m, 0).getDate();
      bad = !(m >= 1 && m <= 12) || !(d >= 1 && d <= days);
      input.setCustomValidity(bad ? msg || "Enter a real date" : "");
    } else if (kind === "time" && text.length === 5) {
      const [h, mi] = text.split(":").map(Number);
      bad = h > 23 || mi > 59;
      input.setCustomValidity(bad ? msg || "Enter a time between 00:00 and 23:59" : "");
    } else if (kind === "date" || kind === "time") input.setCustomValidity("");
  }

  function applyMask(input, { caret = true } = {}) {
    const before = input.value;
    const at = input.selectionStart ?? before.length;
    const beforeSig = format(input, before);
    // Significant characters ahead of the caret, in the text as typed —
    // every character the person typed counts, formatting characters do not.
    const typedSig = sigOf(before, input.getAttribute("data-mask") === "currency" ? DIGIT : /[\p{L}0-9+]/u);
    const n = typedSig.slice(0, at).filter(Boolean).length;
    const { text, sig } = beforeSig;
    if (text !== before) input.value = text;
    if (caret && document.activeElement === input) {
      let pos = 0;
      let seen = 0;
      while (pos < text.length && seen < n) {
        if (sig[pos]) seen++;
        pos++;
      }
      // A separator the person typed themselves (a space, a slash, the
      // decimal point) that the mask kept: the caret goes past it.
      const typed = before[at - 1];
      if (at > 0 && !typedSig[at - 1] && text[pos] === typed) pos++;
      input.setSelectionRange(pos, pos);
    }
    checkMask(input, text);
    const raw = input.hasAttribute("data-mask-raw") && input.nextElementSibling?.matches?.("[data-mask-value]")
      ? input.nextElementSibling
      : null;
    if (raw) raw.value = rawOf(input, text);
  }

  // With `data-mask-raw` the name moves to a hidden input the script
  // keeps filled; without the script the visible field submits as typed.
  function prepareMask(input) {
    if (input.hasAttribute("data-mask-ready")) return;
    input.setAttribute("data-mask-ready", "");
    if (input.hasAttribute("data-mask-raw") && input.name) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = input.name;
      hidden.setAttribute("data-mask-value", "");
      input.removeAttribute("name");
      input.after(hidden);
    }
    if (input.value) applyMask(input, { caret: false });
  }

  document.addEventListener("input", (event) => {
    if (event.target?.matches?.("[data-mask]")) applyMask(event.target);
  }, true);

  document.addEventListener("keydown", (event) => {
    const input = event.target;
    if (event.key !== "Backspace" || !input?.matches?.("[data-mask]") || input.selectionStart !== input.selectionEnd) {
      return;
    }
    const { sig } = format(input, input.value);
    let pos = input.selectionStart;
    if (pos > 0 && sig[pos - 1] === false) {
      while (pos > 0 && sig[pos - 1] === false) pos--;
      input.setSelectionRange(pos, pos);
    }
  });

  // Currency: pad to two decimals once the field is left.
  document.addEventListener("focusout", (event) => {
    const input = event.target;
    if (!input?.matches?.("[data-mask='currency']") || !input.value) return;
    const { decimal } = separators(input.getAttribute("data-mask-locale") || "en-US");
    const i = input.value.indexOf(decimal);
    const frac = i < 0 ? "" : input.value.slice(i + 1);
    if (frac.length < 2) {
      input.value = (i < 0 ? input.value : input.value.slice(0, i)) + decimal + frac.padEnd(2, "0");
      applyMask(input, { caret: false });
    }
  });

  function initAll() {
    document.querySelectorAll("[data-mask]").forEach(prepareMask);
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
