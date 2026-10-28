/*
 * Back to top: `[data-back-to-top]` buttons show (hidden cleared, the CSS
 * rise plays) once the page has scrolled past `data-back-to-top-threshold`
 * px and hide again (uiMotion.exit, then hidden) above it. A click scrolls
 * to the top — smooth unless reduced motion is preferred — and moves focus
 * to the main content (#main-content, else <main>, else the first link or
 * control), so a keyboard user continues from the top too. A static button
 * (no threshold attribute) only scrolls.
 */
(() => {
  const buttons = () => document.querySelectorAll("[data-back-to-top][data-back-to-top-threshold]");
  const reduced = () => globalThis.uiMotion.reduced(); // shared/js/motion.js

  function sync(button) {
    const threshold = Number(button.getAttribute("data-back-to-top-threshold")) || 600;
    const show = scrollY > threshold;
    if (show) {
      if (!button.hidden && !globalThis.uiMotion?.isExiting(button)) return;
      globalThis.uiMotion?.cancelExit(button);
      button.hidden = false;
      return;
    }
    if (button.hidden || globalThis.uiMotion?.isExiting(button)) return;
    const hide = () => {
      button.hidden = true;
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(button, hide);
    else hide();
  }

  const syncAll = () => buttons().forEach(sync);

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncAll();
    });
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-back-to-top]");
    if (!button) return;
    scrollTo({ top: 0, left: 0, behavior: reduced() ? "auto" : "smooth" });
    const target = document.getElementById("main-content") ?? document.querySelector("main") ??
      document.querySelector("a[href], button, input, select, textarea");
    if (!target) return;
    if (!target.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  });

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  addEventListener("load", syncAll);
  document.addEventListener("rapid:swapped", syncAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncAll);
  else syncAll();
})();
