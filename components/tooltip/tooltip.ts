import { type Html, html } from "@tundralibs/rapid/ui";
import { inline } from "../../shared/inline.ts";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";

/** Where the bubble sits relative to the trigger; it flips when there is no room. */
export type TooltipSide = "top" | "bottom" | "start" | "end";

export type TooltipProps = {
  /** Build the trigger's own `attrs.aria-describedby` from this same id. */
  id: string;
  trigger: string | Html;
  content: string | Html;
  /** @default "top" */
  side?: TooltipSide;
  /** Hover delay before it shows, in ms (focus shows at once). @default 150 */
  delay?: number;
  attrs?: Attrs;
};

/**
 * A short label on hover or focus. tooltip.js places the bubble in the
 * viewport (flipping to the other side when there is no room, the text
 * wrapping at a readable measure) and shows it after `delay`; a tap
 * toggles it on touch. Without JS the bubble still appears on hover and
 * focus, from CSS alone, above the trigger.
 */
export function Tooltip(props: TooltipProps): Html {
  const side = props.side ?? "top";
  const rootAttrs = classAttrs(
    "tooltip",
    mergeAttrs(props.attrs, {
      "data-tooltip": "",
      "data-tooltip-side": side,
      "data-tooltip-delay": props.delay === undefined ? undefined : String(props.delay),
    }),
    side !== "top" && `tooltip--${side}`,
  );
  const content = html`<span class="tooltip__content" role="tooltip" id="${props.id}">${props.content}</span>`;
  return inline(html`<span${rootAttrs}>${props.trigger}${content}</span>`);
}
