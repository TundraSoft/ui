/*
 * Tabs: click or arrow-key (Left/Right/Home/End) selection with a roving
 * tabindex, and a `#tab-<id>` deep link honoured on load, on hashchange
 * and after a rAPId swap.
 */
(() => {
  document.addEventListener("click", (event) => {
    const tab = event.target.closest?.(".tabs__tab");
    // TabLinks are plain links to other pages: nothing to activate here.
    if (tab && tab.tagName !== "A") activate(tab);
  });

  document.addEventListener("keydown", (event) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const tab = event.target.closest?.(".tabs__tab");
    if (!tab || tab.tagName === "A") return;
    const list = [...tab.parentElement.querySelectorAll(".tabs__tab")];
    const index = list.indexOf(tab);
    let next;
    if (event.key === "Home") next = list[0];
    else if (event.key === "End") next = list[list.length - 1];
    else if (event.key === "ArrowRight") next = list[(index + 1) % list.length];
    else next = list[(index - 1 + list.length) % list.length];
    event.preventDefault();
    next.focus();
    activate(next);
  });

  function deepLink() {
    if (location.hash.length < 2) return;
    const target = document.querySelector(`.tabs__tab#${CSS.escape(location.hash.slice(1))}`);
    if (!target) return;
    activate(target);
    // Fragment navigation focuses the target element, and since that is
    // not a pointer interaction the tab paints its :focus-visible ring —
    // which reads as a stray border to someone who just clicked a
    // sidebar link. Drop that programmatic focus; keyboard users who
    // Tab into the list still get the ring.
    const unfocus = () => {
      if (document.activeElement === target) target.blur();
    };
    unfocus();
    setTimeout(unfocus, 50);
  }

  deepLink();
  addEventListener("load", deepLink);
  addEventListener("hashchange", deepLink);
  document.addEventListener("rapid:swapped", deepLink);

  function activate(tab) {
    const tabs = tab.closest(".tabs");
    if (!tabs) return;
    tabs.querySelectorAll(":scope > .tabs__list > .tabs__tab").forEach((candidate) => {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", String(selected));
      candidate.setAttribute("tabindex", selected ? "0" : "-1");
    });
    tabs.querySelectorAll(":scope > .tabs__panel").forEach((panel) => {
      panel.toggleAttribute("hidden", panel.id !== tab.getAttribute("aria-controls"));
    });
    place(tab.parentElement);
  }

  /* ------------------------------------------------ sliding indicator */
  // The selected tab's position and width go onto the list as custom
  // properties (CSSOM, CSP-clean); tabs.css paints the bar from them.
  // Measured in the list's content box, so a scrolled strip still lines up.
  function place(list) {
    if (!list?.classList.contains("tabs__list")) return;
    const tab = list.querySelector(
      ':scope > .tabs__tab[aria-selected="true"], :scope > .tabs__tab[aria-current="page"]',
    );
    if (!tab) {
      list.style.setProperty("--tabs-w", "0px");
      return;
    }
    const l = list.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    const rtl = getComputedStyle(list).direction === "rtl";
    const x = rtl ? l.right - t.right - list.scrollLeft : t.left - l.left + list.scrollLeft;
    list.style.setProperty("--tabs-x", `${rtl ? -x : x}px`);
    list.style.setProperty("--tabs-w", `${t.width}px`);
    list.setAttribute("data-tabs-ready", "");
  }

  const watched = new WeakSet();
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver((entries) => entries.forEach((e) => place(e.target)))
    : null;
  const placeAll = () =>
    document.querySelectorAll(".tabs__list").forEach((list) => {
      place(list);
      if (observer && !watched.has(list)) {
        watched.add(list);
        observer.observe(list);
      }
    });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", placeAll);
  else placeAll();
  addEventListener("load", placeAll);
  addEventListener("resize", placeAll, { passive: true });
  document.addEventListener("rapid:swapped", placeAll);
})();
