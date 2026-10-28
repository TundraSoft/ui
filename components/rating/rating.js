/*
 * Rating: the radios do the work. This dispatches `rating:change`
 * ({ value }) on the group and, with data-rating-clearable, lets a
 * click on the already-picked star clear the rating.
 */
(() => {
  document.addEventListener("click", (event) => {
    const label = event.target.closest?.("[data-rating-clearable] .rating__label");
    if (!label) return;
    const input = document.getElementById(label.getAttribute("for") ?? "");
    if (!(input instanceof HTMLInputElement) || input.disabled || !input.checked) return;
    event.preventDefault();
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // The radios sit reversed in the DOM (so CSS can fill "up to the pick"),
  // which would make Right/Up move to a lower star: move in visual order.
  document.addEventListener("keydown", (event) => {
    const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    const step = keys[event.key];
    const input = event.target;
    if (!step || !(input instanceof HTMLInputElement) || !input.classList.contains("rating__input")) return;
    const group = input.closest("[data-rating]");
    if (!group) return;
    const all = [...group.querySelectorAll(".rating__input:not(:disabled)")].reverse(); // visual order: 1 … max
    const i = all.indexOf(input);
    const next = all[(i + step + all.length) % all.length];
    if (!next) return;
    event.preventDefault();
    next.checked = true;
    next.focus();
    next.dispatchEvent(new Event("change", { bubbles: true }));
  });

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("rating__input")) return;
    const group = input.closest("[data-rating]");
    const picked = group?.querySelector(".rating__input:checked");
    group?.dispatchEvent(
      new CustomEvent("rating:change", { bubbles: true, detail: { value: picked ? Number(picked.value) : 0 } }),
    );
  });
})();
