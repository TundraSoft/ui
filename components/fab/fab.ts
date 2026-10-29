import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";

/** Which bottom corner (or the centre) the button sits in. */
export type FabPosition = "end" | "start" | "center";
export type FabVariant = "primary" | "accent";
export type FabSize = "md" | "lg";

export type FabProps = {
  id?: string;
  icon: Html;
  /** The accessible name; shown beside the icon when `extended`. */
  label: string;
  /** A pill with the label visible. */
  extended?: boolean;
  /** Makes it a link. */
  href?: string;
  position?: FabPosition;
  variant?: FabVariant;
  size?: FabSize;
  /** fab.js hides it while the page scrolls down and shows it on the way up. */
  hideOnScroll?: boolean;
  attrs?: Attrs;
};

/**
 * Floating action button: the one primary action a screen keeps within
 * thumb's reach — fixed to a bottom corner, above the content. Add
 * `attrs: { class: "fab--static" }` to show it in flow (docs, a catalogue).
 */
export function Fab(props: FabProps): Html {
  const attrs = classAttrs(
    "fab",
    mergeAttrs(props.attrs, {
      id: props.id,
      "aria-label": props.extended ? undefined : props.label,
      "data-fab": "",
      "data-fab-hide-on-scroll": props.hideOnScroll ? "" : undefined,
    }),
    props.position && props.position !== "end" && `fab--${props.position}`,
    props.variant === "accent" && "fab--accent",
    props.size === "lg" && "fab--lg",
    props.extended && "fab--extended",
  );
  const inner = html`<span class="fab__icon" aria-hidden="true">${props.icon}</span>${
    props.extended && html`<span class="fab__label">${props.label}</span>`
  }`;
  return props.href
    ? html`
      <a href="${props.href}" ${attrs}>${inner}</a>
    `
    : html`
      <button type="button" ${attrs}>${inner}</button>
    `;
}
