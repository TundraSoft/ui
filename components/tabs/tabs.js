/*
 * Tabs: click or arrow-key (Left/Right/Home/End) selection with a roving
 * tabindex, and a `#tab-<id>` deep link honoured on load, on hashchange
 * and after a rAPId swap.
 */
(() => {
  document.addEventListener("click", (event) => {
    const tab = event.target.closest?.(".tabs__tab");
    if (tab) activate(tab);
  });

  document.addEventListener("keydown", (event) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const tab = event.target.closest?.(".tabs__tab");
    if (!tab) return;
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
  }
})();
