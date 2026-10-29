import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { SidebarToggle } from "../../components/sidebar/sidebar.ts";
import { frameHeader } from "../header.ts";

export type DocsLayoutProps = {
  header?: Html;
  /**
   * A full-width second row under the header: an announcement or ticker
   * strip, a secondary nav. Content wider than the screen scrolls inside
   * the strip instead of widening the page.
   */
  subheader?: Html;
  /** A `Sidebar` component whose `id` equals `navId`. */
  nav: Html;
  navId: string;
  content: Html;
  /** "On this page" links. */
  toc?: Html;
  footer?: Html;
  stickyHeader?: boolean;
  contentId?: string;
  attrs?: Attrs;
};

/** Nav · content · table of contents. */
export function DocsLayout(props: DocsLayoutProps): Html {
  const tocId = `${props.contentId ?? "main-content"}-toc`;
  return html`<div${
    classAttrs("layout layout--docs", props.attrs, props.stickyHeader === false && "layout--static-header")
  }>${
    frameHeader(
      html`${SidebarToggle({ targetId: props.navId, attrs: { class: "layout__drawer-toggle" } })}${props.header ?? ""}`,
      props.subheader,
    )
  }<div class="layout__body">${props.nav}<div class="layout__backdrop" data-toggle-close="#${props.navId}"></div><main class="layout__content" id="${
    props.contentId ?? "main-content"
  }"><article class="layout__article">${props.content}</article>${
    props.toc &&
    html`
      <nav class="layout__toc"
        aria-label="On this page"><button type="button" class="layout__toc-toggle js-only" data-toggle="#${tocId}" data-toggle-class aria-expanded="false" aria-controls="${tocId}">On this page</button><p class="layout__toc-title">On this page</p><div class="layout__toc-body" id="${tocId}" data-scrollspy>${props
          .toc}</div></nav>
    `
  }</main></div>${props.footer && html`<footer class="layout__footer">${props.footer}</footer>`}</div>`;
}
