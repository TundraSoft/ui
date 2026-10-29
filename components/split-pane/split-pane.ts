import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

/** Side by side (`horizontal`, the divider is vertical) or stacked (`vertical`). */
export type SplitPaneOrientation = "horizontal" | "vertical";

export type SplitPaneProps = {
  /** Required: the separator's `aria-controls` and the storage key default derive from it. */
  id: string;
  /** The first pane (left / top). */
  start: Html;
  /** The second pane (right / bottom). */
  end: Html;
  /** @default "horizontal" */
  orientation?: SplitPaneOrientation;
  /** Start pane's share, in percent. @default 50 */
  initial?: number;
  /** Smallest start share, in percent. @default 20 */
  min?: number;
  /** Largest start share, in percent. @default 80 */
  max?: number;
  /** Persist the position in localStorage under this key. */
  storageKey?: string;
  /** The separator's accessible name. @default "Resize panes" */
  label?: string;
  /** Keep the panes side by side on a phone (by default they stack below 768px). */
  keep?: boolean;
  /** Pad both panes (content that is not already a card or a list). */
  padded?: boolean;
  /** The box is `--split-height` tall (24rem) when vertical, at least that when horizontal — retune it in `attrs.class`'s own rule. */
  attrs?: Attrs;
};

/**
 * Two panes with a draggable divider. The start pane's share is the
 * `--split-start` custom property, which split-pane.js sets from the
 * `data-split-initial` attribute, a stored value, a pointer drag, the
 * arrow keys (±2%), Home/End, or a double-click (reset). The divider is a
 * `role="separator"` with `aria-valuenow`. Below 768px the panes stack and
 * the divider hides unless `keep`. Without the script the panes split at
 * `initial`.
 */
export function SplitPane(props: SplitPaneProps): Html {
  const orientation = props.orientation ?? "horizontal";
  const initial = props.initial ?? 50;
  const min = props.min ?? 20;
  const max = props.max ?? 80;
  return html`
    <div${classAttrs(
      "split-pane",
      mergeAttrs(props.attrs, { id: props.id }),
      `split-pane--${orientation}`,
      props.keep && "split-pane--keep",
      props.padded && "split-pane--padded",
    )}${renderAttrs({
      "data-split-pane": "",
      "data-split-initial": String(initial),
      "data-split-min": String(min),
      "data-split-max": String(max),
      "data-split-storage": props.storageKey,
    })}>
      <div class="split-pane__pane split-pane__pane--start" id="${props.id}-start">${props.start}</div>
      <div${classAttrs("split-pane__separator", {
        role: "separator",
        tabindex: "0",
        "aria-orientation": orientation === "horizontal" ? "vertical" : "horizontal",
        "aria-label": props.label ?? "Resize panes",
        "aria-controls": `${props.id}-start`,
        "aria-valuenow": String(initial),
        "aria-valuemin": String(min),
        "aria-valuemax": String(max),
        "data-split-separator": "",
      })}><span class="split-pane__grip">${Icon("grip", { size: 14 })}</span></div>
        <div class="split-pane__pane split-pane__pane--end" id="${props.id}-end">${props.end}</div>
      </div>
  `;
}
