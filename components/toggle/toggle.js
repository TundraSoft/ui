/*
 * Toggle: a click flips aria-pressed; in an exclusive group
 * ([data-toggle-exclusive]) the others unpress; Left/Right (Up/Down)
 * move focus within a group; a toggle with a name + value keeps its
 * hidden input enabled only while pressed, so a form submits the state.
 * Dispatches `toggle:change` ({ pressed, value }) on the button.
 */
(() => {
  function setPressed(button, on) {
    button.setAttribute("aria-pressed", on ? "true" : "false");
    const mirror = button.querySelector("[data-toggle-mirror]");
    if (mirror) mirror.disabled = !on;
    button.dispatchEvent(
      new CustomEvent("toggle:change", {
        bubbles: true,
        detail: { pressed: on, value: button.getAttribute("data-toggle-value") },
      }),
    );
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-toggle-button]");
    if (!button || button.disabled) return;
    const on = button.getAttribute("aria-pressed") !== "true";
    const group = button.closest("[data-toggle-group]");
    if (group?.hasAttribute("data-toggle-exclusive")) {
      if (!on) return; // the pressed one stays pressed, like a radio
      group.querySelectorAll('[data-toggle-button][aria-pressed="true"]').forEach((other) => {
        if (other !== button) setPressed(other, false);
      });
    }
    setPressed(button, on);
  });

  document.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const button = event.target.closest?.("[data-toggle-group] > [data-toggle-button]");
    if (!button) return;
    const all = [...button.parentElement.querySelectorAll(":scope > [data-toggle-button]:not(:disabled)")];
    const i = all.indexOf(button);
    if (i < 0) return;
    let next;
    if (event.key === "Home") next = all[0];
    else if (event.key === "End") next = all[all.length - 1];
    else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = all[(i + 1) % all.length];
    else next = all[(i - 1 + all.length) % all.length];
    event.preventDefault();
    next.focus();
  });
})();
