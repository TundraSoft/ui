import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type StackedLayoutProps = {
  /** Usually a `Navbar`. */
  header?: Html;
  content: Html;
  footer?: Html;
  /** `boxed` caps and centres the content column; `fluid` (default) fills. */
  width?: "fluid" | "boxed";
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
      props.stickyHeader === false && "layout--static-header",
    )
  }>${props.header && html`<header class="layout__header">${props.header}</header>`}<main class="layout__content" id="${
    props.contentId ?? "main-content"
  }">${props.content}</main>${props.footer && html`<footer class="layout__footer">${props.footer}</footer>`}</div>`;
}
