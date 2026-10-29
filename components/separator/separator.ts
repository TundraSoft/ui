import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";

export type SeparatorOrientation = "horizontal" | "vertical";
/** Space around the rule. */
export type SeparatorSpacing = "sm" | "md" | "lg";

export type SeparatorProps = {
  /** Text set into the rule ("or", "Today"). */
  label?: string | Html;
  orientation?: SeparatorOrientation;
  spacing?: SeparatorSpacing;
  /** Purely visual: `aria-hidden` instead of `role="separator"`. */
  decorative?: boolean;
  attrs?: Attrs;
};

/** A rule, optionally with a label in it; vertical for toolbars. */
export function Separator(props: SeparatorProps): Html {
  const vertical = props.orientation === "vertical";
  const attrs = classAttrs(
    "separator",
    mergeAttrs(props.attrs, {
      role: props.decorative ? undefined : "separator",
      "aria-orientation": props.decorative || !vertical ? undefined : "vertical",
      "aria-hidden": props.decorative ? "true" : undefined,
    }),
    vertical && "separator--vertical",
    props.spacing && props.spacing !== "md" && `separator--${props.spacing}`,
    props.label && "separator--labelled",
  );
  return html`<div${attrs}>${props.label && html`<span class="separator__label">${props.label}</span>`}</div>`;
}
