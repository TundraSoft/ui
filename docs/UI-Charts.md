# Charts

One engine, pinned: [ApexCharts](https://apexcharts.com). The library ships the `Chart` template, the tokens that colour
every chart, and the behaviour that draws them and follows the page's light/dark mode. It does **not** bundle the engine
— a page loads it with one pinned, integrity-checked script tag.

---

## TL;DR

- Load the engine: `ChartScript()` in a static page, or `createCoreTemplate({ scripts: [APEXCHARTS] })` in a rAPId app.
  Both come from `@tundralibs/ui/chart` and carry the version and sha384 hash.
- `Chart({ type, series, categories?, labels?, height?, … })` renders an empty `.chart` box with the options as JSON;
  `chart.js` draws it once the engine is present and redraws it on a theme change.
- All 28 chart types the engine renders are supported (`chartTypes`).
- Never pass colours: the palette comes from the tokens (`--apx-series-1…6`, `--apx-accent`, `--apx-fore`, `--apx-grid`,
  `--apx-surface`), so a theme restyles every chart at once.
- The engine is ~270 KB gzipped; only pages with a chart load it.

---

## Loading the engine

```ts
import { APEXCHARTS, ChartScript } from "@tundralibs/ui/chart";

// static page
html`…${ChartScript()}<script src="/ui.js" defer></script>`;

// rAPId
createCoreTemplate({ scripts: [APEXCHARTS] });
```

`APEXCHARTS` is `{ version, src, integrity }` — the only place the version lives. Under a strict CSP allow
`https://cdn.jsdelivr.net` in `script-src`.

---

## `Chart`

```ts
import { Chart } from "@tundralibs/ui/chart";

Chart({
  type: "area",
  series: [{ name: "Revenue", data: [32, 38, 35, 41, 44, 48] }],
  categories: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
  height: 240,
  options: { dataLabels: { enabled: false }, stroke: { curve: "smooth", width: 2 } },
});
```

| Prop                                                     | Meaning                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                                                   | One of the 28 `ChartType`s: line, area, bar, pie, donut, radialBar, scatter, bubble, heatmap, candlestick, boxPlot, violin, histogram, radar, polarArea, rangeBar, rangeArea, waterfall, dumbbell, streamgraph, raincloud, treemap, unit, waffle, sunburst, funnel, pyramid, gauge.                                                                                         |
| `series`                                                 | Axis charts: `{ name?, data }[]` where `data` is numbers, `[x, y]` pairs or `{ x, y }` points (`y` an array for candlestick / boxPlot / range types, raw observations for violin / histogram / raincloud, `children` for treemap / sunburst — a branch needs its own `y`). Circular charts (pie, donut, radialBar, polarArea, gauge, waffle): a number array plus `labels`. |
| `categories`                                             | X-axis categories.                                                                                                                                                                                                                                                                                                                                                          |
| `labels`                                                 | Slice labels for circular charts.                                                                                                                                                                                                                                                                                                                                           |
| `height`                                                 | Pixels or a CSS length; default 240.                                                                                                                                                                                                                                                                                                                                        |
| `title`, `stacked`, `horizontal`, `sparkline`, `toolbar` | The common switches. `sparkline` strips axes, grid and legend for a Stat tile.                                                                                                                                                                                                                                                                                              |
| `options`                                                | Verbatim ApexCharts options, deep-merged over the props — a key here always wins.                                                                                                                                                                                                                                                                                           |

`chartOptions(props)` returns the exact options object a `Chart` renders with, for tests or custom partials. `raincloud`
is mapped to a violin with the raincloud preset (the alias draws nothing in the CDN bundle).

`examples/shared/charts.ts` holds one working sample per type; the catalogue's Charts page renders all of them.

---

## Theming

ApexCharts 7 reads `--apx-*` design tokens from the cascade on every render. `chart.css` maps them onto the library's
tokens:

```css
:root {
  --apx-accent: var(--color-accent);
  --apx-fore: var(--color-text);
  --apx-grid: var(--color-border);
  --apx-surface: var(--color-surface);
  --apx-series-1: var(--color-accent);
  --apx-series-2: var(--color-info);
  --apx-series-3: var(--color-success);
  --apx-series-4: var(--color-warning);
  --apx-series-5: var(--color-danger);
  --apx-series-6: var(--color-secondary);
}
```

Override any of them in a theme (globally, or on `.chart`) to retune charts alone. `chart.js` sets the engine's
`theme.mode` from `data-theme` / `prefers-color-scheme`, injects `--font-family-base`, calls `refreshTokens()` and
re-renders when either changes, and destroys an instance whose element leaves the DOM. Tooltips and menus are restyled
on the tokens too.
