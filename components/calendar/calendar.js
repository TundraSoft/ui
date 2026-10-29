/*
 * Calendar: "+N more" unfolds the day's hidden event chips. The chips are
 * server-rendered with `hidden`, so a page without JS shows the first
 * few and the button is inert; the month links are plain links (or rAPId
 * swaps) and need nothing here.
 */
(() => {
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-calendar-more]");
    if (!button) return;
    const day = button.closest(".calendar__day");
    if (!day) return;
    day.querySelectorAll(".calendar__event[hidden]").forEach((chip) => {
      chip.hidden = false;
    });
    button.setAttribute("aria-expanded", "true");
    // The button hides itself (CSS); keep the keyboard somewhere useful.
    day.querySelector(".calendar__event:not([hidden])")?.focus?.();
  });
})();
