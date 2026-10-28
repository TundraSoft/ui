/*
 * Persists an explicit dark/light choice as `data-theme` on <html>,
 * overriding `prefers-color-scheme` in either direction (see tokens'
 * dark-mode block). A `[data-theme-toggle]` element flips it.
 *
 * Who decides: a `data-theme` the server rendered on <html>
 * (`createCoreTemplate({ htmlAttrs })`, from the person's saved
 * preference) wins, and is stored so a page the server does not render
 * follows it; otherwise the choice stored in this browser applies;
 * otherwise the site's default, `data-theme-default` on <html> (a
 * dark-first theme renders `data-theme-default="dark"`; the tokens honour
 * it in CSS, so it paints right with no script); otherwise the system's.
 * The default is never stored — it is not the person's choice. A toggle
 * dispatches `theme:change`
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

    const fallback = valid(root.dataset.themeDefault)
      ? root.dataset.themeDefault
      : matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const current = valid(root.dataset.theme) ? root.dataset.theme : fallback;
    const next = current === "dark" ? "light" : "dark";

    // The palette cross-fades instead of snapping: a View Transition where
    // the browser has one, else one beat of colour transitions on every
    // element (styles/motion.css `.theme-changing`). Not under reduced motion.
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = () => {
      root.dataset.theme = next;
    };
    if (reduced) apply();
    else if (typeof document.startViewTransition === "function") document.startViewTransition(apply);
    else {
      root.classList.add("theme-changing");
      apply();
      setTimeout(() => root.classList.remove("theme-changing"), 260);
    }
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Same fallback as above — nothing to persist to.
    }
    root.dispatchEvent(new CustomEvent("theme:change", { bubbles: true, detail: { theme: next } }));
  });
})();
