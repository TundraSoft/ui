import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

/** Which bottom corner the button sits in. */
export type BackToTopPosition = "end" | "start";

export type BackToTopProps = {
  /** @default "back-to-top" */
  id?: string;
  /** Accessible name. @default "Back to top" */
  label?: string;
  /** Pixels scrolled before the button appears. @default 600 */
  threshold?: number;
  /** @default "end" */
  position?: BackToTopPosition;
  /**
   * In flow, always shown (a catalogue, a footer slot) instead of fixed
   * to the corner and shown past `threshold`.
   */
  static?: boolean;
  attrs?: Attrs;
};

/**
 * A round button fixed to a bottom corner that appears once the page has
 * scrolled `threshold` px (back-to-top.js) and scrolls to the top —
 * smoothly unless the person prefers reduced motion — then moves focus to
 * the main content so a keyboard user lands where the page starts. Rendered
 * hidden; without the script it stays hidden (a static page is scrolled by
 * the browser's own means).
 */
export function BackToTop(props: BackToTopProps = {}): Html {
  const label = props.label ?? "Back to top";
  return html`
    <button type="button" ${classAttrs(
      "back-to-top",
      mergeAttrs(props.attrs, { id: props.id ?? "back-to-top", "aria-label": label, title: label }),
      props.position === "start" && "back-to-top--start",
      props.static && "back-to-top--static",
    )}${renderAttrs({
      "data-back-to-top": "",
      "data-back-to-top-threshold": props.static ? undefined : String(props.threshold ?? 600),
      hidden: props.static ? undefined : "",
    })}>${Icon("arrowUp", { size: 20 })}</button>
  `;
}
