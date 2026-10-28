import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { inline } from "../../shared/inline.ts";

export type ToggleSize = "sm" | "md";
/** `subtle` sits on the sunken ground; `outline` has a border like `btn--outline`. */
export type ToggleVariant = "subtle" | "outline";

export type ToggleProps = {
  id?: string;
  /** The visible label; with `icon` and `iconOnly` it becomes the accessible name. */
  label: string | Html;
  icon?: Html;
  /** Hide the label visually (sr-only); the icon stands alone. */
  iconOnly?: boolean;
  /** Starts pressed. */
  pressed?: boolean;
  disabled?: boolean;
  size?: ToggleSize;
  variant?: ToggleVariant;
  /** Submitted as `name=value` while pressed (toggle.js keeps a hidden input in step). */
  value?: string;
  /** With `value`: the field name the pressed state submits under. */
  name?: string;
  attrs?: Attrs;
};

/**
 * A pressed-state button (`aria-pressed`): bold, italic, grid or list
 * view. Nothing submits by itself; give it `name` + `value` and a hidden
 * input mirrors the pressed state into the form. Works without the
 * script as a plain button that does nothing — pair it with your own
 * behaviour or use it inside a `ToggleGroup`.
 */
export function Toggle(props: ToggleProps): Html {
  const pressed = Boolean(props.pressed);
  const mirror = props.name && props.value !== undefined
    ? html`<input type="hidden" name="${props.name}" value="${props.value}" data-toggle-mirror${
      pressed ? "" : html`
        disabled
      `
    }>`
    : "";
  return inline(html`
    <button type="button" ${classAttrs(
      "toggle",
      mergeAttrs(props.attrs, {
        id: props.id,
        "aria-pressed": pressed ? "true" : "false",
        disabled: props.disabled ? "" : undefined,
        "data-toggle-button": "",
        "data-toggle-value": props.value,
        "data-toggle-name": props.name,
      }),
      props.size === "sm" && "toggle--sm",
      props.variant === "outline" && "toggle--outline",
      props.iconOnly && "toggle--icon",
    )}>${props.icon && html`<span class="toggle__icon" aria-hidden="true">${props.icon}</span>`}<span${renderAttrs({
      class: props.iconOnly ? "sr-only" : "toggle__label",
    })}>${props.label}</span>${mirror}</button>
  `);
}

export type ToggleGroupProps = {
  id: string;
  /** Accessible name of the group. */
  label: string;
  items: ToggleProps[];
  /** Radio-like: pressing one unpresses the others. */
  exclusive?: boolean;
  size?: ToggleSize;
  variant?: ToggleVariant;
  attrs?: Attrs;
};

/**
 * Toggles joined edge to edge; Left/Right move focus between them. A
 * subtle group (the default) sits on one sunken tray; an outline group
 * is a row of bordered buttons sharing their edges.
 */
export function ToggleGroup(props: ToggleGroupProps): Html {
  const outline = props.variant === "outline" || props.items.some((item) => item.variant === "outline");
  return html`<div${
    classAttrs(
      "toggle-group",
      mergeAttrs(props.attrs, {
        id: props.id,
        role: "group",
        "aria-label": props.label,
        "data-toggle-group": "",
        "data-toggle-exclusive": props.exclusive ? "" : undefined,
      }),
      outline ? "toggle-group--outline" : "toggle-group--subtle",
    )
  }>${props.items.map((item) => Toggle({ size: props.size, variant: props.variant, ...item }))}</div>`;
}
