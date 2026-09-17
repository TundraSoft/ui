import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type ArticleLayoutProps = {
  header?: Html;
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
  }>${props.header && html`<header class="layout__header">${props.header}</header>`}<main class="layout__content" id="${
    props.contentId ?? "main-content"
  }"><article class="layout__article">${props.content}</article>${
    props.aside && html`<aside class="layout__aside">${props.aside}</aside>`
  }</main>${props.footer && html`<footer class="layout__footer">${props.footer}</footer>`}</div>`;
}
