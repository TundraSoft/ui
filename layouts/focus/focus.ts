import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type FocusLayoutProps = {
  /** Minimal: a logo and an exit link, typically. */
  header?: Html;
  content: Html;
  footer?: Html;
  width?: "narrow" | "wide";
  contentId?: string;
  attrs?: Attrs;
};

/** One centred column, no distractions. */
export function FocusLayout(props: FocusLayoutProps): Html {
  return html`<div${
    classAttrs(
      "layout layout--focus layout--static-header",
      props.attrs,
      props.width === "wide" && "layout--focus-wide",
    )
  }>${props.header && html`<header class="layout__header">${props.header}</header>`}<main class="layout__content" id="${
    props.contentId ?? "main-content"
  }">${props.content}</main>${props.footer && html`<footer class="layout__footer">${props.footer}</footer>`}</div>`;
}
