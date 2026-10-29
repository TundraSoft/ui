/*
 * Banner: a strip with `data-banner-key` is rendered hidden and shown only
 * when this browser has not dismissed it before (localStorage under that
 * key; an in-memory set when storage is unavailable, so a private window
 * still sees it once per page). Dismissing (the [data-dismiss] button —
 * shared/js/dismiss.js removes the strip) records the key. Re-checked
 * after a rAPId swap brings a new strip in.
 */
(() => {
  const PREFIX = "ui-banner:";
  const memory = new Set();

  const dismissed = (key) => {
    try {
      return localStorage.getItem(PREFIX + key) === "1";
    } catch {
      return memory.has(key);
    }
  };
  const remember = (key) => {
    memory.add(key);
    try {
      localStorage.setItem(PREFIX + key, "1");
    } catch {
      // Nothing to persist to — the in-memory set holds for this page.
    }
  };

  function initAll(root = document) {
    root.querySelectorAll?.("[data-banner][data-banner-key]").forEach((banner) => {
      const key = banner.getAttribute("data-banner-key");
      if (!key) return;
      if (dismissed(key)) banner.remove();
      else banner.hidden = false;
    });
  }

  // Before dismiss.js removes the strip (it registers later in the bundle
  // only by file order — capture keeps this independent of that).
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-dismiss]");
    const banner = trigger?.closest("[data-banner][data-banner-key]");
    const key = banner?.getAttribute("data-banner-key");
    if (key) remember(key);
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
  document.addEventListener("rapid:swapped", (event) => initAll(event.target));
})();
