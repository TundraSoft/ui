/**
 * The demo site's chrome, built from the library: a `SidebarLayout` whose
 * collapsible `Sidebar` is the only navigation (groups → sub-groups →
 * pages, the current page marked and its groups open; on a phone it is the
 * drawer, on a desktop it collapses to an icon rail with flyouts). The
 * header holds no links — only the display controls: theme, density and
 * light/dark. Every page carries the toast region and the confirm dialog
 * so a component that uses them works on its own page.
 */
import { type Html, html, render } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { ChartScript } from "../../../components/chart/chart.ts";
import { ConfirmModal } from "../../../components/modal/modal.ts";
import { Navbar } from "../../../components/navbar/navbar.ts";
import { Select } from "../../../components/select/select.ts";
import { Sidebar } from "../../../components/sidebar/sidebar.ts";
import { ToastRegion } from "../../../components/toast/toast.ts";
import { SidebarLayout } from "../../../layouts/sidebar/sidebar.ts";
import { Icon } from "../../../shared/icons.ts";
import { siteMenu } from "./nav.ts";

/** The sample themes the header can switch to — one stylesheet after the bundle. */
export const THEMES: readonly { id: string; label: string; blurb: string }[] = [
  { id: "", label: "Base", blurb: "Warm neutrals, ink primary and one rust accent — tokens/default.css alone." },
  {
    id: "console",
    label: "Console",
    blurb: "Dark first: light is the variant. A cool palette for developer tools, with its own rail partial.",
  },
  {
    id: "ledger",
    label: "Ledger",
    blurb: "A serif display face and square corners everywhere, for finance and print.",
  },
  { id: "portal", label: "Portal", blurb: "Taller controls and rounder corners — a friendlier customer portal." },
  { id: "sunset", label: "Sunset", blurb: "A warm orange brand, tuned so every text use still clears 4.5:1." },
];

export const DENSITIES: readonly { id: string; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "comfortable", label: "Comfortable" },
];

export const brand: Html = html`<span class="sidebar__brand-mark">U</span><span
  class="sidebar__brand-label">@tundralibs/ui</span>`;

/** What the page is and where it sits — the header's plain-text context line (not links). */
export type PageMeta = {
  /** Path from the demo root, e.g. `components/select.html`. */
  path: string;
  title: string;
  /** "Forms · Choices" — shown in the header on wide screens. */
  context?: string;
  /** Extra stylesheets (relative to the page). */
  styles?: string[];
  /** Extra scripts after the bundle (relative to the page). */
  scripts?: string[];
  /** Load ApexCharts (only the pages that draw a chart). */
  charts?: boolean;
};

/** `""` from the demo root, `"../"` from a page one folder down. */
export const baseOf = (path: string): string => "../".repeat(path.split("/").length - 1);

function header(meta: PageMeta): Html {
  return Navbar({
    id: "site-header",
    brand: html`
      <span class="site-header__brand hide-lg-up">${brand}</span><span
        class="site-header__context hide-lg">${meta.context ?? ""}</span>
    `,
    actions: html`${
      Select({
        id: "site-theme",
        extraClass: "site-control",
        searchable: false,
        options: THEMES.map((t) => ({ value: t.id || "base", label: t.label })),
        value: "base",
        attrs: { "aria-label": "Theme", "data-site-theme": "" },
      })
    }<span class="hide-sm">${
      Select({
        id: "site-density",
        extraClass: "site-control",
        searchable: false,
        options: DENSITIES.map((d) => ({ value: d.id, label: d.label })),
        value: "default",
        attrs: { "aria-label": "Density", "data-site-density": "" },
      })
    }</span>${
      Button({
        label: html`<span class="site-mode site-mode--light">${Icon("moon", { size: 16 })}<span
          class="hide-sm">Dark</span></span><span class="site-mode site-mode--dark">${Icon("sun", { size: 16 })}<span
          class="hide-sm">Light</span></span>`,
        variant: "outline",
        attrs: { "data-theme-toggle": "", "aria-label": "Toggle dark mode" },
      })
    }`,
  });
}

/** A whole page: document, chrome, the page's content. */
export function sitePage(meta: PageMeta, content: Html): string {
  const base = baseOf(meta.path);
  const sidebar = Sidebar({
    id: "site-sidebar",
    brand,
    items: siteMenu(meta.path, base),
    collapsible: true,
  });
  return render(html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${meta.title} — @tundralibs/ui</title>
        <link rel="stylesheet" href="${base}../dist/ui.css">
        <link rel="stylesheet" href="${base}site.css">${(meta.styles ?? []).map((href) =>
          html`
            <link rel="stylesheet" href="${href}">
          `
        )}
        <link rel="stylesheet" id="theme-css" data-themes="${base}../examples/themes/">
      </head>
      <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    ${SidebarLayout({
      header: header(meta),
      sidebar,
      sidebarId: "site-sidebar",
      content: html`<div class="site-page">${content}</div>`,
      stickyHeader: true,
    })}
    ${ToastRegion()}${ConfirmModal()}
    ${meta.charts ? ChartScript() : ""}
    <script src="${base}../dist/ui.js"></script>
    <script src="${base}site.js"></script>${(meta.scripts ?? []).map((src) =>
      html`
        <script src="${src}"></script>
      `
    )}
      </body>
    </html>
  `);
}
