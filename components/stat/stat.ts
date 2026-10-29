import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Badge } from "../badge/badge.ts";

export type StatTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export type StatProps = {
  label: string | Html;
  value: string | Html;
  icon?: Html;
  tone?: StatTone;
  /** e.g. `{ label: "+12.4%", up: true }` — rendered as a status badge beside the value. */
  trend?: { label: string; up: boolean };
  /**
   * A small trend line under the value, drawn on the server as an inline
   * SVG (a polyline and a soft fill) from these points — no chart engine,
   * the same bytes on every render. Two or more numbers; the line fills
   * the tile's width. Say what it shows in `sparklineLabel`.
   */
  sparkline?: number[];
  /** Accessible name of the sparkline, e.g. "Daily signups, rising". Without it the drawing is decorative. */
  sparklineLabel?: string;
  /**
   * One label per point ("Mar", "Week 12"), shown with the value in the
   * tooltip of that point's column (a native `<title>`, so no script).
   * Without labels the tooltip reads "3 of 12: 48".
   */
  sparklineLabels?: string[];
  attrs?: Attrs;
};

const SPARK_W = 100;
const SPARK_H = 32;
const SPARK_PAD = 2;

/** Points of the sparkline in a 100×32 box, deterministic and compact. */
function sparkPoints(data: number[]): string {
  const n = data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => n === 1 ? SPARK_W / 2 : (i / (n - 1)) * SPARK_W;
  const y = (v: number) => SPARK_PAD + (1 - (v - min) / span) * (SPARK_H - 2 * SPARK_PAD);
  return data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
}

/**
 * The sparkline SVG: a line plus a filled area under it (currentColor),
 * and one hit column per point carrying its label in `data-tip` and a
 * `<title>`: stat.js shows the label in a tip above the point the moment
 * the pointer is over it; the title is the no-script fallback.
 */
function sparkline(data: number[], label?: string, labels?: string[]): Html {
  const points = sparkPoints(data);
  const first = points.split(" ")[0]!.split(",")[0];
  const last = points.split(" ").pop()!.split(",")[0];
  const area = `${first},${SPARK_H} ${points} ${last},${SPARK_H}`;
  const n = data.length;
  const step = n > 1 ? SPARK_W / (n - 1) : SPARK_W;
  const hits = data.map((v, i) => {
    const x = n > 1 ? Math.max(0, i * step - step / 2) : 0;
    const w = n > 1 ? (i === 0 || i === n - 1 ? step / 2 : step) : SPARK_W;
    const tip = `${labels?.[i] ?? `${i + 1} of ${n}`}: ${String(v)}`;
    return html`
      <rect class="stat__spark-hit" x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${String(SPARK_H)}"
        data-tip="${tip}">
        <title>${tip}</title>
      </rect>
    `;
  });
  return html`
    <svg class="stat__spark" viewBox="0 0 ${String(SPARK_W)} ${String(
      SPARK_H,
    )}" preserveAspectRatio="none" ${renderAttrs({
      role: label ? "img" : undefined,
      "aria-label": label,
      "aria-hidden": label ? undefined : "true",
    })}>
      <polygon class="stat__spark-area" points="${area}"></polygon>
      <polyline
        class="stat__spark-line"
        points="${points}"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      ></polyline>
      ${hits}
    </svg>
  `;
}

/**
 * A KPI tile: label on top, the value large with its trend inline beside
 * it, an optional icon chip at the top end, an optional sparkline under.
 */
export function Stat(props: StatProps): Html {
  const tone = props.tone ?? "neutral";
  const cls = classAttrs("stat", props.attrs, tone !== "neutral" && `stat--${tone}`, props.icon && "stat--with-icon");
  return html`
    <div ${cls}>
      <span class="stat__label">${props.label}</span>${props.icon && html`
        <span class="stat__icon" aria-hidden="true">${props.icon}</span>
      `}<span class="stat__row"><span class="stat__value"
        >${props.value}</span>${props.trend &&
          html`
            <span class="stat__trend">${Badge({
              label: props.trend.label,
              variant: props.trend.up ? "success" : "danger",
            })}</span>
          `}</span>${props.sparkline && props.sparkline.length > 1
          ? sparkline(props.sparkline, props.sparklineLabel, props.sparklineLabels)
          : ""}
      </div>
  `;
}
