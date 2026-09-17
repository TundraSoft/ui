import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";

export type TooltipProps = {
  /** Build the trigger's own `attrs.aria-describedby` from this same id. */
  id: string;
  trigger: string | Html;
  content: string | Html;
  attrs?: Attrs;
};

/** CSS-only (hover/focus) — no JS, so it degrades to "just the trigger" cleanly. */
export function Tooltip(props: TooltipProps): Html {
  return html`
    <span class="tooltip"
      ${renderAttrs(props.attrs ?? {})}>${props.trigger}<span class="tooltip__content" role="tooltip" id="${props
        .id}">${props.content}</span></span>
  `;
}
