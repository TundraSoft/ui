import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "subtle"
  | "ghost"
  | "accent"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  id?: string;
  label?: string | Html;
  iconStart?: Html;
  iconEnd?: Html;
  /** No visible label — pass an accessible name via `attrs["aria-label"]`. */
  iconOnly?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  attrs?: Attrs;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "btn--secondary",
  outline: "btn--outline",
  subtle: "btn--subtle",
  ghost: "btn--ghost",
  accent: "btn--accent",
  danger: "btn--danger",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "btn--sm",
  md: "",
  lg: "btn--lg",
};

export function Button(props: ButtonProps): Html {
  const className = cx(
    "btn",
    VARIANT_CLASS[props.variant ?? "primary"],
    SIZE_CLASS[props.size ?? "md"],
    props.iconOnly && "btn--icon",
    props.block && "btn--block",
    props.loading && "btn--loading",
  );

  const inner = html`${props.iconStart}${props.label}${props.iconEnd}`;

  if (props.href && !props.disabled) {
    const attrs: Attrs = {
      ...props.attrs,
      id: props.id,
      href: props.href,
    };
    return html`<a${classAttrs(className, attrs)}>${inner}</a>`;
  }

  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    disabled: props.disabled ? "" : undefined,
    "aria-busy": props.loading ? "true" : undefined,
  };

  return html`
    <button type="${props.type ?? "button"}" ${classAttrs(className, attrs)}>${inner}</button>
  `;
}

/** Buttons fused into one segmented control (e.g. "Export" + a caret). */
export function ButtonGroup(props: { buttons: Html[]; attrs?: Attrs }): Html {
  return html`
    <span class="btn-group" ${renderAttrs(props.attrs ?? {})}>${props.buttons}</span>
  `;
}
