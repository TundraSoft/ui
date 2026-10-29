/**
 * The overview, the layout pages, and the rAPId pages. A layout is a whole
 * frame, so its page shows the frame in an iframe (demo/frames/<name>.html,
 * a standalone document) at phone, tablet and desktop widths rather than
 * nesting one frame inside the site's own; the same goes for the full-page
 * error templates.
 */
import { type Html, html, render } from "@tundralibs/rapid/ui";
import { readTextFile } from "@tundralibs/compat/file";
import { Alert } from "../../../components/alert/alert.ts";
import { Button } from "../../../components/button/button.ts";
import { Card } from "../../../components/card/card.ts";
import { CodeBlock } from "../../../components/code/code.ts";
import { DataTable } from "../../../components/data-table/data-table.ts";
import { DescriptionList } from "../../../components/description-list/description-list.ts";
import { Grid, GridCol } from "../../../components/grid/grid.ts";
import { PageHeader } from "../../../components/page-header/page-header.ts";
import { Segmented } from "../../../components/segmented/segmented.ts";
import { Stat } from "../../../components/stat/stat.ts";
import { Icon, iconNames } from "../../../shared/icons.ts";
import { ErrorTemplate } from "../../../templates/errors.ts";
import type { LayoutName } from "../../shared/layout-samples.ts";
import type { UsageExample } from "../../docs/usage.ts";
import { prettyHtml } from "../../docs/pretty-html.ts";
import { chips, section } from "./component-page.ts";
import { COMPONENT_TREE, FOUNDATIONS, LAYOUT_INFO, type SitePage } from "./nav.ts";

/* ---------------------------------------------------------- overview */

const count = (g: typeof COMPONENT_TREE[number]) => {
  const n = g.sections.reduce((a, s) => a + s.items.length, 0);
  return `${n} component${n === 1 ? "" : "s"}`;
};

export function overviewPage(counts: { components: number; cases: number; tokens: number }): Html {
  const stat = (label: string, value: number, icon: Parameters<typeof Icon>[0]) =>
    GridCol({
      span: { xs: 6, md: 4, xl: 2 },
      content: Card({ body: Stat({ label, value: String(value), tone: "primary", icon: Icon(icon, { size: 20 }) }) }),
    });
  const principle = (title: string, text: string, icon: Parameters<typeof Icon>[0]) =>
    GridCol({
      span: { xs: 12, md: 6 },
      content: Card({
        title,
        avatar: html`<span class="stat__icon">${Icon(icon, { size: 18 })}</span>`,
        body: html`<p>${text}</p>`,
      }),
    });
  return html`${
    PageHeader({
      title: "@tundralibs/ui",
      subtitle:
        "A token-driven HTML, CSS and JS component library — usable as plain assets on any page, and a first-class UI layer for rAPId apps. This site is built from it: every page, every control, and the sidebar you navigate with.",
    })
  }
    ${
    Grid({
      phoneColumns: "2",
      items: [
        stat("Components", counts.components, "dashboard"),
        stat("Catalogued cases", counts.cases, "listChecks"),
        stat("Layouts", Object.keys(LAYOUT_INFO).length, "columns"),
        stat("Chart types", 28, "trendUp"),
        stat("Icons", iconNames.length, "star"),
        stat("Design tokens", counts.tokens, "palette"),
      ],
    })
  }
    ${
    section(
      "start",
      "Quick start",
      Grid({
        items: [
          GridCol({
            span: { xs: 12, lg: 6 },
            content: CodeBlock({
              title: "Any HTML page",
              language: "html",
              code: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tundralibs/ui/dist/ui.css">
<script src="https://cdn.jsdelivr.net/npm/@tundralibs/ui/dist/ui.js" defer></script>

<button class="btn">Save</button>`,
            }),
          }),
          GridCol({
            span: { xs: 12, lg: 6 },
            content: CodeBlock({
              title: "A rAPId app",
              language: "ts",
              code: `import { createCoreTemplate } from "@tundralibs/ui/templates/core";
import { errorTemplates } from "@tundralibs/ui/templates/errors";

await Application.initialize({
  ui: { core: createCoreTemplate({ history: true }), errorTemplates },
});`,
            }),
          }),
        ],
      }),
    )
  }
    ${
    section(
      "contents",
      "What is in the sidebar",
      DescriptionList({
        layout: "inline",
        divided: true,
        items: [
          { term: "Foundations", description: FOUNDATIONS.map((p) => p.label).join(" · ") },
          ...COMPONENT_TREE.map((g) => ({
            term: g.label,
            description: html`${g.blurb} <span class="text-muted">${count(g)}${
              g.sections.length > 1 ? ` in ${g.sections.length} sections` : ""
            }.</span>`,
          })),
          { term: "Layouts", description: "Eight page frames, each shown at phone, tablet and desktop widths." },
          { term: "rAPId", description: "The data-* contract, the templates, and the error pages." },
          {
            term: "Example app",
            description: "A complete admin built from the library with a theme on top — it has its own sidebar.",
          },
        ],
      }),
      "The sidebar is the only navigation. Collapse it to an icon rail with the button at its foot; hover or focus a group there to open it as a flyout.",
    )
  }
    ${
    section(
      "principles",
      "Built to these rules",
      Grid({
        items: [
          principle(
            "Plain HTML first",
            "Every component renders as markup plus the bundle, and works without script where the platform allows; behaviour is layered on through data-* attributes.",
            "file",
          ),
          principle(
            "CSP-clean",
            "No inline style or script attributes anywhere — a page using the library can run a strict Content-Security-Policy.",
            "shield",
          ),
          principle(
            "Tokens, not edits",
            "Component CSS reads only custom properties. A theme is one stylesheet of new values loaded after the bundle.",
            "palette",
          ),
          principle(
            "rAPId-native",
            "Swaps, history, live pushes and form errors use rAPId's own contract — no glue code between the two.",
            "plug",
          ),
        ],
      }),
    )
  }`;
}

/* ----------------------------------------------------------- layouts */

const BANDS: Record<LayoutName, [string, string, string, string]> = {
  stacked: ["Navbar collapses", "Horizontal nav", "—", "Boxed caps at --layout-max-width; fluid grows the gutter"],
  sidebar: [
    "Off-canvas drawer, Escape and backdrop close",
    "Drawer",
    "Full sidebar, collapsible rail, sticky",
    "Content capped when boxed",
  ],
  rail: ["Bottom tab bar", "Rail", "Rail", "Rail"],
  split: ["One pane (a route decision)", "Both, narrow list", "Both", "Detail capped"],
  article: ["Aside below", "Aside below", "Aside beside", "Measure capped at --layout-measure"],
  docs: ["Nav drawer, TOC disclosure", "Same", "Nav and content, TOC disclosure", "Three columns from 1200"],
  auth: ["Card full width", "Centred", "Split panel", "Halves capped"],
  focus: ["Full width", "Centred at --layout-focus-width", "—", "—"],
};

/** A frame in an iframe whose width a Segmented switches (view-switch.js writes data-view). */
function framePreview(id: string, src: string, title: string, view = "desktop"): Html {
  return html`
    <div class="site-preview">
      <div class="site-preview__bar">${Segmented({
        id: `${id}-width`,
        name: `${id}-width`,
        legend: "Preview width",
        size: "sm",
        value: view,
        options: [
          { value: "phone", label: "Phone 375" },
          { value: "tablet", label: "Tablet 768" },
          { value: "desktop", label: "Desktop 1280" },
        ],
        inputAttrs: { "data-view-target": `#${id}` },
      })}${Button({
        label: "Open on its own",
        href: src,
        variant: "ghost",
        size: "sm",
        iconEnd: Icon("externalLink", { size: 14 }),
      })}</div>
      <div class="site-preview__scroll">
        <div class="site-preview__frame" id="${id}" data-view="${view}">
          <iframe src="${src}" title="${title}" loading="lazy"></iframe>
        </div>
      </div>
    </div>
  `;
}

export async function layoutPage(name: LayoutName, usage: UsageExample[], snippets: string[]): Promise<Html> {
  const info = LAYOUT_INFO[name];
  const css = await readTextFile(`layouts/${name}/${name}.css`);
  const tokens = [...new Set([...css.matchAll(/var\((--layout-[a-z-]+|--scroll-padding-top)/g)].map((m) => m[1]!))]
    .sort();
  const fn = `${name[0]!.toUpperCase()}${name.slice(1)}Layout`;
  const [phone, tablet, laptop, wide] = BANDS[name];
  return html`${PageHeader({ title: `${info.label} layout`, subtitle: info.blurb })}
    ${
    CodeBlock({
      code: `import { ${fn} } from "@tundralibs/ui/layouts/${name}";`,
      language: "ts",
      attrs: { class: "site-import" },
    })
  }
    ${
    section(
      "preview",
      "Preview",
      framePreview(`frame-${name}`, `../frames/${name}.html`, `${info.label} layout sample`),
      "The frame with placeholder content. Switch the width to see each band; open it on its own to resize freely.",
    )
  }
    ${
    section(
      "bands",
      "At every width",
      DescriptionList({
        layout: "inline",
        divided: true,
        items: [
          { term: "Phone < 768", description: phone },
          { term: "Tablet 768–991", description: tablet },
          { term: "Laptop 992–1399", description: laptop },
          { term: "Wide ≥ 1400", description: wide },
          { term: "Tokens", description: tokens.length ? chips(tokens) : "—" },
        ],
      }),
    )
  }
    ${
    usage.length
      ? section(
        "usage",
        "Usage",
        html`${
          usage.map((ex, i) =>
            html`
              <h3 class="site-usage__title">${ex.title}</h3>${ex.note
                ? html`<p class="text-muted">${ex.note}</p>`
                : ""}${CodeBlock({ code: snippets[i] ?? "", language: "ts", maxHeight: "md" })}
            `
          )
        }`,
        html`
          A layout is a frame: slots typed <code>Html</code>, the content region carrying a stable id for history push. <code
          >asRapidLayout(body => ${fn}({ …, content: body }))</code> makes it rAPId's <code>ui.layout</code>.
        `,
      )
      : ""
  }`;
}

/* -------------------------------------------------------------- rAPId */

type Row = { id: string; name: string; meaning: string };

const ATTRS: Row[] = [
  { id: "action", name: "data-action", meaning: "URL to fetch on click (or submit, on a form)." },
  { id: "method", name: "data-method", meaning: "HTTP method — get, or post for a form." },
  { id: "target", name: "data-target", meaning: "CSS selector of what gets updated; the element itself by default." },
  { id: "swap", name: "data-swap", meaning: "outer | append | prepend; replaces innerHTML by default." },
  { id: "load", name: "data-load", meaning: "Fetch on mount (GET) — lazy regions; the URL goes in data-action." },
  { id: "push", name: "data-push", meaning: "Push a history entry for this swap; the region needs an id." },
];

const EVENTS: Row[] = [
  { id: "swapped", name: "rapid:swapped", meaning: "A swap landed — { status, url, method, swap, title? }." },
  { id: "error", name: "rapid:error", meaning: "A swap failed — { status, body }." },
  { id: "progress", name: "rapid:progress", meaning: "Upload progress — { url, loaded, total } (dropzone)." },
  { id: "push", name: "rapid:push", meaning: "A live message — { channel, data }; never open your own socket." },
  { id: "live", name: "rapid:live", meaning: "Live connection state — { connected }." },
];

const contractTable = (id: string, rows: Row[], label: string) =>
  DataTable<Row>({
    id,
    rows,
    rowKey: (r) => r.id,
    columns: [
      { key: "name", label, mono: true },
      { key: "meaning", label: "Meaning" },
    ],
  });

export function integrationPage(page: SitePage): Html {
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}
    ${
    Alert({
      variant: "info",
      title: "Static pages are inert",
      body:
        "This site is plain files, so swaps point at nothing and fall back to what the markup shows. `deno task app` serves the same catalogue from a real rAPId app, where every swap, push and upload is live.",
    })
  }
    ${
    section(
      "attributes",
      "Interactivity is data-* attributes",
      contractTable("rapid-attrs", ATTRS, "Attribute"),
      "rAPId's runtime imposes no classes, roles or structure — only these attributes. Components declare them instead of writing fetch code.",
    )
  }
    ${
    section(
      "events",
      "Events, not polling",
      html`${contractTable("rapid-events", EVENTS, "Event")}${
        CodeBlock({
          title: "The whole public JS surface",
          language: "js",
          code: `window.rapid.swap(url, target, opts);
window.rapid.refresh(target);
window.rapid.history.push(url, target, opts); // with ui.history
window.rapid.live.connect(channel);           // with ui.live`,
        })
      }`,
    )
  }
    ${
    section(
      "templates",
      "Core, layout and error templates",
      Grid({
        items: [
          GridCol({
            span: { xs: 12, lg: 6 },
            content: CodeBlock({
              title: "app.ts",
              language: "ts",
              code: `import { createCoreTemplate } from "@tundralibs/ui/templates/core";
import { asRapidLayout } from "@tundralibs/ui/templates/layout";
import { errorTemplates } from "@tundralibs/ui/templates/errors";
import { SidebarLayout } from "@tundralibs/ui/layouts/sidebar";

const core = createCoreTemplate({ assets: "/ui", history: true });
const layout = asRapidLayout((body) =>
  SidebarLayout({ sidebar, sidebarId: "nav", content: body })
);

await Application.initialize({
  ui: { core, layout, errorTemplates, history: true },
  server: { static: { "/ui": { root: uiAssetsDir(), fingerprint: true } } },
});`,
            }),
          }),
          GridCol({
            span: { xs: 12, lg: 6 },
            content: CodeBlock({
              title: "A pushable region",
              language: "ts",
              code: `// The region's URL is the page route itself: a swap
// renders only the region, a reload renders the page.
app.get("/projects", (ctx) => ({
  page: Number(ctx.query.page ?? 1),
  fragment: ctx.isSwap && "projects",
}));

Pagination({
  current: 2, total: 8,
  buildHref: (p) => withQuery("/projects", view.query, { page: p }),
  attrs: { "data-target": "#projects", "data-swap": "outer", "data-push": "" },
});`,
            }),
          }),
        ],
      }),
    )
  }
    ${
    section(
      "forms",
      "Form errors pass straight through",
      CodeBlock({
        language: "ts",
        code: `// formState() → RapidFormError { state: "error", message, fields, values }
Form({ action: "/signup", error, content: html\`
  \${FormField({ label: "Email", error: error?.fields?.email,
    control: Input({ name: "email", type: "email", value: error?.values?.email }) })}
\` });`,
      }),
      "File inputs are never echoed back into re-rendered markup — rAPId's keptValues() strips them, and so does every component.",
    )
  }`;
}

const ERRORS: { id: string; label: string; data: Record<string, unknown> }[] = [
  {
    id: "error-404",
    label: "404 · production",
    data: {
      status: 404,
      message: "That page doesn't exist, or has moved.",
      requestId: "req_9f2c1a",
      mode: "production",
    },
  },
  {
    id: "error-403",
    label: "403 · with a code",
    data: { status: 403, code: "FORBIDDEN", message: "You need the billing role for this.", requestId: "req_51ab07" },
  },
  {
    id: "error-500",
    label: "500 · development",
    data: {
      status: 500,
      code: "INTERNAL",
      message: "Cannot read properties of undefined (reading 'total').",
      requestId: "req_c0ffee",
      mode: "development",
      details: { route: "GET /invoices/:id", handler: "invoices.show" },
      debug: { stack: ["at show (routes/invoices.ts:42:17)", "at dispatch (rapid/router.ts:118:9)"] },
    },
  },
];

const errorView = {
  requestId: "req_9f2c1a",
  runtimePath: "/__rapid/ui.js",
  path: "/",
  asset: (p: string) => p,
  query: {},
};

/** The full-page error documents shown in the iframes (demo/frames/error-*.html). */
export function errorFrames(): { id: string; body: Html }[] {
  return ERRORS.map((e) => ({ id: e.id, body: ErrorTemplate.render(e.data, errorView) as Html }));
}

export function errorsPage(page: SitePage): Html {
  const part = ErrorTemplate.render({
    status: 503,
    message: "The usage service did not answer.",
    part: "usage",
    requestId: "req_7e11",
  }, errorView) as Html;
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}
    ${
    CodeBlock({
      code:
        `import { errorTemplates } from "@tundralibs/ui/templates/errors";\n// Application.initialize({ ui: { errorTemplates } })`,
      language: "ts",
      attrs: { class: "site-import" },
    })
  }
    ${
    ERRORS.map((e) =>
      section(
        e.id,
        e.label,
        html`
          ${framePreview(`frame-${e.id}`, `../frames/${e.id}.html`, `${e.label} error page`, "tablet")}<details
            class="site-details"><summary>The ErrorData it was given</summary>${CodeBlock({
              code: JSON.stringify(e.data, null, 2),
              language: "json",
            })}</details>
        `,
      )
    )
  }
    ${
    section(
      "part",
      "Inside a composed part",
      html`<div class="site-part" data-part="usage">${part}</div>${
        CodeBlock({ title: "Rendered markup", code: prettyHtml(render(part)), language: "html", maxHeight: "sm" })
      }`,
      "When the payload names a part, the template renders a compact inline notice — the page around it is still there.",
    )
  }`;
}
