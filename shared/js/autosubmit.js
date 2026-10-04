/*
 * form[data-autosubmit] (Form({ autosubmit })) submits itself when a
 * choice changes — a select (the Select's native control fires `change`
 * on every pick), a radio (Segmented), a checkbox, a date — and on a
 * Combobox pick, but never on typing: a text or search box submits on
 * Enter, as forms do. `requestSubmit()` goes through the whole submit
 * path, so form.js validation, a data-confirm and the rAPId runtime (a
 * form[data-action] is swapped, not navigated) all see a normal submit.
 */
(() => {
  const TYPED = new Set(["text", "search", "email", "url", "tel", "password", "number"]);

  function submit(form) {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.submit();
  }

  document.addEventListener("change", (event) => {
    const control = event.target;
    const form = control?.closest?.("form[data-autosubmit]");
    if (!form || control.form !== form) return;
    if (control.tagName === "TEXTAREA" || (control.tagName === "INPUT" && TYPED.has(control.type))) return;
    // A Combobox's own hidden value, or the parts of a composite control
    // that report through another element, are not the person's choice.
    if (control.type === "hidden" || control.closest("[data-autosubmit-skip]")) return;
    submit(form);
  });

  // A searchable Combobox (not a Select — its native control already
  // fired `change` above) commits its pick to a hidden input.
  document.addEventListener("combobox:pick", (event) => {
    const root = event.target;
    if (root?.closest?.("[data-select]")) return;
    const form = root?.closest?.("form[data-autosubmit]");
    if (form) submit(form);
  });
})();
