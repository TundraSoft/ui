/*
 * Menu: mark the link matching the *full* current URL (path + hash) as
 * the current page, and open the sublist it sits in. The server can only
 * match on the path — a link like `settings.html#tab-billing` is one of
 * several children of the same page, and only the browser knows which
 * one the user followed. Runs on load and on every hash change.
 */
(() => {
  function sync() {
    const here = location.href;
    let matched = null;
    document.querySelectorAll(".menu__link[href]").forEach((link) => {
      if (!link.getAttribute("href")?.includes("#")) return;
      const target = new URL(link.getAttribute("href"), location.href).href;
      if (target === here) matched = link;
    });
    if (!matched) return;

    matched.closest(".menu__list")?.querySelectorAll(".menu__link").forEach((link) => {
      if (link !== matched && link.getAttribute("href")?.includes("#")) {
        link.classList.remove("menu__link--active");
        link.removeAttribute("aria-current");
      }
    });
    matched.classList.add("menu__link--active");
    matched.setAttribute("aria-current", "page");

    const sublist = matched.closest(".menu__sublist");
    if (sublist) {
      sublist.hidden = false;
      sublist.classList.add("is-open");
      document.querySelector(`[data-toggle="#${CSS.escape(sublist.id)}"]`)
        ?.setAttribute("aria-expanded", "true");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }
  addEventListener("hashchange", sync);
  document.addEventListener("rapid:swapped", sync);
})();
