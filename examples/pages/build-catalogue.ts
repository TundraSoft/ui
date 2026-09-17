/**
 * The catalogue as one page per group (demo/forms.html, data.html,
 * charts.html, cards.html, navigation.html, actions.html, feedback.html)
 * plus demo/index.html. The pages' own chrome is built from the library:
 * a SidebarLayout with a nested Sidebar menu (every group, every component
 * as an anchor; the current group expanded, the current link marked by
 * menu.js), a Navbar with a ⌘K command palette that jumps to any
 * component, the theme switcher (Base / Console / Ledger / Portal /
 * Sunset — one extra stylesheet after the bundle), the dark toggle, a
 * PageHeader with a Breadcrumb and an "On this page" Dropdown, and Stats
 * on the index. Build locally with `deno task build:demos` and open
 * demo/index.html.
 */
import { type Html, html, render } from "@tundralibs/rapid/ui";
import { ensureDir, writeTextFile } from "@tundralibs/compat/file";
import { Breadcrumb } from "../../components/breadcrumb/breadcrumb.ts";
import { Button } from "../../components/button/button.ts";
import { Card } from "../../components/card/card.ts";
import { ChartScript } from "../../components/chart/chart.ts";
import { Command } from "../../components/command/command.ts";
import { Dropdown } from "../../components/dropdown/dropdown.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { Menu, type MenuItem } from "../../components/menu/menu.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Sidebar } from "../../components/sidebar/sidebar.ts";
import { Stat } from "../../components/stat/stat.ts";
import { ToastRegion } from "../../components/toast/toast.ts";
import { SidebarLayout } from "../../layouts/sidebar/sidebar.ts";
import { Icon, type IconName, iconNames } from "../../shared/icons.ts";
import { catalogue, catalogueCss, type CatalogueGroup, catalogueGroups, catalogueHtml } from "../shared/catalogue.ts";
import { layoutNames } from "../shared/layout-samples.ts";

const all = catalogue();
const totalCases = all.reduce((n, e) => n + e.cases.length, 0);
const GROUP_ICON: Record<CatalogueGroup, IconName> = {
  forms: "edit",
  data: "table",
  charts: "trendUp",
  cards: "folder",
  navigation: "list",
  actions: "plus",
  feedback: "bell",
};

/** An icon per component, from the library's own set, for the submenu and the page dropdown. */
const COMPONENT_ICON: Record<string, IconName> = {
  input: "edit",
  textarea: "edit",
  select: "chevronDown",
  choice: "check",
  switch: "plug",
  slider: "trendUp",
  segmented: "list",
  combobox: "search",
  datepicker: "calendar",
  otp: "terminal",
  dropzone: "upload",
  "form-field": "list",
  form: "edit",
  editor: "edit",
  "data-table": "table",
  pagination: "chevronRight",
  badge: "check",
  avatar: "user",
  stat: "coin",
  timeline: "trendUp",
  empty: "folder",
  skeleton: "list",
  progress: "trendUp",
  chart: "trendUp",
  card: "folder",
  grid: "dashboard",
  "page-header": "edit",
  toolbar: "filter",
  collapsible: "chevronDown",
  tabs: "list",
  wizard: "chevronsRight",
  navbar: "list",
  sidebar: "list",
  menu: "kebab",
  breadcrumb: "chevronRight",
  command: "search",
  button: "plus",
  dropdown: "chevronDown",
  popover: "info",
  tooltip: "info",
  alert: "warning",
  toast: "bell",
  modal: "x",
};
const iconOf = (name: string, size = 16) => Icon(COMPONENT_ICON[name] ?? "folder", { size });

export const themes: readonly { label: string; file: string }[] = [
  { label: "Base", file: "" },
  { label: "Console", file: "../examples/themes/console.css" },
  { label: "Ledger", file: "../examples/themes/ledger.css" },
  { label: "Portal", file: "../examples/themes/portal.css" },
  { label: "Sunset", file: "../examples/themes/sunset.css" },
];

const themeButton = (t: { label: string; file: string }, pressed = false) =>
  html`
    <button type="button" class="btn btn--subtle btn--sm" data-theme-file="${t.file}"
      aria-pressed="${pressed ? "true" : "false"}">${t.label}</button>
  `;

/* ------------------------------------------------------------ chrome */

/** Every group, every component — the sidebar's nested menu. */
function sidebar(active?: CatalogueGroup): Html {
  const items: MenuItem[] = [
    { label: "Overview", href: "index.html", icon: Icon("dashboard", { size: 18 }), active: active === undefined },
    ...catalogueGroups.map((g): MenuItem => ({
      label: g.title,
      href: `${g.id}.html`,
      icon: Icon(GROUP_ICON[g.id], { size: 18 }),
      active: g.id === active,
      expanded: g.id === active,
      children: all.filter((e) => e.group === g.id).map((e) => ({
        label: e.name,
        href: `${g.id}.html#cat-${e.name}`,
        icon: iconOf(e.name),
      })),
    })),
    { label: "Layouts", href: "layouts/index.html", icon: Icon("folder", { size: 18 }) },
    { label: "Admin sample", href: "admin/dashboard.html", icon: Icon("users", { size: 18 }) },
  ];
  return Sidebar({
    id: "cat-sidebar",
    brand: html`<span class="sidebar__brand-mark">U</span> @tundralibs/ui`,
    items,
    collapsible: true,
  });
}

/** ⌘K: jump to any component on any page. */
const palette = Command({
  id: "cat-palette",
  placeholder: "Jump to a component…",
  label: "Components",
  items: all.map((e) => ({
    label: e.name,
    icon: COMPONENT_ICON[e.name],
    group: catalogueGroups.find((g) => g.id === e.group)!.title,
    href: `${e.group}.html#cat-${e.name}`,
    meta: `${e.cases.length} cases`,
  })),
});

function navbar(): Html {
  return Navbar({
    id: "cat-topbar",
    brand: html`<span class="sidebar__brand-mark">U</span> Catalogue`,
    links: [{ href: "layouts/index.html", label: "Layouts" }, { href: "admin/dashboard.html", label: "Admin" }],
    actions: html`${
      Button({
        label: "Search",
        variant: "outline",
        size: "sm",
        iconStart: Icon("search", { size: 14 }),
        attrs: { "data-command-open": "#cat-palette", "aria-keyshortcuts": "Meta+K" },
      })
    }<span class="cat-themes hide-sm" role="group" aria-label="Theme">${
      themes.map((t, i) => themeButton(t, i === 0))
    }</span>${
      Button({
        label: "Dark",
        variant: "outline",
        size: "sm",
        iconStart: Icon("moon", { size: 14 }),
        attrs: { "data-theme-toggle": "" },
      })
    }`,
  });
}

const doc = (title: string, body: Html) =>
  html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <link rel="stylesheet" href="../dist/ui.css">
        <link rel="stylesheet" href="catalogue.css">
        <link rel="stylesheet" id="theme-css" href="">
      </head>
      <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    ${body}
    ${palette}
    ${ToastRegion()}
    ${ChartScript()}
    <script src="../dist/ui.js"></script>
    <script src="catalogue.js"></script>
      </body>
    </html>
  `;

const frame = (content: Html, active?: CatalogueGroup) =>
  SidebarLayout({ header: navbar(), sidebar: sidebar(active), sidebarId: "cat-sidebar", content, stickyHeader: true });

/* ------------------------------------------------------------- pages */

await ensureDir("demo");

for (const group of catalogueGroups) {
  const entries = all.filter((e) => e.group === group.id);
  const cases = entries.reduce((n, e) => n + e.cases.length, 0);
  const content = html`${
    PageHeader({
      title: group.title,
      subtitle: `${group.blurb} ${entries.length} components · ${cases} cases.`,
      breadcrumb: Breadcrumb({ items: [{ label: "Catalogue", href: "index.html" }, { label: group.title }] }),
      actions: Dropdown({
        id: "cat-jump",
        trigger: "On this page",
        align: "end",
        content: Menu({
          id: "cat-jump-menu",
          items: entries.map((e) => ({ label: e.name, href: `#cat-${e.name}`, icon: iconOf(e.name) })),
        }),
      }),
    })
  }${catalogueHtml(entries)}`;
  await writeTextFile(
    `demo/${group.id}.html`,
    render(doc(`${group.title} — @tundralibs/ui`, frame(content, group.id))),
  );
}

const index = html`
  ${PageHeader({
    title: "@tundralibs/ui",
    subtitle:
      "Every component in every variant, every layout, and one full admin sample — generated by deno task build:demos. The rAPId example app (deno task app) serves the same pages over HTTP.",
    actions: Button({
      label: "Jump to a component",
      variant: "outline",
      iconStart: Icon("search", { size: 14 }),
      attrs: { "data-command-open": "#cat-palette" },
    }),
  })}${Grid({
    items: [
      ["Components", String(all.length), "table"],
      ["Catalogue cases", String(totalCases), "list"],
      ["Layouts", String(layoutNames.length), "folder"],
      ["Chart types", "28", "trendUp"],
    ].map(([label, value, icon]) =>
      GridCol({
        span: 3,
        content: Card({ body: Stat({ label, value, tone: "primary", icon: Icon(icon as IconName, { size: 20 }) }) }),
      })
    ),
  })}<h2>Components</h2>${Grid({
    items: catalogueGroups.map((g) =>
      GridCol({
        span: 4,
        content: Card({
          title: g.title,
          href: `${g.id}.html`,
          avatar: html`<span class="stat__icon">${Icon(GROUP_ICON[g.id], { size: 18 })}</span>`,
          body: html`
            <p>${g.blurb}</p>
            <p class="text-muted text-sm">${all.filter((e) => e.group === g.id).map((e) => e.name).join(" · ")}</p>
          `,
        }),
      })
    ),
  })}<h2>Layouts</h2>${Grid({
    items: [
      GridCol({
        span: 4,
        content: Card({
          title: "All layouts",
          href: "layouts/index.html",
          body: html`<p>The ${layoutNames.length} frames, one page each, at every viewport band.</p>`,
        }),
      }),
      ...layoutNames.map((name) =>
        GridCol({
          span: 2,
          content: Card({
            title: name,
            href: `layouts/${name}.html`,
            body: html`<p class="text-muted text-sm">layouts/${name}</p>`,
          }),
        })
      ),
    ],
  })}<h2>Icons</h2><p
    class="text-muted">The built-in set — <code class="text-mono">Icon(name)</code> in a template, <code class="text-mono">&lt;use href="#icon-name"&gt;</code> from the sprite in plain HTML.</p><ul
    class="cat-icons">${iconNames.map((name) =>
      html`<li class="cat-icon">${Icon(name, { size: 22 })}<span class="text-mono text-2xs">${name}</span></li>`
    )}</ul><h2>Full sample</h2>${Grid({
      items: [
        GridCol({
          span: 4,
          content: Card({
            title: "Admin",
            href: "admin/dashboard.html",
            body: html`<p>Dashboard, tables, forms, settings, lock screen, 404 — a theme on top of the base.</p>`,
          }),
        }),
      ],
    })}
`;
await writeTextFile("demo/index.html", render(doc("@tundralibs/ui demos", frame(index))));

await writeTextFile(
  "demo/catalogue.css",
  `/* Harness-only layout for the catalogue pages — not part of the library. */
.cat-themes { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--radius-md); background: var(--color-surface-sunken); }
.cat-themes .btn[aria-pressed="true"] { background: var(--color-surface); color: var(--color-text); box-shadow: var(--shadow-sm); }
.cat-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr)); gap: var(--space-2); }
.cat-icon { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-3); border: var(--border-width) dashed var(--color-border); border-radius: var(--radius-md); }
${catalogueCss}`,
);
await writeTextFile(
  "demo/catalogue.js",
  `/* Harness-only: swap the theme stylesheet. Dark mode is the library's own
   theme-toggle.js ([data-theme-toggle]) — nothing to add here. */
(() => {
  const link = document.getElementById("theme-css");
  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-theme-file]");
    if (!btn) return;
    link.setAttribute("href", btn.getAttribute("data-theme-file"));
    document.querySelectorAll("[data-theme-file]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
  });
})();
`,
);
console.log(
  `Built demo/{${
    catalogueGroups.map((g) => g.id).join(",")
  }}.html (${all.length} components, ${totalCases} cases) and demo/index.html`,
);
