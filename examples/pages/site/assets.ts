/**
 * The demo site's own stylesheet and script (demo/site.css, demo/site.js)
 * — harness, not library. The CSS lays out the documentation around the
 * components with tokens only; the script runs the header's display
 * controls (theme, density; dark mode is the library's own
 * theme-toggle.js), reads live token values back onto the token pages, and
 * plays the motion samples.
 */

export const siteCss = `/* Harness-only layout for the demo site — not part of the library. */
.site-page { display: flex; flex-direction: column; gap: var(--space-6); min-width: 0; }
.site-page > .page-header { margin-bottom: 0; }
.site-header__context { color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.site-header__brand { display: inline-flex; align-items: center; gap: var(--space-2); }
.navbar__actions .site-control { --select-min-width: 7rem; width: 9rem; }
.navbar__actions { gap: var(--space-2); }
.site-mode { display: inline-flex; align-items: center; gap: var(--space-2); }
.site-mode--dark { display: none; }
:root[data-theme="dark"] .site-mode--light,
:root[data-theme-default="dark"]:not([data-theme="light"]) .site-mode--light { display: none; }
:root[data-theme="dark"] .site-mode--dark,
:root[data-theme-default="dark"]:not([data-theme="light"]) .site-mode--dark { display: inline-flex; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme-default="light"]) .site-mode--light { display: none; }
  :root:not([data-theme="light"]):not([data-theme-default="light"]) .site-mode--dark { display: inline-flex; }
}
@media screen and (max-width: 575px) {
  .navbar__actions .site-control { width: 7.5rem; }
  .site-header__brand .sidebar__brand-label { display: none; }
}
[data-site-apply-theme][aria-pressed="true"] { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-primary-contrast); }
.sidebar .menu__sublist .menu__sublist { margin-inline-start: var(--space-2); }

.site-import { max-width: 100%; }
.site-section { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; scroll-margin-top: var(--scroll-padding-top); }
.site-section__title { margin: 0; padding-bottom: var(--space-2); border-bottom: var(--border-width) solid var(--color-border); font-size: var(--font-size-xl); }
.site-section__intro { margin: 0; color: var(--color-text-muted); max-width: var(--layout-measure); }
.site-subtitle { margin: var(--space-2) 0 0; font-size: var(--font-size-base); }
.site-usage { display: flex; flex-direction: column; gap: var(--space-2); }
.site-usage__title { margin: var(--space-2) 0 0; font-size: var(--font-size-base); }
.site-chips { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.site-details summary { cursor: pointer; color: var(--color-text-muted); font-size: var(--font-size-sm); padding-block: var(--space-2); }

/* tokens */
.site-tokens { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: var(--space-3); }
.site-tokens--tiles { grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
.site-token { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.site-token__meta { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.site-token__name { font-size: var(--font-size-xs); overflow-wrap: anywhere; }
.site-token__value { font-size: var(--font-size-2xs); color: var(--color-text-muted); overflow-wrap: anywhere; }
.site-swatch { flex: 0 0 auto; width: 2.5rem; height: 2.5rem; border-radius: var(--radius-md); border: var(--border-width) solid var(--color-border); }
.site-bar { flex: 0 0 auto; height: 0.75rem; min-width: 1px; border-radius: var(--radius-sm); background: var(--color-accent, var(--color-primary)); }
.site-tile { flex: 0 0 auto; width: 3.5rem; height: 3.5rem; border: var(--border-width) solid var(--color-border-strong); background: var(--color-surface-sunken); }
.site-tile--raised { border-color: var(--color-border-subtle); background: var(--color-surface); border-radius: var(--radius-md); }
.site-type-sample { flex: 0 0 auto; min-width: 3rem; font-size: var(--font-size-xl); }
.site-table-wrap { position: relative; overflow-x: auto; border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); }
.site-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.site-table th, .site-table td { padding: var(--space-2) var(--space-3); text-align: start; border-bottom: var(--border-width) solid var(--color-border-subtle); }
.site-table thead th { background: var(--color-surface-sunken); font-weight: var(--font-weight-semibold); }

/* typography */
.site-specimen > * { margin: 0 0 var(--space-2); }
.site-scale { display: flex; flex-direction: column; gap: var(--space-3); }
.site-scale li { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-3); border-bottom: var(--border-width) dashed var(--color-border); padding-bottom: var(--space-2); }
.site-scale code { color: var(--color-text-muted); font-size: var(--font-size-xs); }

/* icons */
.site-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: var(--space-2); }
.site-icon { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-3); border: var(--border-width) solid var(--color-border-subtle); border-radius: var(--radius-md); background: var(--color-surface); }

/* utilities */
.site-cell { padding: var(--space-3); border-radius: var(--radius-sm); background: var(--color-surface-sunken); border: var(--border-width) dashed var(--color-border-strong); font-size: var(--font-size-xs); text-align: center; }
.site-dot { width: 0.75rem; height: 0.75rem; border-radius: var(--radius-full); background: var(--color-success); }

/* motion */
.site-eases { display: flex; flex-direction: column; gap: var(--space-3); }
.site-ease { display: grid; grid-template-columns: minmax(0, 1fr) 14rem; align-items: center; gap: var(--space-4); }
.site-ease__track { position: relative; display: block; height: 1.5rem; border-radius: var(--radius-full); background: var(--color-surface-sunken); }
.site-ease__dot { position: absolute; inset-block: 0.25rem; inset-inline-start: 0.25rem; width: 1rem; border-radius: var(--radius-full); background: var(--color-accent, var(--color-primary)); transition: transform var(--duration-slow) var(--ease-out); }
.site-ease.is-playing .site-ease__dot { transform: translateX(var(--site-ease-run, 0)); }
.site-motion-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: var(--space-3); }
.site-motion { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-2); }
.site-motion__stage { display: grid; place-items: center; height: 7rem; overflow: hidden; border-radius: var(--radius-md); background: var(--color-surface-sunken); }
.site-motion__box { width: 3rem; height: 3rem; border-radius: var(--radius-md); background: var(--color-accent, var(--color-primary)); box-shadow: var(--shadow-md); }
.site-motion__box.is-playing { animation-duration: var(--duration-slow); animation-timing-function: var(--ease-out); animation-fill-mode: both; }
@media (max-width: 575px) { .site-ease { grid-template-columns: minmax(0, 1fr); gap: var(--space-1); } }

/* theming */
.site-densities { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: var(--space-4); }
.site-density { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.site-density__label { margin: 0; font-weight: var(--font-weight-semibold); }

/* frame previews */
.site-preview { display: flex; flex-direction: column; gap: var(--space-3); }
.site-preview__bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); }
.site-preview__scroll { position: relative; overflow-x: auto; padding: var(--space-4); border-radius: var(--radius-lg); background: var(--color-surface-sunken); border: var(--border-width) solid var(--color-border-subtle); }
.site-preview__frame { margin-inline: auto; transform-origin: top left; transform: scale(var(--preview-scale, 1)); margin-block-end: calc((var(--preview-scale, 1) - 1) * 40rem); }
.site-preview__frame[data-scaled] { margin-inline: 0; }
.site-preview__frame[data-view="phone"] { inline-size: 375px; }
.site-preview__frame[data-view="tablet"] { inline-size: 768px; }
.site-preview__frame[data-view="desktop"] { inline-size: 1280px; }
.site-preview__frame iframe { display: block; inline-size: 100%; block-size: 40rem; border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-canvas); box-shadow: var(--shadow-md); }
.site-part { max-width: 32rem; }
`;

export const siteJs = `/* Demo site harness (examples/pages/site/assets.ts). */
(() => {
  const root = document.documentElement;
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
  };

  /* Live token values: whatever the page paints with right now. */
  function readTokens() {
    const style = getComputedStyle(root);
    document.querySelectorAll("[data-token-value]").forEach((el) => {
      const value = style.getPropertyValue(el.getAttribute("data-token-value")).trim();
      if (value) el.textContent = value;
    });
    const mode = document.querySelector("[data-site-mode]");
    if (mode) {
      const t = root.dataset.theme || root.dataset.themeDefault ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      mode.textContent = t;
    }
  }

  /* Theme: one stylesheet after the bundle. */
  const link = document.getElementById("theme-css");
  function applyTheme(id, persist) {
    if (!link) return;
    if (!id || id === "base") link.removeAttribute("href");
    else link.setAttribute("href", link.getAttribute("data-themes") + id + ".css");
    if (persist) store.set("site-theme", id || "base");
    document.querySelectorAll("[data-site-apply-theme]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.getAttribute("data-site-apply-theme") === (id || "base")))
    );
    postToFrames();
    const native = document.getElementById("site-theme-native");
    if (native && native.value !== (id || "base")) {
      native.value = id || "base";
      native.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  link?.addEventListener("load", readTokens);

  /* Density: data-density on <html> re-derives every control height. */
  function applyDensity(id, persist) {
    if (!id || id === "default") delete root.dataset.density;
    else root.dataset.density = id;
    if (persist) store.set("site-density", id || "default");
    const native = document.getElementById("site-density-native");
    if (native && native.value !== (id || "default")) {
      native.value = id || "default";
      native.dispatchEvent(new Event("change", { bubbles: true }));
    }
    readTokens();
  }

  document.addEventListener("change", (event) => {
    if (event.target.id === "site-theme-native") applyTheme(event.target.value, true);
    if (event.target.id === "site-density-native") applyDensity(event.target.value, true);
  });
  document.addEventListener("click", (event) => {
    const apply = event.target.closest("[data-site-apply-theme]");
    if (apply) applyTheme(apply.getAttribute("data-site-apply-theme"), true);

    /* Motion: replay one keyframe on its sample. */
    const play = event.target.closest("[data-motion-play]");
    const box = play && document.querySelector(play.getAttribute("data-motion-target"));
    if (box) {
      box.classList.remove("is-playing");
      box.style.removeProperty("animation-name");
      void box.offsetWidth;
      box.style.setProperty("animation-name", play.getAttribute("data-motion-play"));
      box.classList.add("is-playing");
    }

    /* Motion: run every duration/easing lane across its track. */
    if (event.target.closest("[data-motion-lanes]")) {
      document.querySelectorAll("[data-motion-lane]").forEach((lane) => {
        const track = lane.querySelector(".site-ease__track");
        const dot = lane.querySelector(".site-ease__dot");
        const run = track.clientWidth - dot.offsetWidth - 8;
        lane.style.setProperty("--site-ease-run", (getComputedStyle(root).direction === "rtl" ? -run : run) + "px");
        lane.classList.toggle("is-playing");
      });
    }

    /* [data-cat-swap-in="#template"] stands in for a server swap on a static
       page: it appends the template's content to <body> and dispatches
       rapid:swapped there, as the runtime would. */
    const swapIn = event.target.closest("[data-cat-swap-in]");
    const tpl = swapIn && document.querySelector(swapIn.getAttribute("data-cat-swap-in"));
    if (tpl) {
      const holder = document.createElement("div");
      holder.append(tpl.content.cloneNode(true));
      document.body.append(holder);
      holder.dispatchEvent(new CustomEvent("rapid:swapped", { bubbles: true, detail: { method: "get" } }));
    }
  });
  document.addEventListener("theme:change", () => requestAnimationFrame(readTokens));
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", readTokens);

  /* Frames (layout and error samples) follow the site's display settings.
     file:// pages are opaque origins, so this goes by postMessage to
     frame.js rather than through contentDocument. */
  function postToFrames() {
    const href = link && link.getAttribute("href");
    const state = {
      site: "display",
      theme: root.dataset.theme || "",
      density: root.dataset.density || "",
      themeHref: href ? new URL(href, location.href).href : "",
    };
    document.querySelectorAll(".site-preview iframe").forEach((f) => f.contentWindow?.postMessage(state, "*"));
  }
  document.querySelectorAll(".site-preview iframe").forEach((f) => f.addEventListener("load", postToFrames));
  new MutationObserver(postToFrames).observe(root, { attributeFilter: ["data-theme", "data-density"] });

  /* Frame previews wider than their column are scaled down to fit it. */
  function fitPreviews() {
    document.querySelectorAll(".site-preview__frame").forEach((frame) => {
      const room = frame.parentElement.clientWidth - 2 * parseFloat(getComputedStyle(frame.parentElement).paddingInlineStart);
      const scale = Math.min(1, room / frame.offsetWidth);
      frame.style.setProperty("--preview-scale", String(scale));
      frame.toggleAttribute("data-scaled", scale < 1);
    });
  }
  const resize = new ResizeObserver(fitPreviews);
  document.querySelectorAll(".site-preview__scroll").forEach((el) => resize.observe(el));
  new MutationObserver(fitPreviews).observe(document.body, { subtree: true, attributeFilter: ["data-view"] });

  function init() {
    applyTheme(store.get("site-theme"), false);
    applyDensity(store.get("site-density"), false);
    readTokens();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
`;

/** Loaded by every frame (demo/frames/*.html): applies the display settings its parent page posts. */
export const frameJs = `/* Demo frame harness (examples/pages/site/assets.ts). */
(() => {
  if (window.parent === window) return;
  addEventListener("message", (event) => {
    const d = event.data;
    if (!d || d.site !== "display") return;
    const root = document.documentElement;
    if (d.theme) root.dataset.theme = d.theme; else delete root.dataset.theme;
    if (d.density) root.dataset.density = d.density; else delete root.dataset.density;
    let link = document.getElementById("frame-theme");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "frame-theme";
      document.head.append(link);
    }
    if (d.themeHref) link.href = d.themeHref; else link.removeAttribute("href");
  });
})();
`;
