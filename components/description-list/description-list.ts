import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

/**
 * How term and description sit: `stacked` (term above its value),
 * `inline` (term in a fixed column, value beside it — a details panel),
 * `columns` (pairs in a responsive grid — an invoice's billed-from /
 * billed-to block, a settings summary).
 */
export type DescriptionListLayout = "stacked" | "inline" | "columns";

export type DescriptionListSize = "sm" | "md";

export type DescriptionItem = {
  /** The key. */
  term: string | Html;
  /** The value; figures get tabular numerals. */
  description: string | Html;
  /** Extra attributes on the pair's wrapper `<div>`; a `class` merges. */
  attrs?: Attrs;
};

export type DescriptionListProps = {
  items: DescriptionItem[];
  /** @default "stacked" */
  layout?: DescriptionListLayout;
  /** @default "md" */
  size?: DescriptionListSize;
  /** A rule between pairs. */
  divided?: boolean;
  /** Extra attributes on the `<dl>`; a `class` merges. */
  attrs?: Attrs;
};

/**
 * Key–value pairs as a real `<dl>`: each pair is a `<div>` holding its
 * `<dt>` and `<dd>` (valid HTML, and what the grid layouts need). Terms
 * are the small-caps label style, descriptions the text colour.
 */
export function DescriptionList(props: DescriptionListProps): Html {
  const layout = props.layout ?? "stacked";
  const size = props.size ?? "md";
  return html`
    <dl ${classAttrs(
      "description-list",
      props.attrs,
      layout !== "stacked" && `description-list--${layout}`,
      size !== "md" && `description-list--${size}`,
      props.divided && "description-list--divided",
    )}>${props.items.map((item) => {
      const { class: extra, ...rest } = item.attrs ?? {};
      return html`
        <div class="${cx("description-list__item", extra)}" ${renderAttrs(rest)}>
          <dt class="description-list__term">${item.term}</dt>
          <dd class="description-list__description">${item.description}</dd>
        </div>
      `;
    })}</dl>
  `;
}
