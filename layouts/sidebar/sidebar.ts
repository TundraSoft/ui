import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { SidebarToggle } from "../../components/sidebar/sidebar.ts";

export type SidebarLayoutProps = {
  /** Usually a `Navbar`. The drawer toggle is added in front of it. */
  header?: Html;
  /** A `Sidebar` component whose `id` equals `sidebarId`. */
  sidebar: Html;
  sidebarId: string;
  content: Html;
  /** Secondary column beside the content (activity feed, filters). */
  aside?: Html;
  footer?: Html;
  side?: "start" | "end";
  width?: "fluid" | "boxed";
  stickyHeader?: boolean;
  /** Set false if the header already contains its own `SidebarToggle`. */
  drawerToggle?: boolean;
  contentId?: string;
  attrs?: Attrs;
};

/** Header + side navigation + content. The app frame. */
export function SidebarLayout(props: SidebarLayoutProps): Html {
  const toggle = props.drawerToggle === false
    ? ""
    : SidebarToggle({ targetId: props.sidebarId, attrs: { class: "layout__drawer-toggle" } });

  return html`<div${
    classAttrs(
      "layout layout--sidebar",
      props.attrs,
      props.side === "end" && "layout--sidebar-end",
      props.width === "boxed" && "layout--boxed",
      props.stickyHeader === false && "layout--static-header",
    )
  }><header class="layout__header">${toggle}${
    props.header ?? ""
  }</header><div class="layout__body">${props.sidebar}<div class="layout__backdrop" data-toggle-close="#${props.sidebarId}"></div><main class="layout__content" id="${
    props.contentId ?? "main-content"
  }">${props.content}</main>${props.aside && html`<aside class="layout__aside">${props.aside}</aside>`}</div>${
    props.footer && html`<footer class="layout__footer">${props.footer}</footer>`
  }</div>`;
}
