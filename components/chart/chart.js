/* Chart: draws every [data-chart] with ApexCharts once the (deferred,
 * pinned — see chart.ts) engine is present; a silent no-op without it.
 * Colours come from the library's tokens: chart.css maps ApexCharts'
 * `--apx-*` design tokens onto ours, the engine reads them on every
 * render, and this script re-renders on a light/dark switch (the
 * `data-theme` attribute or the OS preference) so charts follow the page.
 * Idempotent per element (data-chart-initialized); re-runs after a
 * rAPId swap; destroys the instance when its element leaves the DOM. */
(() => {
  const SELECTOR = "[data-chart]";
  const live = new Set();
  const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");

  function mode() {
    const forced = document.documentElement.dataset.theme;
    if (forced === "dark" || forced === "light") return forced;
    return media?.matches ? "dark" : "light";
  }

  function themeOptions() {
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-family-base").trim();
    return {
      theme: { mode: mode(), tokens: true },
      chart: font ? { fontFamily: font, background: "transparent" } : { background: "transparent" },
    };
  }

  function init(el) {
    if (el.dataset.chartInitialized) return;
    if (typeof globalThis.ApexCharts === "undefined") return;
    const config = JSON.parse(el.dataset.chart || "{}");
    const theme = themeOptions();
    const options = {
      ...config,
      theme: { ...theme.theme, ...(config.theme || {}) },
      chart: { ...theme.chart, ...(config.chart || {}) },
    };
    const chart = new globalThis.ApexCharts(el, options);
    el.dataset.chartInitialized = "true";
    el.chart = chart;
    live.add(el);
    chart.render();
  }

  function destroy(el) {
    if (!el.chart) return;
    el.chart.destroy();
    delete el.chart;
    delete el.dataset.chartInitialized;
    live.delete(el);
  }

  function retheme() {
    for (const el of live) {
      if (!el.isConnected) {
        destroy(el);
        continue;
      }
      el.chart.refreshTokens?.();
      el.chart.updateOptions(themeOptions(), false, true);
    }
  }

  const initAll = () => document.querySelectorAll(SELECTOR).forEach(init);
  initAll();
  // The engine is a `defer`red script that runs after this bundle but
  // before `load` — try again then. init is idempotent.
  addEventListener("load", initAll);
  document.addEventListener("rapid:swapped", initAll);

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(SELECTOR)) init(node);
        node.querySelectorAll?.(SELECTOR).forEach(init);
      }
      for (const node of mutation.removedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(SELECTOR)) destroy(node);
        node.querySelectorAll?.(SELECTOR).forEach(destroy);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  new MutationObserver(retheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  media?.addEventListener?.("change", retheme);
})();
