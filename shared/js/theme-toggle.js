/*
 * Persists an explicit dark/light choice as `data-theme` on <html>,
 * overriding `prefers-color-scheme` in either direction (see tokens'
 * dark-mode block). A `[data-theme-toggle]` element flips it.
 *
 * Who decides: a `data-theme` the server rendered on <html>
 * (`createCoreTemplate({ htmlAttrs })`, from the person's saved
 * preference) wins, and is stored so a page the server does not render
 * follows it; otherwise the choice stored in this browser applies;
 * otherwise the system's. A toggle dispatches `theme:change`
 * (`detail: { theme }`) on <html> — the hook an app uses to save the
 * choice to the person's profile, so every device follows.
 */
(() => {
  const KEY = "ui-theme";
  const root = document.documentElement;
  const valid = (t) => t === "dark" || t === "light";

  try {
    // Scripts are deferred and none runs inline, so a data-theme present
    // now came from the server.
    if (valid(root.dataset.theme)) localStorage.setItem(KEY, root.dataset.theme);
    else {
      const saved = localStorage.getItem(KEY);
      if (valid(saved)) root.dataset.theme = saved;
    }
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
    root.dispatchEvent(new CustomEvent("theme:change", { bubbles: true, detail: { theme: next } }));
  });
})();
