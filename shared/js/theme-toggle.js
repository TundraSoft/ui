/*
 * Persists an explicit dark/light choice as `data-theme` on <html>,
 * overriding `prefers-color-scheme` in either direction (see tokens'
 * dark-mode block). A `[data-theme-toggle]` element flips it.
 */
(() => {
  const KEY = "ui-theme";
  const root = document.documentElement;

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") root.dataset.theme = saved;
  } catch {
    // localStorage unavailable (private mode, etc.) — falls back to
    // prefers-color-scheme only, which is a fine default.
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-theme-toggle]");
    if (!trigger) return;

    const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme === "dark" ||
        (root.dataset.theme !== "light" && systemDark)
      ? "dark"
      : "light";
    const next = current === "dark" ? "light" : "dark";

    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Same fallback as above — nothing to persist to.
    }
  });
})();
