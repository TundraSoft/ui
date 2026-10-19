import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";

/**
 * The one charting engine this library supports: ApexCharts, pinned.
 * It is NOT bundled (§8: a small, stable set of file paths) — a page adds
 * it with `ChartScript()` (static HTML) or
 * `createCoreTemplate({ scripts: [APEXCHARTS] })` (a rAPId app), and
 * chart.js (this component's behaviour script) renders every
 * `[data-chart]` it finds once `window.ApexCharts` exists — a silent
 * no-op on a page that never loaded the library. Bump the version here
 * and nowhere else; the integrity hash is the sha384 of the file at
 * that exact URL (`openssl dgst -sha384 -binary | base64`).
 */
export const APEXCHARTS: { readonly version: string; readonly src: string; readonly integrity: string } = {
  version: "7.4.0",
  src: "https://cdn.jsdelivr.net/npm/apexcharts@7.4.0/dist/apexcharts.min.js",
  integrity: "sha384-fnhrfzODrKsQTTXTYoDIc5f/SIP1KuiO4hz6PmkcIBHYVaAj8QpSOtByqodkU2iO",
};

/** The pinned, integrity-checked, deferred `<script>` for a static page. */
export function ChartScript(): Html {
  return html`<script src="${APEXCHARTS.src}" integrity="${APEXCHARTS.integrity}" crossorigin="anonymous" defer></script>`;
}

/** Every `chart.type` ApexCharts ${APEXCHARTS.version} renders. */
export type ChartType =
  | "line"
  | "area"
  | "bar"
  | "pie"
  | "donut"
  | "radialBar"
  | "scatter"
  | "bubble"
  | "heatmap"
  | "candlestick"
  | "boxPlot"
  | "violin"
  | "histogram"
  | "radar"
  | "polarArea"
  | "rangeBar"
  | "rangeArea"
  | "waterfall"
  | "dumbbell"
  | "streamgraph"
  | "raincloud"
  | "treemap"
  | "unit"
  | "waffle"
  | "sunburst"
  | "funnel"
  | "pyramid"
  | "gauge";

export const chartTypes: readonly ChartType[] = [
  "line",
  "area",
  "bar",
  "pie",
  "donut",
  "radialBar",
  "scatter",
  "bubble",
  "heatmap",
  "candlestick",
  "boxPlot",
  "violin",
  "histogram",
  "radar",
  "polarArea",
  "rangeBar",
  "rangeArea",
  "waterfall",
  "dumbbell",
  "streamgraph",
  "raincloud",
  "treemap",
  "unit",
  "waffle",
  "sunburst",
  "funnel",
  "pyramid",
  "gauge",
];

/** One axis series: `{ name, data }` where `data` is numbers, `[x, y]`
 * pairs, or `{ x, y }` points (`y` an array for candlestick/boxPlot/
 * range types). Circular types (pie, donut, radialBar, polarArea,
 * gauge, waffle) take a plain number array plus `labels`. */
export type ChartSeries = readonly number[] | readonly { name?: string; data: readonly unknown[] }[];

/**
 * A number format for a chart, as data. A chart's options reach the page
 * as JSON, and JSON has no functions — an ApexCharts `formatter` passed in
 * `options` is dropped on the way (Chart warns on the server when it sees
 * one). chart.js turns these specs into formatters in the browser, with
 * `Intl.NumberFormat` and the page's `<html lang>`:
 *
 * - `"number"` — grouped, at most 2 decimals (12,000.5). The default for
 *   the value axis, so a float never prints as `12000.000001`.
 * - `"integer"` — grouped, rounded (12,001).
 * - `"compact"` — 12K, 3.4M.
 * - `"percent"` — a ratio as a percentage (0.25 → 25%).
 * - `"currency:USD"` — any ISO 4217 code ($12,000.00).
 * - `"unit:kilobyte"` — any `Intl` unit (12 kB, 30 ms with `unit:millisecond`).
 * - `{ intl, prefix, suffix }` — `Intl.NumberFormatOptions` verbatim plus
 *   text around the number (`{ intl: { maximumFractionDigits: 0 }, suffix: " sh" }`).
 *
 * Anything that is not a number (a category name) is shown as it is.
 */
export type ChartFormat =
  | "number"
  | "integer"
  | "compact"
  | "percent"
  | `currency:${string}`
  | `unit:${string}`
  | ChartFormatOptions;

/** The object form of a {@link ChartFormat}. */
export type ChartFormatOptions = {
  /** `Intl.NumberFormat` options, e.g. `{ style: "currency", currency: "EUR", maximumFractionDigits: 0 }`. */
  intl?: Intl.NumberFormatOptions;
  /** Text before the formatted number. */
  prefix?: string;
  /** Text after the formatted number (`" sh"`, `"¢"`). */
  suffix?: string;
};

export type ChartProps = {
  id?: string;
  type: ChartType;
  series: ChartSeries;
  /** X-axis categories for axis charts. */
  categories?: readonly (string | number)[];
  /** Slice labels for circular charts. */
  labels?: readonly string[];
  /** Pixel height (ApexCharts also accepts a CSS string). @default 240 */
  height?: number | string;
  title?: string;
  stacked?: boolean;
  /** Horizontal bars. */
  horizontal?: boolean;
  /** Sparkline: no axes, grid, legend or toolbar — for a Stat tile. */
  sparkline?: boolean;
  /** ApexCharts' zoom/export toolbar. @default false */
  toolbar?: boolean;
  /**
   * How values read: the value axis (the y axis; the x axis of horizontal
   * bars), the tooltip and the data labels; for a circular chart, the
   * tooltip and a donut's centre value. Without it the value axis still
   * uses `"number"`. See {@link ChartFormat}.
   */
  format?: ChartFormat;
  /** How a numeric x axis reads (scatter, bubble, histogram) — its labels and the tooltip's x. */
  xFormat?: ChartFormat;
  /**
   * Anything else, verbatim ApexCharts options (apexcharts.com/docs/
   * options) — deep-merged over what the props above produce, so a
   * key here always wins. Colours, fonts and light/dark mode come from
   * the library's tokens (chart.css maps `--apx-*` to them) and should
   * not normally be set. JSON only: a function (an ApexCharts
   * `formatter`, an event handler) cannot reach the page and is dropped,
   * with a warning — use `format` / `xFormat` for numbers.
   */
  options?: Readonly<Record<string, unknown>>;
  attrs?: Attrs;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function merge(base: Obj, over: Readonly<Obj>): Obj {
  const out: Obj = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = isObj(v) && isObj(out[k]) ? merge(out[k] as Obj, v) : v;
  }
  return out;
}

/** The ApexCharts options object a `Chart` renders with — exported so a
 * test or a custom partial can inspect exactly what the props produce. */
export function chartOptions(props: ChartProps): Obj {
  // `raincloud` is a first-class alias in ApexCharts' types, but the CDN
  // bundle draws nothing for it; a violin with the raincloud preset (half
  // density, box, rain to the side) is what the alias resolves to anyway.
  const raincloud = props.type === "raincloud";
  const base: Obj = {
    chart: {
      type: raincloud ? "violin" : props.type,
      height: props.height ?? 240,
      stacked: props.stacked ?? false,
      toolbar: { show: props.toolbar ?? false },
      sparkline: { enabled: props.sparkline ?? false },
    },
    series: props.series,
  };
  if (props.categories) base.xaxis = { categories: props.categories };
  if (props.labels) base.labels = props.labels;
  if (props.title) base.title = { text: props.title };
  if (props.horizontal) base.plotOptions = { bar: { horizontal: true } };
  if (raincloud) {
    base.plotOptions = {
      ...(base.plotOptions as Obj | undefined),
      violin: {
        side: props.horizontal ? "top" : "right",
        box: { show: true, whiskers: "tukey" },
        points: { show: true, position: props.horizontal ? "bottom" : "left" },
      },
    };
  }
  return props.options ? merge(base, props.options) : base;
}

/**
 * An ApexCharts chart. Renders an empty `.chart` box carrying the
 * options as JSON; chart.js draws it, follows the page's light/dark
 * mode, and re-inits after a rAPId swap. See `APEXCHARTS` for loading
 * the engine.
 */
export function Chart(props: ChartProps): Html {
  if (props.options) warnFunctions(props.options, props.id);
  const formats = props.format || props.xFormat ? JSON.stringify({ value: props.format, x: props.xFormat }) : undefined;
  const attrs: Attrs = mergeAttrs(props.attrs, { id: props.id, "data-chart-format": formats });
  return html`
    <div class="chart" data-chart="${JSON.stringify(chartOptions(props))}" data-chart-type="${props
      .type}" ${renderAttrs(attrs)}></div>
  `;
}

const warned = new Set<string>();

/** Names (once per process) every function in `options` — JSON drops them. */
function warnFunctions(value: unknown, id: string | undefined, path = "options"): void {
  if (typeof value === "function") {
    const where = `${id ?? "(no id)"} ${path}`;
    if (warned.has(where)) return;
    warned.add(where);
    console.warn(
      `Chart ${where} is a function. Chart options are sent to the page as JSON, which drops functions — ` +
        "use the `format` / `xFormat` props for number formats.",
    );
    return;
  }
  if (Array.isArray(value)) value.forEach((v, i) => warnFunctions(v, id, `${path}[${i}]`));
  else if (isObj(value)) { for (const [k, v] of Object.entries(value)) warnFunctions(v, id, `${path}.${k}`); }
}
