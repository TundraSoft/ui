import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";

/** Which way the area scrolls. */
export type ScrollAreaAxis = "y" | "x" | "both";

/** Height steps: 240 / 400 / 600px (themes retune `--scroll-area-max-height`). */
export type ScrollAreaSize = "sm" | "md" | "lg";

export type ScrollAreaProps = {
  content: Html;
  /** @default "y" */
  axis?: ScrollAreaAxis;
  /** Caps the height (a vertical or both-axis area); without it the area fills its box. */
  maxHeight?: ScrollAreaSize;
  /** Edge shadows that show there is more to scroll. @default true */
  shadows?: boolean;
  /** A thinner scrollbar track. */
  thin?: boolean;
  /**
   * Names the region (`role="region"` + `aria-label`) and makes it
   * keyboard-scrollable (`tabindex="0"`) — needed when the content holds
   * nothing focusable, or a keyboard user could never scroll it.
   */
  label?: string;
  attrs?: Attrs;
};

/**
 * A scroll container with a styled scrollbar (thin, token colours, on
 * every engine) and edge shadows that appear only where there is more to
 * scroll — pure CSS (`background-attachment: local`), no script. Give it a
 * `label` when its content has no focusable children, so the keyboard can
 * reach and scroll it.
 */
export function ScrollArea(props: ScrollAreaProps): Html {
  const axis = props.axis ?? "y";
  return html`<div${
    classAttrs(
      "scroll-area",
      mergeAttrs(props.attrs, {
        role: props.label ? "region" : undefined,
        "aria-label": props.label,
        tabindex: props.label ? "0" : undefined,
      }),
      `scroll-area--${axis}`,
      props.maxHeight && `scroll-area--${props.maxHeight}`,
      props.shadows === false && "scroll-area--plain",
      props.thin && "scroll-area--thin",
    )
  }>${props.content}</div>`;
}
