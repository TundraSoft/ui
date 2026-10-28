import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

/** Columns from 992px up (one below 576, two between). */
export type FeatureGridColumns = "2" | "3" | "4";
/** Plain items on the page ground, or each in its own bordered card. */
export type FeatureGridVariant = "plain" | "cards";

export type FeatureItem = {
  /** An `Icon(...)`, drawn in a chip above the title. */
  icon?: Html;
  title: string | Html;
  text: string | Html;
  /** Makes the whole item a link (stretched over the card). */
  href?: string;
};

export type FeatureGridProps = {
  /** A heading over the grid. */
  title?: string | Html;
  /** A line under the heading. */
  text?: string | Html;
  items: FeatureItem[];
  /** @default "3" */
  columns?: FeatureGridColumns;
  /** @default "plain" */
  variant?: FeatureGridVariant;
  /** Text alignment inside each item (and of the heading). @default "start" */
  align?: "start" | "center";
  attrs?: Attrs;
};

/**
 * "Why us" in three columns: an icon chip, a short title, a sentence.
 * One column on a phone, two on a tablet, `columns` from a laptop up. A
 * linked item is clickable as a whole (its title link stretches over it),
 * so a card never carries a second "Learn more".
 */
export function FeatureGrid(props: FeatureGridProps): Html {
  const cls = cx(
    "feature-grid",
    `feature-grid--${props.columns ?? "3"}`,
    props.variant === "cards" && "feature-grid--cards",
    props.align === "center" && "feature-grid--center",
  );
  const item = (f: FeatureItem) =>
    html`
      <div class="${cx("feature-grid__item", f.href && "feature-grid__item--link")}">${f.icon &&
        html`<span class="feature-grid__icon" aria-hidden="true">${f.icon}</span>`}<h3 class="feature-grid__title">${f
          .href ? html`<a class="feature-grid__link" href="${f.href}">${f.title}</a>` : f.title}</h3><p
          class="feature-grid__text">${f.text}</p></div>
    `;
  return html`
    <section${classAttrs(cls, props.attrs)}>${props.title &&
      html`<div class="feature-grid__head"><h2 class="feature-grid__heading">${props.title}</h2>${props.text &&
        html`<p class="feature-grid__lead">${props.text}</p>`}</div>`}<div class="feature-grid__items">${props.items.map(
        item,
      )}</div></section>
  `;
}
