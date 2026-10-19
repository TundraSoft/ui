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
    const { theme, themeDefault } = document.documentElement.dataset;
    if (theme === "dark" || theme === "light") return theme;
    if (themeDefault === "dark" || themeDefault === "light") return themeDefault;
    return media?.matches ? "dark" : "light";
  }

  /* ---------------------------------------------------------- formats
   * Options cross from the server as JSON, which has no functions, so a
   * number format arrives as a spec (`data-chart-format`, see chart.ts
   * `ChartFormat`) and becomes an ApexCharts formatter here. */
  const CIRCULAR = new Set(["pie", "donut", "radialBar", "polarArea", "gauge"]);
  // Category axes whose ticks sit ON the points — tickAmount thins them.
  const THINNABLE = new Set(["line", "area", "rangeArea"]);

  function intlOptions(spec) {
    if (spec && typeof spec === "object") return spec.intl ?? { maximumFractionDigits: 2 };
    const [kind, arg] = String(spec).split(":");
    switch (kind) {
      case "integer":
        return { maximumFractionDigits: 0 };
      case "compact":
        return { notation: "compact", maximumFractionDigits: 1 };
      case "percent":
        return { style: "percent", maximumFractionDigits: 1 };
      case "currency":
        return { style: "currency", currency: arg || "USD" };
      case "unit":
        return { style: "unit", unit: arg, maximumFractionDigits: 2 };
      case "number":
        return { maximumFractionDigits: 2 };
      default:
        console.warn(`chart: unknown format "${spec}", using "number"`);
        return { maximumFractionDigits: 2 };
    }
  }

  /** A formatter for a spec: numbers formatted, anything else (a category
   * name on a horizontal bar's axis, a series name) passed through. */
  function formatter(spec) {
    const lang = document.documentElement.lang || undefined;
    let nf;
    try {
      nf = new Intl.NumberFormat(lang, intlOptions(spec));
    } catch (error) {
      console.warn(`chart: format ${JSON.stringify(spec)} is not valid (${error.message}), using "number"`);
      nf = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
    }
    const prefix = (spec && typeof spec === "object" && spec.prefix) || "";
    const suffix = (spec && typeof spec === "object" && spec.suffix) || "";
    return (value) =>
      typeof value === "number" && Number.isFinite(value) ? `${prefix}${nf.format(value)}${suffix}` : value;
  }

  const assign = (obj, path, value) => {
    let at = obj;
    for (const key of path.slice(0, -1)) at = at[key] = at[key] && typeof at[key] === "object" ? at[key] : {};
    at[path[path.length - 1]] = value;
  };
  const eachAxis = (config, key, fn) => {
    if (Array.isArray(config[key])) config[key].forEach(fn);
    else fn(config[key] = config[key] ?? {});
  };

  /** Formatters and readable-axis defaults, written into the config. */
  function format(el, config) {
    let spec = {};
    try {
      spec = JSON.parse(el.dataset.chartFormat || "{}");
    } catch {
      // A malformed attribute is the server's bug; draw with the defaults.
    }
    const type = config.chart?.type;
    const horizontal = !!config.plotOptions?.bar?.horizontal;
    // Values: the y axis (x on a horizontal bar). Always formatted, so a
    // float never prints as 12000.000001; an explicit spec also reaches
    // the tooltip and the data labels.
    const value = formatter(spec.value ?? "number");
    if (CIRCULAR.has(type)) {
      if (spec.value) {
        assign(config, ["tooltip", "y", "formatter"], value);
        assign(config, ["plotOptions", "pie", "donut", "labels", "value", "formatter"], (v) => value(Number(v)));
      }
    } else {
      if (horizontal) eachAxis(config, "xaxis", (axis) => assign(axis, ["labels", "formatter"], value));
      else eachAxis(config, "yaxis", (axis) => assign(axis, ["labels", "formatter"], value));
      if (spec.value) {
        assign(config, ["tooltip", "y", "formatter"], value);
        assign(config, ["dataLabels", "formatter"], value);
      }
    }
    if (spec.x && !CIRCULAR.has(type)) {
      const x = formatter(spec.x);
      if (horizontal) eachAxis(config, "yaxis", (axis) => assign(axis, ["labels", "formatter"], x));
      else assign(config, ["xaxis", "labels", "formatter"], x);
      assign(config, ["tooltip", "x", "formatter"], x);
    }
    // A long category axis on a line/area chart: level labels, thinned to
    // what fits the box, instead of a fan of -45° labels. Only when the
    // options did not set tickAmount themselves.
    const categories = config.xaxis?.categories;
    if (THINNABLE.has(type) && !horizontal && Array.isArray(categories) && config.xaxis.tickAmount === undefined) {
      const longest = categories.reduce((n, c) => Math.max(n, String(c).length), 1);
      const fits = Math.max(2, Math.floor((el.clientWidth || 600) / (longest * 7 + 24)));
      if (categories.length > fits) {
        config.xaxis.tickAmount = fits;
        config.xaxis.labels = { rotate: 0, hideOverlappingLabels: true, ...config.xaxis.labels };
      }
    }
    return config;
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
    const config = format(el, JSON.parse(el.dataset.chart || "{}"));
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
    attributeFilter: ["data-theme", "data-theme-default"],
  });
  media?.addEventListener?.("change", retheme);
})();
