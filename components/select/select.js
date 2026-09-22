/* Select: keeps the native <select> (the submitted value) and the
 * combobox UI (what the user sees) in step. A pick in the UI sets the
 * native value and fires `change` on it, so anything listening to the
 * native control (filter.js, a form's own script) sees a normal select;
 * a programmatic/autofill change on the native control repaints the UI.
 * Typing in the read-only field jumps to the first option starting with
 * those letters, like a native select does. An option's `lead` (a flag,
 * an avatar) is cloned from the list into the closed field so the field
 * shows what the list showed. */
(() => {
  function ui(select) {
    const root = select.querySelector("[data-select-ui]");
    return root
      ? {
        root,
        input: root.querySelector("input[role='combobox']"),
        hidden: root.querySelector("[data-combobox-value]"),
        options: Array.from(root.querySelectorAll("[role='option']")),
      }
      : null;
  }

  // UI → native
  document.addEventListener("combobox:pick", (event) => {
    const select = event.target.closest?.("[data-select]");
    const native = select?.querySelector(".select__native");
    if (!native) return;
    const value = event.detail?.value ?? "";
    if (native.value !== value) {
      native.value = value;
      native.dispatchEvent(new Event("change", { bubbles: true }));
      native.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  // native → UI
  document.addEventListener("change", (event) => {
    if (!event.target.matches?.(".select__native")) return;
    const select = event.target.closest("[data-select]");
    const u = ui(select);
    if (!u) return;
    const value = event.target.value;
    const picked = u.options.find((o) => o.getAttribute("data-value") === value);
    const label = picked
      ? (picked.querySelector(".combobox__option-label")?.textContent ?? picked.textContent).trim()
      : "";
    if (u.hidden) u.hidden.value = value;
    if (u.input && u.input.value !== label) u.input.value = label;
    const slot = select.querySelector("[data-select-lead]");
    if (slot) {
      const lead = picked?.querySelector(".combobox__option-lead");
      slot.replaceChildren(...(lead ? [...lead.cloneNode(true).childNodes] : []));
    }
    u.options.forEach((o) => o.setAttribute("aria-selected", String(o === picked)));
  });

  // Type-ahead on the read-only field.
  let buffer = "";
  let lastKey = 0;
  document.addEventListener("keydown", (event) => {
    const input = event.target;
    if (!input.matches?.("[data-select-ui] input[role='combobox']")) return;
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    const now = Date.now();
    buffer = now - lastKey > 600 ? event.key : buffer + event.key;
    lastKey = now;
    const select = input.closest("[data-select]");
    const u = ui(select);
    const hit = u?.options.find((o) =>
      o.getAttribute("aria-disabled") !== "true" &&
      (o.querySelector(".combobox__option-label")?.textContent ?? o.textContent).trim().toLowerCase().startsWith(
        buffer.toLowerCase(),
      )
    );
    if (hit) hit.click();
    event.preventDefault();
  });
})();
