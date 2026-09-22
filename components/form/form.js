/*
 * Client-side validation for form[data-validate] (Form({ validate })).
 * Native first: the rules are the browser's own constraint attributes
 * (required, type, minlength, maxlength, pattern, min, max, step) plus
 * two the browser has no attribute for — data-match="#other" (a confirm
 * field) and a password strength floor (password.js sets a custom
 * validity). The browser's bubble is replaced (novalidate) by the same
 * message rendered inline in the field's error slot — the markup
 * FormField renders for a server error, so both look alike.
 *
 * Timing: a field is checked when it loses focus for the first time,
 * then on every keystroke while it shows an error; on submit every field
 * is checked, the submit is stopped before the rAPId runtime sees it
 * (capture phase — the runtime's own listener is registered first), and
 * the first invalid field gets focus. Messages: data-msg-<rule> on the
 * control (Input({ messages })), else data-msg, else the browser's
 * localized text. A server-rendered error is left alone until the user
 * edits that field. Without JS: native validation, unchanged.
 *
 * Async checks: a control with data-validate-action is, on blur and once
 * the native rules pass, POSTed (`name=value`, urlencoded, CSRF header
 * from the same <body data-*> the runtime reads) to that route; a
 * non-empty text reply is shown as the field's error and pinned with
 * setCustomValidity until the value changes. `aria-busy` marks the
 * pending state; a newer check aborts an older one.
 *
 * Guard: form[data-guard] (Form({ guard })) asks before the page is left
 * once any field changed, until the form submits (validly) or resets.
 */
(() => {
  const CONTROLS = "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), textarea, select";
  // validity flag → data-msg suffix
  const RULES = [
    ["valueMissing", "required"],
    ["typeMismatch", "type"],
    ["badInput", "type"],
    ["patternMismatch", "pattern"],
    ["tooShort", "min-length"],
    ["tooLong", "max-length"],
    ["rangeUnderflow", "min"],
    ["rangeOverflow", "max"],
    ["stepMismatch", "step"],
  ];

  const formOf = (el) => el.closest?.("form[data-validate]");
  const visible = (control) => control.type === "checkbox" || control.type === "radio" || control.offsetParent !== null;

  /** Apply the rules the browser cannot express, then read the outcome. */
  function message(control) {
    const match = control.getAttribute("data-match");
    if (match) {
      const other = document.querySelector(match);
      const differs = other && control.value !== "" && control.value !== other.value;
      control.setCustomValidity(differs ? control.getAttribute("data-msg-match") || "Does not match" : "");
    }
    const v = control.validity;
    if (v.valid) return "";
    if (v.customError) return control.validationMessage;
    for (const [flag, rule] of RULES) {
      if (v[flag]) {
        return control.getAttribute(`data-msg-${rule}`) || control.getAttribute("data-msg") ||
          control.validationMessage;
      }
    }
    return control.validationMessage;
  }

  const errorId = (control) => (control.id ? `${control.id}-error` : "");

  function render(control, text) {
    const field = control.closest(".form-field") ?? control.parentElement;
    const base = control.classList[0] || "input";
    let error = field.querySelector(":scope > .form-field__error");
    const help = field.querySelector(":scope > .form-field__help");
    if (text) {
      if (!error) {
        error = document.createElement("p");
        error.className = "form-field__error";
        error.setAttribute("role", "alert");
        if (errorId(control)) error.id = errorId(control);
        (help ?? field).insertAdjacentElement(help ? "beforebegin" : "beforeend", error);
      }
      error.textContent = text;
      if (help) help.hidden = true;
      control.setAttribute("aria-invalid", "true");
      control.classList.add(`${base}--invalid`);
      const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
      if (error.id && !ids.includes(error.id)) control.setAttribute("aria-describedby", [...ids, error.id].join(" "));
      control.dataset.validated = "invalid";
    } else {
      error?.remove();
      if (help) help.hidden = false;
      control.removeAttribute("aria-invalid");
      control.classList.remove(`${base}--invalid`);
      const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) =>
        id && id !== errorId(control)
      );
      if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
      else control.removeAttribute("aria-describedby");
      control.dataset.validated = "valid";
    }
  }

  const check = (control) => {
    if (!visible(control) || control.disabled) return true;
    const text = message(control);
    render(control, text);
    return !text;
  };

  // First blur marks the field; from then on it is live.
  document.addEventListener("focusout", (event) => {
    const control = event.target;
    if (!control?.matches?.(CONTROLS) || !formOf(control)) return;
    control.dataset.touched = "";
    check(control);
  });

  document.addEventListener("input", (event) => {
    const control = event.target;
    if (!control?.matches?.(CONTROLS)) return;
    const form = formOf(control);
    if (!form) return;
    // A server-rendered error is left until the user edits the field —
    // which is now.
    if (
      control.dataset.touched !== undefined || control.dataset.validated ||
      control.getAttribute("aria-invalid") === "true"
    ) {
      control.dataset.touched = "";
      check(control);
    }
    // A confirm field re-checks when the field it matches changes.
    if (control.id) {
      form.querySelectorAll(`[data-match="#${CSS.escape(control.id)}"]`).forEach((other) => {
        if (other.dataset.touched !== undefined) check(other);
      });
    }
  });
  document.addEventListener("change", (event) => {
    const control = event.target;
    if (control?.matches?.(CONTROLS) && formOf(control) && control.dataset.touched !== undefined) check(control);
  });

  /* -------------------------------------------- async validation */
  const inflight = new WeakMap();
  const cookie = (name) => {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  async function remoteCheck(control) {
    const url = control.getAttribute("data-validate-action");
    if (!url || !control.value || !control.validity.valid) return;
    inflight.get(control)?.abort();
    const controller = new AbortController();
    inflight.set(control, controller);
    control.setAttribute("aria-busy", "true");
    const cfg = document.body?.dataset ?? {};
    // The swap header makes rAPId answer with the fragment alone, not the page.
    const headers = { "content-type": "application/x-www-form-urlencoded", [cfg.swapHeader || "rapid-swap"]: "1" };
    const token = cookie(cfg.csrfCookie || "csrf");
    if (token) headers[cfg.csrfHeader || "x-csrf-token"] = token;
    const value = control.value;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: new URLSearchParams({ [control.name || "value"]: value }).toString(),
        signal: controller.signal,
        credentials: "same-origin",
      });
      // The reply is an HTML fragment (a template's output): take its text.
      const raw = res.ok ? await res.text() : "";
      const text = new DOMParser().parseFromString(raw, "text/html").body.textContent.trim();
      if (control.value !== value) return; // stale
      control.setCustomValidity(text);
      control.dataset.remoteValue = value;
      render(control, text);
    } catch {
      // network / aborted: say nothing, the server decides on submit
    } finally {
      if (inflight.get(control) === controller) {
        inflight.delete(control);
        control.removeAttribute("aria-busy");
      }
    }
  }
  document.addEventListener("focusout", (event) => {
    const control = event.target;
    if (control?.matches?.("[data-validate-action]") && formOf(control)) remoteCheck(control);
  });
  document.addEventListener("input", (event) => {
    const control = event.target;
    if (
      control?.matches?.("[data-validate-action]") && control.dataset.remoteValue !== undefined &&
      control.value !== control.dataset.remoteValue
    ) {
      delete control.dataset.remoteValue;
      control.setCustomValidity("");
      if (control.dataset.touched !== undefined) check(control);
    }
  });

  /* ------------------------------------------------------- guard */
  const dirtyForms = () => document.querySelectorAll("form[data-guard][data-dirty]");
  for (const type of ["input", "change"]) {
    document.addEventListener(type, (event) => {
      const form = event.target?.closest?.("form[data-guard]");
      if (form) form.dataset.dirty = "";
    });
  }
  document.addEventListener("reset", (event) => {
    if (event.target?.matches?.("form[data-guard]")) delete event.target.dataset.dirty;
  });
  addEventListener("beforeunload", (event) => {
    if (!dirtyForms().length) return;
    event.preventDefault();
    event.returnValue = "";
  });

  // Capture phase: runs before the rAPId runtime's (bubbling) submit
  // listener, so an invalid form never leaves the page.
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form?.matches?.("form[data-validate]")) return;
    let first = null;
    for (const control of form.querySelectorAll(CONTROLS)) {
      control.dataset.touched = "";
      if (!check(control) && !first) first = control;
    }
    if (!first) {
      delete form.dataset.dirty; // a valid submit leaves nothing unsaved
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    first.scrollIntoView({ block: "center" });
    first.focus();
  }, true);
  // A guarded form that submits natively (no data-validate) is not unsaved either.
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form?.matches?.("form[data-guard]:not([data-validate])")) delete form.dataset.dirty;
  }, true);

  function initAll() {
    document.querySelectorAll("form[data-validate]").forEach((form) => form.setAttribute("novalidate", ""));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
