import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { Badge } from "../badge/badge.ts";

export type StatTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export type StatProps = {
  label: string | Html;
  value: string | Html;
  icon?: Html;
  tone?: StatTone;
  /** e.g. `{ label: "+12.4%", up: true }` — rendered as a status badge. */
  trend?: { label: string; up: boolean };
  attrs?: Attrs;
};

/** A KPI tile: icon chip, label, value, trend. */
export function Stat(props: StatProps): Html {
  const tone = props.tone ?? "neutral";
  return html`<div${classAttrs("stat", props.attrs, tone !== "neutral" && `stat--${tone}`)}>${
    props.icon && html`<span class="stat__icon" aria-hidden="true">${props.icon}</span>`
  }<span class="stat__label">${props.label}</span><span class="stat__value">${props.value}</span>${
    props.trend &&
    html`<span class="stat__trend">${
      Badge({ label: props.trend.label, variant: props.trend.up ? "success" : "danger" })
    }</span>`
  }</div>`;
}
