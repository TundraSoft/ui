import { type Html, html, type RapidLayoutData, type RapidTemplate, template } from "@tundralibs/rapid/ui";
import { Breadcrumb, type BreadcrumbItem } from "../components/breadcrumb/breadcrumb.ts";
import { Navbar, type NavbarLink } from "../components/navbar/navbar.ts";
import { Sidebar } from "../components/sidebar/sidebar.ts";
import type { MenuItem } from "../components/menu/menu.ts";
import { SidebarLayout } from "../layouts/sidebar/sidebar.ts";
import { StackedLayout } from "../layouts/stacked/stacked.ts";

/**
 * What a route hands its frame through rAPId's `layoutData` (rAPId ≥ 0.9),
 * as this library reads it. `crumbs` is the one key the library itself
 * draws (`PageCrumbs`, `createLayoutTemplate`); anything else — a phone
 * bar's way back, a section's badge — is the app's own convention.
 */
export type LayoutPage = {
  /** The trail to this page, last item current: drawn by `PageCrumbs`. */
  crumbs?: BreadcrumbItem[];
  [key: string]: unknown;
};

/** What a frame receives: the page's markup, its title, and the route's `layoutData`. */
export type LayoutData<P = LayoutPage> = {
  body: Html;
  title?: string;
  page?: P;
};

/**
 * Turn any layout into the `RapidTemplate<RapidLayoutData>` that
 * `Application.initialize({ ui: { layout } })` (or a route's or module's
 * `layout`) expects. The frame (nav, sidebar, footer) is fixed at
 * initialize time — it is not per-request data — so it is a closure;
 * per page it gets the body, the route's `title` and the route's
 * `layoutData` as `data.page`:
 *
 *   ui: { layout: asRapidLayout((body, data) => SidebarLayout({ header, sidebar, sidebarId,
 *     content: html`${PageCrumbs(data.page)}${body}` })) }
 *
 * and on a route: `template: { render: LinkView, layoutData: (d) => ({ crumbs: [...] }) }`.
 * rAPId types `page` as an open record, so `P` is the app's own contract,
 * not checked against the route.
 */
export function asRapidLayout<P = LayoutPage>(
  frame: (body: Html, data: LayoutData<P>) => Html,
): RapidTemplate<RapidLayoutData> {
  return template<RapidLayoutData>((data) => frame(data.body, data as LayoutData<P>), "layout");
}

/**
 * The page's breadcrumb from its `layoutData.crumbs` — nothing when the
 * route sets none. Folds the middle crumbs on a narrow content column
 * (`Breadcrumb({ collapse })`). Place it at the top of the content slot.
 */
export function PageCrumbs(page?: LayoutPage): Html {
  const items = page?.crumbs;
  return items?.length ? html`<div class="layout__crumbs">${Breadcrumb({ items, collapse: true })}</div>` : html``;
}

export type LayoutConfig = {
  brand?: Html;
  navLinks?: NavbarLink[];
  navActions?: Html;
  sidebarItems?: MenuItem[];
};

/**
 * Convenience: a Navbar (+ optional Sidebar) frame from plain config —
 * StackedLayout without `sidebarItems`, SidebarLayout with them. A route's
 * `layoutData: { crumbs }` is drawn at the top of the content.
 */
export function createLayoutTemplate(config: LayoutConfig = {}): RapidTemplate<RapidLayoutData> {
  const sidebarId = "main-sidebar";
  const navbar = Navbar({
    id: "main-navbar",
    brand: config.brand,
    links: config.navLinks,
    actions: config.navActions,
  });

  if (!config.sidebarItems) {
    return asRapidLayout((body, data) =>
      StackedLayout({ header: navbar, content: html`${PageCrumbs(data.page)}${body}` })
    );
  }

  const sidebar = Sidebar({ id: sidebarId, items: config.sidebarItems, collapsible: true });
  return asRapidLayout((body, data) =>
    SidebarLayout({ header: navbar, sidebar, sidebarId, content: html`${PageCrumbs(data.page)}${body}` })
  );
}
