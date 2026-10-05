import { type Html, html } from "@tundralibs/rapid/ui";
import { inline } from "../../shared/inline.ts";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

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
    const attrs: Attrs = mergeAttrs(props.attrs, {
      id: props.id,
      href: props.href,
    });
    return inline(html`<a${classAttrs(className, attrs)}>${inner}</a>`);
  }

  const attrs: Attrs = mergeAttrs(props.attrs, {
    id: props.id,
    disabled: props.disabled ? "" : undefined,
    "aria-busy": props.loading ? "true" : undefined,
  });

  return inline(html`
    <button type="${props.type ?? "button"}" ${classAttrs(className, attrs)}>${inner}</button>
  `);
}

/** Buttons fused into one segmented control (e.g. "Export" + a caret). */
export function ButtonGroup(props: { buttons: Html[]; attrs?: Attrs }): Html {
  return inline(html`
    <span ${classAttrs("btn-group", props.attrs ?? {})}>${props.buttons}</span>
  `);
}

export type CopyButtonProps = {
  id?: string;
  /** The text copied. */
  value: string;
  /**
   * The visible text. `false`: icon-only — the copy icon turns into a check
   * for two seconds, and `ariaLabel` names the button. @default "Copy"
   */
  label?: string | false;
  /** Shown for two seconds after a copy. @default "Copied" */
  doneLabel?: string;
  /** Leading icon. @default the copy icon */
  icon?: Html | false;
  variant?: ButtonVariant;
  /** @default "sm" */
  size?: ButtonSize;
  /** Accessible name when the label alone is not enough ("Copy short link"). */
  ariaLabel?: string;
  attrs?: Attrs;
};

/**
 * A button that copies `value` to the clipboard (shared/js/copy.js) and
 * says so: its label turns into `doneLabel` with a check for two seconds,
 * and the change is announced through the toast region. Without script
 * it is an inert button — pair it with the visible text it copies.
 */
export function CopyButton(props: CopyButtonProps): Html {
  const done = props.doneLabel ?? "Copied";
  if (props.label === false) {
    return Button({
      id: props.id,
      iconOnly: true,
      label: html`
        <span class="btn__copy-label" data-copy-label>${props.icon || Icon("copy", { size: 15 })}</span><span
          class="btn__copy-done" data-copy-done>${Icon("check", { size: 15 })}</span>
      `,
      variant: props.variant ?? "ghost",
      size: props.size ?? "sm",
      attrs: mergeAttrs(props.attrs, {
        class: cx("btn--copy", props.attrs?.class),
        "data-copy": props.value,
        "data-copy-announce": done,
        "aria-label": props.ariaLabel ?? "Copy",
      }),
    });
  }
  const label = html`
    <span class="btn__copy-label" data-copy-label>${props.icon === false
      ? ""
      : props.icon ?? Icon("copy", { size: 14 })}${props.label ?? "Copy"}</span><span class="btn__copy-done"
      data-copy-done>${Icon("check", { size: 14 })}${done}</span>
  `;
  return Button({
    id: props.id,
    label,
    variant: props.variant ?? "outline",
    size: props.size ?? "sm",
    attrs: mergeAttrs(props.attrs, {
      class: cx("btn--copy", props.attrs?.class),
      "data-copy": props.value,
      "data-copy-announce": done,
      "aria-label": props.ariaLabel,
    }),
  });
}
