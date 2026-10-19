import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { frameHeader } from "../header.ts";

export type ArticleLayoutProps = {
  header?: Html;
  /**
   * A full-width second row under the header: an announcement or ticker
   * strip, a secondary nav. Content wider than the screen scrolls inside
   * the strip instead of widening the page.
   */
  subheader?: Html;
  content: Html;
  /** Table of contents, related posts, author card… */
  aside?: Html;
  asideSide?: "start" | "end";
  footer?: Html;
  /** `reading` (default) caps at --layout-measure; `wide` at --layout-max-width. */
  measure?: "reading" | "wide";
  stickyHeader?: boolean;
  contentId?: string;
  attrs?: Attrs;
};

/** A reading column with an optional aside. */
export function ArticleLayout(props: ArticleLayoutProps): Html {
  return html`<div${
    classAttrs(
      "layout layout--article",
      props.attrs,
      props.measure === "wide" && "layout--article-wide",
      props.aside && "layout--has-aside",
      props.asideSide === "start" && "layout--aside-start",
      props.stickyHeader === false && "layout--static-header",
    )
  }>${frameHeader(props.header, props.subheader)}<main class="layout__content" id="${
    props.contentId ?? "main-content"
  }"><article class="layout__article">${props.content}</article>${
    props.aside && html`<aside class="layout__aside">${props.aside}</aside>`
  }</main>${props.footer && html`<footer class="layout__footer">${props.footer}</footer>`}</div>`;
}
