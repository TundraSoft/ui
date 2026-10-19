import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { frameHeader } from "../header.ts";

export type StackedLayoutProps = {
  /** Usually a `Navbar`. */
  header?: Html;
  /**
   * A full-width second row under the header: an announcement or ticker
   * strip, a secondary nav. Content wider than the screen scrolls inside
   * the strip instead of widening the page.
   */
  subheader?: Html;
  content: Html;
  footer?: Html;
  /**
   * `fluid` (default) fills the frame, its content column padded by the
   * gutter (and, from 1400px, capped at `--layout-max-width`); `boxed` caps
   * and centres the column; `bleed` drops the column's padding and gap so
   * each section spans the viewport and sets its own inner width — a
   * marketing page of full-width bands.
   */
  width?: "fluid" | "boxed" | "bleed";
  /** Header is sticky by default. */
  stickyHeader?: boolean;
  /** Stable id for the swap/push region (§4). Default `main-content`. */
  contentId?: string;
  attrs?: Attrs;
};

/** Header → content → footer. The simplest frame. */
export function StackedLayout(props: StackedLayoutProps): Html {
  return html`<div${
    classAttrs(
      "layout layout--stacked",
      props.attrs,
      props.width === "boxed" && "layout--boxed",
      props.width === "bleed" && "layout--bleed",
      props.stickyHeader === false && "layout--static-header",
    )
  }>${frameHeader(props.header, props.subheader)}<main class="layout__content" id="${
    props.contentId ?? "main-content"
  }">${props.content}</main>${props.footer && html`<footer class="layout__footer">${props.footer}</footer>`}</div>`;
}
