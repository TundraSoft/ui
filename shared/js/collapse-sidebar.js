/*
 * Desktop "mini sidebar" collapse — distinct from shared/js/toggle.js's
 * [data-toggle], which also hides the target via the `hidden` attribute
 * (wrong here: a collapsed sidebar must stay visible, just narrower).
 */
(() => {
  const KEY = "ui-sidebar-collapsed";

  try {
    if (localStorage.getItem(KEY) === "1") {
      document.querySelectorAll(".sidebar").forEach((el) => {
        el.classList.add("sidebar--collapsed");
      });
    }
  } catch {
    // No persistence available — starts expanded, which is fine.
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-collapse]");
    if (!trigger) return;
    const selector = trigger.getAttribute("data-collapse");
    if (!selector || selector === "#") return;
    const target = document.querySelector(selector);
    if (!target) return;

    const collapsed = target.classList.toggle("sidebar--collapsed");
    trigger.setAttribute("aria-expanded", String(!collapsed));
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      // Same fallback as above.
    }
  });
})();
