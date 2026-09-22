/*
 * Desktop "mini sidebar" collapse — distinct from shared/js/toggle.js's
 * [data-toggle], which also hides the target via the `hidden` attribute
 * (wrong here: a collapsed sidebar must stay visible, just narrower).
 *
 * Flyouts: in the collapsed rail a parent item's sublist has nowhere to
 * open (labels are hidden, the rail is 4.5rem wide), so when toggle.js
 * opens one it is shown as a panel floating beside the rail — fixed at
 * the trigger's row, titled with the parent's label, closed by an outside
 * click, Escape, a scroll, a resize, or expanding the sidebar again.
 * Positioned through the CSSOM (CSP-clean), like dropdown.js.
 */
(() => {
  const KEY = "ui-sidebar-collapsed";
  const FLYOUT = "menu__sublist--flyout";

  const flyouts = () => document.querySelectorAll(`.${FLYOUT}`);

  function closeFlyout(sublist) {
    sublist.classList.remove(FLYOUT, "is-open");
    sublist.hidden = true;
    sublist.style.removeProperty("left");
    sublist.style.removeProperty("top");
    sublist.querySelector(".menu__flyout-title")?.remove();
    document.querySelector(`[data-toggle="#${CSS.escape(sublist.id)}"]`)?.setAttribute("aria-expanded", "false");
  }
  const closeFlyouts = () => flyouts().forEach(closeFlyout);

  function openFlyout(sublist, trigger, sidebar) {
    flyouts().forEach((other) => other !== sublist && closeFlyout(other));
    if (!sublist.querySelector(".menu__flyout-title")) {
      const title = document.createElement("li");
      title.className = "menu__flyout-title";
      title.textContent = trigger.querySelector(".menu__link-label")?.textContent?.trim() ?? "";
      sublist.prepend(title);
    }
    sublist.classList.add(FLYOUT);
    const r = trigger.getBoundingClientRect();
    const s = sidebar.getBoundingClientRect();
    sublist.style.left = `${s.right + 4}px`;
    sublist.style.top = `${r.top}px`;
    const height = sublist.offsetHeight;
    if (r.top + height > innerHeight - 8) sublist.style.top = `${Math.max(8, innerHeight - 8 - height)}px`;
  }

  try {
    if (localStorage.getItem(KEY) === "1") {
      document.querySelectorAll(".sidebar").forEach((el) => {
        el.classList.add("sidebar--collapsed");
      });
    }
  } catch {
    // No persistence available — starts expanded, which is fine.
  }

  // A parent item clicked in the collapsed rail: toggle.js (registered
  // later) flips the sublist on this same click, so look after it ran.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.(".sidebar--collapsed .menu__link[data-toggle]");
    if (trigger) {
      const sidebar = trigger.closest(".sidebar");
      const sublist = document.querySelector(trigger.getAttribute("data-toggle"));
      if (!sublist || !sidebar) return;
      setTimeout(() => {
        if (sublist.hidden) closeFlyout(sublist);
        else openFlyout(sublist, trigger, sidebar);
      }, 0);
      return;
    }
    if (!event.target.closest?.(`.${FLYOUT}`)) closeFlyouts();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || !flyouts().length) return;
    const open = [...flyouts()];
    closeFlyouts();
    document.querySelector(`[data-toggle="#${CSS.escape(open[0].id)}"]`)?.focus();
    event.preventDefault();
  });
  addEventListener("scroll", closeFlyouts, { capture: true, passive: true });
  addEventListener("resize", closeFlyouts, { passive: true });

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

    closeFlyouts();
    const collapsed = target.classList.toggle("sidebar--collapsed");
    trigger.setAttribute("aria-expanded", String(!collapsed));
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      // Same fallback as above.
    }
  });
})();
