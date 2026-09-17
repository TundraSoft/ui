/**
 * One sample page per layout, each filled with placeholder partials so
 * every frame can be seen and driven at every viewport band. Consumed by
 * the static demo (examples/pages/build-layouts.ts) and by the rAPId
 * example app (examples/app/); `hrefs` is the only difference.
 */
import { type Html, html } from "@tundralibs/rapid/ui";
import {
  ArticleLayout,
  AuthLayout,
  DocsLayout,
  FocusLayout,
  RailLayout,
  SidebarLayout,
  SplitLayout,
  StackedLayout,
} from "../../layouts/mod.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { Sidebar } from "../../components/sidebar/sidebar.ts";
import { Card } from "../../components/card/card.ts";
import { Button } from "../../components/button/button.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Input } from "../../components/input/input.ts";
import { Form } from "../../components/form/form.ts";
import { FormActions, FormField } from "../../components/form-field/form-field.ts";
import { Wizard } from "../../components/wizard/wizard.ts";
import { Menu } from "../../components/menu/menu.ts";
import { Timeline } from "../../components/timeline/timeline.ts";
import { Icon } from "../../shared/icons.ts";

export const layoutNames = ["stacked", "sidebar", "rail", "split", "article", "docs", "auth", "focus"] as const;
export type LayoutName = typeof layoutNames[number];

export type LayoutHrefs = {
  /** The layouts index page. */
  index: string;
  /** One layout's page. */
  page: (name: LayoutName) => string;
};

export const staticHrefs: LayoutHrefs = { index: "index.html", page: (name) => `${name}.html` };

const navbar = (id: string, hrefs: LayoutHrefs) =>
  Navbar({
    id,
    brand: html`<span class="sidebar__brand-mark">L</span> Layouts`,
    links: [{ href: hrefs.index, label: "All layouts", active: true }, { href: "#", label: "Docs" }, {
      href: "#",
      label: "About",
    }],
    actions: Button({ label: "Action", size: "sm" }),
  });

const navItems = [
  { label: "Overview", href: "#", icon: Icon("dashboard", { size: 18 }), active: true },
  { label: "Projects", href: "#", icon: Icon("folder", { size: 18 }) },
  { label: "Team", href: "#", icon: Icon("users", { size: 18 }) },
  { label: "Settings", href: "#", icon: Icon("settings", { size: 18 }) },
];

const lorem =
  html`<p>Every layout is a frame: chrome and slots, never content. This card is placeholder content so the frame can be seen at 375, 768, 1024, 1440 and 1920 pixels wide — the test loads each page at every one of those and checks that nothing overflows, the navigation is reachable, and the content column stays within its cap.</p>`;

const cards = (n: number, span: 12 | 6 | 4 | 3 = 4) =>
  Grid({
    items: Array.from(
      { length: n },
      (_, i) => GridCol({ span, content: Card({ title: `Card ${i + 1}`, body: lorem }) }),
    ),
  });

const footer =
  html`<p>&copy; 2026 Layout gallery &middot; every frame from <code class="text-mono">layouts/</code></p>`;

/** Every layout's sample page, keyed by name. */
export function layoutSamples(hrefs: LayoutHrefs = staticHrefs): Record<LayoutName, Html> {
  return {
    stacked: StackedLayout({
      header: navbar("stacked-nav", hrefs),
      width: "boxed",
      footer,
      content: html`${PageHeader({ title: "Stacked", subtitle: "Header → content → footer. Boxed at 1400px." })}${
        cards(6)
      }`,
    }),

    sidebar: SidebarLayout({
      header: navbar("sidebar-nav", hrefs),
      sidebar: Sidebar({ id: "demo-sidebar", items: navItems, collapsible: true }),
      sidebarId: "demo-sidebar",
      aside: Card({
        title: "Activity",
        body: Timeline({
          items: [{ title: "Deployed", meta: "2 min ago", status: "done" }, {
            title: "Build running",
            status: "current",
          }],
        }),
      }),
      footer,
      content: html`${PageHeader({ title: "Sidebar", subtitle: "Drawer below 992px, collapsible rail above." })}${
        Grid({
          items: ["Revenue", "Users", "Latency", "Errors"].map((l, i) =>
            GridCol({
              span: 3,
              content: Card({
                body: Stat({
                  label: l,
                  value: String(1200 + i * 317),
                  tone: "primary",
                  icon: Icon("coin", { size: 20 }),
                }),
              }),
            })
          ),
        })
      }<br>${cards(4, 6)}`,
    }),

    rail: RailLayout({
      brand: "R",
      items: [
        { href: "#", label: "Overview", icon: Icon("dashboard", { size: 20 }), active: true },
        { href: "#", label: "Projects", icon: Icon("folder", { size: 20 }) },
        { href: "#", label: "Team", icon: Icon("users", { size: 20 }) },
        { href: "#", label: "Settings", icon: Icon("settings", { size: 20 }) },
      ],
      end: html`<a class="layout__rail-link" href="#" aria-label="Account">${Icon("user", { size: 20 })}</a>`,
      content: html`${PageHeader({ title: "Rail", subtitle: "Icon rail; a bottom tab bar on phones." })}${cards(6)}`,
    }),

    split: SplitLayout({
      header: navbar("split-nav", hrefs),
      pane: html`<div class="stack stack--sm">${
        Menu({
          id: "split-list",
          items: Array.from({ length: 12 }, (_, i) => ({ label: `Conversation ${i + 1}`, href: "#", active: i === 0 })),
        })
      }</div>`,
      content: html`${
        PageHeader({
          title: "Split",
          subtitle: "Master/detail; one pane at a time on phones.",
          actions: Button({ label: "Back to list", variant: "outline", size: "sm", href: hrefs.page("split") }),
        })
      }${cards(3, 12)}`,
    }),

    article: ArticleLayout({
      header: navbar("article-nav", hrefs),
      footer,
      aside: Card({
        title: "On this page",
        body: html`
          <ul class="stack stack--sm">
            <li><a href="#one">Section one</a></li>
            <li><a href="#two">Section two</a></li>
          </ul>
        `,
      }),
      content: html`
        <h1>Article</h1><p
          class="text-muted">Reading measure capped at 70ch on any screen; the aside drops below on narrow screens.</p><h2
          id="one">Section one</h2>${lorem}${lorem}<h2 id="two">Section two</h2>${lorem}${lorem}
      `,
    }),

    docs: DocsLayout({
      header: navbar("docs-nav", hrefs),
      nav: Sidebar({ id: "docs-sidebar", items: navItems }),
      navId: "docs-sidebar",
      toc: html`
        <ul class="stack stack--sm">
          <li><a href="#install">Install</a></li>
          <li><a href="#usage">Usage</a></li>
          <li><a href="#api">API</a></li>
        </ul>
      `,
      footer,
      content: html`
        <h1>Docs</h1><p class="text-muted">Nav · content · table of contents; three columns from 1200px.</p><h2
          id="install">Install</h2>${lorem}<h2 id="usage">Usage</h2>${lorem}${lorem}<h2 id="api">API</h2>${lorem}
      `,
    }),

    auth: AuthLayout({
      split: true,
      brand: html`<span class="sidebar__brand-mark">L</span>`,
      narrative: html`<h2>Auth</h2><p>A narrative panel from 992px; hidden below.</p>${
        Timeline({
          items: [{ title: "Create an account", status: "done" }, { title: "Verify email", status: "current" }, {
            title: "Invite your team",
          }],
        })
      }`,
      content: Card({
        title: "Sign in",
        body: Form({
          content: html`${
            FormField({ id: "a-email", label: "Email", control: Input({ id: "a-email", type: "email" }) })
          }${FormField({ id: "a-pass", label: "Password", control: Input({ id: "a-pass", type: "password" }) })}${
            FormActions({ content: Button({ label: "Sign in", type: "submit", block: true }) })
          }`,
        }),
      }),
    }),

    focus: FocusLayout({
      header:
        html`<a href="${hrefs.index}" class="navbar__brand"><span class="sidebar__brand-mark">L</span> Layouts</a>`,
      footer: html`<p>Need help? <a href="#">Contact support</a></p>`,
      content: Card({
        title: "Focus",
        subtitle: "One column, no chrome — a checkout or wizard.",
        body: Wizard({
          steps: [{ label: "Details", status: "done" }, { label: "Payment", status: "active" }, { label: "Review" }],
          content: html`${FormField({ id: "f-card", label: "Card number", control: Input({ id: "f-card" }) })}${
            FormActions({
              content: html`${Button({ label: "Back", variant: "ghost" })}${Button({ label: "Continue" })}`,
            })
          }`,
        }),
      }),
    }),
  };
}

/** The index page: one card per layout. */
export function layoutIndex(hrefs: LayoutHrefs = staticHrefs): Html {
  return StackedLayout({
    header: navbar("index-nav", hrefs),
    width: "boxed",
    footer,
    content: html`${PageHeader({ title: "Layouts", subtitle: "Eight frames, each defined at every viewport band." })}${
      Grid({
        items: layoutNames.map((name) =>
          GridCol({
            span: 3,
            content: Card({
              title: name,
              href: hrefs.page(name),
              body: html`<p class="text-muted text-sm">layouts/${name}</p>`,
            }),
          })
        ),
      })
    }`,
  });
}
