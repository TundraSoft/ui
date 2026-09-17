/**
 * One sample of every chart type ApexCharts renders, through the
 * library's `Chart` template — the gallery, the example app and the
 * app's e2e test all use this list, so "every supported chart" is a
 * single place to keep in step with `chartTypes` in components/chart.
 */
import type { Html } from "@tundralibs/rapid/ui";
import { Card } from "../../components/card/card.ts";
import { Chart, type ChartProps, type ChartType, chartTypes } from "../../components/chart/chart.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const revenue = [32, 38, 35, 41, 44, 48];
const costs = [21, 24, 22, 27, 26, 30];
const obs = (seed: number, n = 24) =>
  Array.from({ length: n }, (_, i) => Math.round(40 + 25 * Math.sin(seed + i * 0.7) + ((i * seed) % 7)));

/** Props for one sample of the given type. */
export const chartSamples: Record<ChartType, Omit<ChartProps, "type">> = {
  line: { series: [{ name: "Revenue", data: revenue }, { name: "Costs", data: costs }], categories: months },
  area: {
    series: [{ name: "Revenue", data: revenue }],
    categories: months,
    options: { dataLabels: { enabled: false }, stroke: { curve: "smooth", width: 2 } },
  },
  bar: {
    series: [{ name: "Revenue", data: revenue }, { name: "Costs", data: costs }],
    categories: months,
    horizontal: true,
  },
  pie: { series: [44, 55, 13, 33], labels: ["Team", "Free", "Enterprise", "Trial"] },
  donut: { series: [44, 55, 13, 33], labels: ["Team", "Free", "Enterprise", "Trial"] },
  radialBar: { series: [72, 58, 41], labels: ["CPU", "Memory", "Disk"] },
  scatter: { series: [{ name: "Deploys", data: [[1, 12], [2, 19], [3, 8], [4, 24], [5, 17], [6, 22]] }] },
  bubble: { series: [{ name: "Regions", data: [[10, 40, 12], [25, 55, 30], [40, 30, 8], [60, 70, 22]] }] },
  heatmap: {
    series: ["Mon", "Tue", "Wed", "Thu"].map((day, d) => ({
      name: day,
      data: ["9am", "12pm", "3pm", "6pm"].map((h, i) => ({ x: h, y: 10 + ((d * 7 + i * 5) % 40) })),
    })),
  },
  candlestick: {
    series: [{
      data: months.map((m, i) => ({ x: m, y: [30 + i, 36 + i, 27 + i, 33 + i] })),
    }],
  },
  boxPlot: { series: [{ data: ["A", "B", "C"].map((x, i) => ({ x, y: [10 + i, 20 + i, 30 + i, 40 + i, 55 + i] })) }] },
  violin: { series: [{ data: [{ x: "Team", y: obs(1) }, { x: "Free", y: obs(2) }] }] },
  histogram: { series: [{ name: "Response ms", data: obs(3, 60) }] },
  radar: {
    series: [{ name: "Q3", data: [80, 50, 30, 40, 100, 20] }],
    categories: ["Speed", "Reliability", "Comfort", "Safety", "Efficiency", "Cost"],
  },
  polarArea: { series: [14, 23, 21, 17], labels: ["North", "South", "East", "West"] },
  rangeBar: {
    series: [{ data: [{ x: "Design", y: [1, 4] }, { x: "Build", y: [3, 8] }, { x: "QA", y: [7, 10] }] }],
    horizontal: true,
  },
  rangeArea: { series: [{ name: "Latency", data: months.map((m, i) => ({ x: m, y: [10 + i, 20 + i * 2] })) }] },
  waterfall: {
    series: [{
      data: [{ x: "Start", y: 100 }, { x: "Sales", y: 40 }, { x: "Refunds", y: -15 }, { x: "Fees", y: -8 }, {
        x: "End",
        isTotal: true,
      }],
    }],
  },
  dumbbell: {
    series: [{ data: [{ x: "2024", y: [20, 45] }, { x: "2025", y: [28, 52] }, { x: "2026", y: [35, 61] }] }],
    horizontal: true,
  },
  streamgraph: {
    series: [{ name: "Web", data: revenue }, { name: "Mobile", data: costs }, {
      name: "API",
      data: [12, 15, 18, 14, 20, 22],
    }],
    categories: months,
  },
  raincloud: { series: [{ data: [{ x: "Team", y: obs(4) }, { x: "Free", y: obs(5) }] }] },
  treemap: {
    series: [{
      data: [{ x: "Chrome", y: 62 }, { x: "Safari", y: 20 }, { x: "Firefox", y: 9 }, { x: "Edge", y: 6 }, {
        x: "Other",
        y: 3,
      }],
    }],
  },
  unit: { series: [{ name: "Yes", data: [42] }, { name: "No", data: [18] }, { name: "Undecided", data: [9] }] },
  waffle: { series: [40, 35, 25], labels: ["Team", "Free", "Enterprise"] },
  sunburst: {
    series: [{
      data: [
        // A branch needs its own `y` (the sum) — without it the ring is empty.
        { x: "Web", y: 85, children: [{ x: "Chrome", y: 60 }, { x: "Safari", y: 25 }] },
        { x: "Mobile", y: 65, children: [{ x: "iOS", y: 30 }, { x: "Android", y: 35 }] },
      ],
    }],
  },
  funnel: {
    series: [{ name: "Users", data: [1200, 900, 600, 300, 120] }],
    categories: ["Visited", "Signed up", "Activated", "Paid", "Renewed"],
  },
  pyramid: {
    series: [{ name: "Tier", data: [120, 300, 600, 900, 1200] }],
    categories: ["Enterprise", "Team", "Pro", "Free", "Visitors"],
  },
  gauge: { series: [72], labels: ["Uptime"] },
};

/** One `Card` per chart type, in a grid — the whole catalogue. */
export function chartsGallery(): Html {
  return Grid({
    items: chartTypes.map((type) =>
      GridCol({
        span: 4,
        content: Card({
          title: type,
          body: Chart({ type, id: `chart-${type}`, height: 220, ...chartSamples[type] }),
        }),
      })
    ),
  });
}
