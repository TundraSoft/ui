/*
 * FAB: with data-fab-hide-on-scroll the button slides away while the
 * page scrolls down and returns on the way up (rAF-throttled; under
 * reduced motion the class still flips, the CSS just does not animate).
 */
(() => {
  let last = scrollY;
  let ticking = false;

  function update() {
    ticking = false;
    const y = scrollY;
    const down = y > last + 4;
    const up = y < last - 4;
    if (down || up || y < 8) {
      document.querySelectorAll("[data-fab-hide-on-scroll]").forEach((fab) => {
        fab.classList.toggle("fab--hidden", down && y > 80);
      });
    }
    last = y;
  }

  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
})();
