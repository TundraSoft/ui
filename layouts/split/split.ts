import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type SplitLayoutProps = {
  header?: Html;
  /** The master pane (a list). Gets a stable id so it can be swapped. */
  pane: Html;
  paneId?: string;
  /** The detail. */
  content: Html;
  contentId?: string;
  /**
   * Which pane a phone shows — a route decision (e.g. `/inbox` → list,
   * `/inbox/42` → detail). The detail should carry its own back link.
   */
  mobileView?: "pane" | "detail";
  stickyHeader?: boolean;
  attrs?: Attrs;
};

/** Master/detail two-pane frame; one pane at a time on phones. */
export function SplitLayout(props: SplitLayoutProps): Html {
  return html`<div${
    classAttrs(
      "layout layout--split",
      props.attrs,
      props.mobileView === "detail" && "layout--show-detail",
      props.stickyHeader === false && "layout--static-header",
    )
  }>${
    props.header && html`<header class="layout__header">${props.header}</header>`
  }<div class="layout__body"><section class="layout__pane" id="${
    props.paneId ?? "pane"
  }">${props.pane}</section><main class="layout__content" id="${
    props.contentId ?? "main-content"
  }">${props.content}</main></div></div>`;
}
