import { type Html, type RapidTemplate, template } from "@tundralibs/rapid/ui";
import { Navbar, type NavbarLink } from "../components/navbar/navbar.ts";
import { Sidebar } from "../components/sidebar/sidebar.ts";
import type { MenuItem } from "../components/menu/menu.ts";
import { SidebarLayout } from "../layouts/sidebar/sidebar.ts";
import { StackedLayout } from "../layouts/stacked/stacked.ts";

export type LayoutData = {
  body: Html;
  title?: string;
};

/**
 * Turn any layout into the `RapidTemplate<{ body, title? }>` that
 * `Application.initialize({ ui: { layout } })` expects. The frame
 * (nav, sidebar, footer) is fixed at initialize time — it is not
 * per-request data — so it is a closure, and only `body` flows through:
 *
 *   ui: { layout: asRapidLayout((body) => SidebarLayout({ header, sidebar, sidebarId, content: body })) }
 */
export function asRapidLayout(frame: (body: Html, data: LayoutData) => Html): RapidTemplate<LayoutData> {
  return template<LayoutData>((data) => frame(data.body, data), "layout");
}

export type LayoutConfig = {
  brand?: Html;
  navLinks?: NavbarLink[];
  navActions?: Html;
  sidebarItems?: MenuItem[];
};

/**
 * Convenience: a Navbar (+ optional Sidebar) frame from plain config —
 * StackedLayout without `sidebarItems`, SidebarLayout with them.
 */
export function createLayoutTemplate(config: LayoutConfig = {}): RapidTemplate<LayoutData> {
  const sidebarId = "main-sidebar";
  const navbar = Navbar({
    id: "main-navbar",
    brand: config.brand,
    links: config.navLinks,
    actions: config.navActions,
  });

  if (!config.sidebarItems) {
    return asRapidLayout((body) => StackedLayout({ header: navbar, content: body }));
  }

  const sidebar = Sidebar({ id: sidebarId, items: config.sidebarItems, collapsible: true });
  return asRapidLayout((body) => SidebarLayout({ header: navbar, sidebar, sidebarId, content: body }));
}
