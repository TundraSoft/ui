import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  /** Monospace, for versions / ids / codes. */
  | "code";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "badge--neutral",
  primary: "badge--primary",
  accent: "badge--accent",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
  info: "badge--info",
  code: "badge--code",
};

export function Badge(
  props: {
    label: string | Html;
    variant?: BadgeVariant;
    /** Leading status dot — reads as "live state", not just a label. */
    dot?: boolean;
    attrs?: Attrs;
  },
): Html {
  const className = cx("badge", VARIANT_CLASS[props.variant ?? "neutral"]);
  return html`<span${classAttrs(className, props.attrs)}>${
    props.dot && html`<span class="badge__dot" aria-hidden="true"></span>`
  }${props.label}</span>`;
}

export function Chip(
  props: {
    label: string | Html;
    removable?: boolean;
    /** Display-only: no hover/active affordance. */
    static?: boolean;
    attrs?: Attrs;
  },
): Html {
  const attrs: Attrs = {
    ...props.attrs,
    "data-dismissible": props.removable ? "" : undefined,
  };
  return html`<span${
    classAttrs("chip", attrs, props.static && "chip--static", props.removable && "chip--removable")
  }>${props.label}${
    props.removable &&
    html`<button type="button" class="chip__remove" data-dismiss aria-label="Remove ${
      typeof props.label === "string" ? props.label : ""
    }">&times;</button>`
  }</span>`;
}
