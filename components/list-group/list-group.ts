import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

/** `flush` drops the outer border and radius — for a list inside a card. */
export type ListGroupVariant = "default" | "flush";
export type ListGroupSize = "sm" | "md";

export type ListGroupItem = {
  label: string | Html;
  /** A second, muted line under the label. */
  text?: string | Html;
  /** Makes the row a link. */
  href?: string;
  /** Makes the row a `<button type="button">` (give it `attrs`); ignored with `href`. */
  action?: boolean;
  /** The current row: accent bar and sunken ground, `aria-current="true"`. */
  active?: boolean;
  /** Muted and inert (`aria-disabled`; a link loses its href). */
  disabled?: boolean;
  /** Leading icon. */
  icon?: Html;
  /** Trailing badge (a `Badge`, a count). */
  badge?: Html;
  /** Small muted text at the end of the row — a time, a size. */
  meta?: string | Html;
  /** Extra attributes on the row's link/button (or the `<li>` for a plain row). */
  attrs?: Attrs;
};

export type ListGroupProps = {
  id?: string;
  items: ListGroupItem[];
  variant?: ListGroupVariant;
  /** Renders an `<ol>` with a counter in front of each row. */
  numbered?: boolean;
  size?: ListGroupSize;
  attrs?: Attrs;
};

function row(item: ListGroupItem): Html {
  const body = html`
    ${item.icon && html`<span class="list-group__icon" aria-hidden="true">${item.icon}</span>`}<span
      class="list-group__body"><span class="list-group__label">${item.label}</span>${item.text &&
        html`<span class="list-group__text">${item.text}</span>`}</span>${item.meta &&
        html`<span class="list-group__meta">${item.meta}</span>`}${item.badge &&
        html`<span class="list-group__badge">${item.badge}</span>`}
  `;
  const cls = cx(
    "list-group__item",
    item.active && "list-group__item--active",
    item.disabled && "list-group__item--disabled",
  );
  const state: Attrs = {
    "aria-current": item.active ? "true" : undefined,
    "aria-disabled": item.disabled ? "true" : undefined,
  };
  if (item.href) {
    return html`
      <li>
        <a${classAttrs(
          cls,
          mergeAttrs(item.attrs, { ...state, href: item.disabled ? undefined : item.href }),
        )}>${body}</a></li>
    `;
  }
  if (item.action) {
    return html`<li><button type="button"${
      classAttrs(cls, mergeAttrs(item.attrs, { ...state, disabled: item.disabled ? "" : undefined }))
    }>${body}</button></li>`;
  }
  return html`<li${classAttrs(cls, mergeAttrs(item.attrs, state))}>${body}</li>`;
}

/**
 * A vertical list of rows — links, buttons or plain text — with an
 * active row, disabled rows, icons, badges and trailing meta. A real
 * `<ul>` (or `<ol>` when `numbered`), so it needs no script.
 */
export function ListGroup(props: ListGroupProps): Html {
  const tag = props.numbered ? "ol" : "ul";
  const attrs = classAttrs(
    "list-group",
    mergeAttrs(props.attrs, { id: props.id, role: "list" }),
    props.variant === "flush" && "list-group--flush",
    props.size === "sm" && "list-group--sm",
    props.numbered && "list-group--numbered",
  );
  return tag === "ol" ? html`<ol${attrs}>${props.items.map(row)}</ol>` : html`<ul${attrs}>${props.items.map(row)}</ul>`;
}
