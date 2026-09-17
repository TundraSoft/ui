# Layouts

A layout is a **frame**: the page chrome and its slots, never content. Eight ship, each defined at every viewport band
from phones to ultrawide screens. They live in their own cascade layer below components, so a component always wins
inside a slot.

---

## TL;DR

- Import from `@tundralibs/ui/layouts` (all) or `@tundralibs/ui/layouts/<name>`.
- Every layout is a function of typed `Html` slots and returns `Html`. The content slot always carries a stable id
  (`contentId`, default `main-content`) so the skip link and history push work.
- `asRapidLayout(body => Layout({ …, content: body }))` makes any of them a rAPId `ui.layout`.
- Sizes are tokens (`--layout-max-width`, `--layout-measure`, `--layout-sidebar-width`, `--layout-rail-width`,
  `--layout-aside-width`, `--layout-pane-width`, `--layout-gutter`, `--scroll-padding-top`) — retune the frame from a
  theme, never by editing layout CSS.
- No layout needs page-level CSS; what a page needs is a component or a theme partial.

---

## The eight frames

| Layout          | Frame                                   | < 768 (phone)                                  | 768–991 (tablet)                  | 992–1399 (laptop)                          | ≥ 1400 (wide)                                                            |
| --------------- | --------------------------------------- | ---------------------------------------------- | --------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `StackedLayout` | header → content → footer               | navbar collapses to a toggle                   | horizontal nav                    | —                                          | `width: "boxed"` caps at `--layout-max-width`; fluid grows the gutter    |
| `SidebarLayout` | header + sidebar + content (+ aside)    | off-canvas drawer with backdrop; Escape closes | drawer                            | full sidebar, collapsible to icons, sticky | content capped when boxed                                                |
| `RailLayout`    | icon rail + content                     | bottom tab bar                                 | rail                              | rail                                       | rail                                                                     |
| `SplitLayout`   | master pane + detail                    | one pane at a time (`mobileView`)              | both, narrow list                 | both                                       | detail capped                                                            |
| `ArticleLayout` | reading column (+ aside)                | aside below                                    | aside below                       | aside beside                               | measure capped at `--layout-measure` (70ch); `measure: "wide"` for grids |
| `DocsLayout`    | nav · content · table of contents       | nav drawer, TOC disclosure                     | same                              | nav + content, TOC disclosure              | three columns from 1200                                                  |
| `AuthLayout`    | centred card (+ narrative with `split`) | card full width                                | centred                           | split panel                                | halves capped                                                            |
| `FocusLayout`   | one column, no chrome                   | full width                                     | centred at `--layout-focus-width` | —                                          | —                                                                        |

---

## Usage

```ts
import { SidebarLayout } from "@tundralibs/ui/layouts/sidebar";
import { Navbar } from "@tundralibs/ui/navbar";
import { Sidebar } from "@tundralibs/ui/sidebar";

const page = SidebarLayout({
  header: Navbar({ id: "top", brand: "Acme", actions: darkToggle }),
  sidebar: Sidebar({ id: "nav", items, collapsible: true }),
  sidebarId: "nav", // the layout renders the drawer toggle for it
  content: body,
  aside: activityCard, // optional third column
  footer,
  width: "boxed",
  stickyHeader: true,
});
```

Props per layout (see the [reference](./Reference.md#layouts) for types):

- **StackedLayout** — `header?`, `content`, `footer?`, `width?: "fluid" | "boxed"`, `stickyHeader?`, `contentId?`,
  `attrs?`.
- **SidebarLayout** — `header?`, `sidebar`, `sidebarId`, `content`, `aside?`, `footer?`, `side?`, `width?`,
  `stickyHeader?`, `drawerToggle?`, `contentId?`, `attrs?`. Renders a `SidebarToggle` (class-only, so the sidebar never
  gets `hidden` and survives a resize) and a backdrop.
- **RailLayout** — `brand?`, `items: RailItem[]` (`href`, `label`, `icon`, `active`), `end?`, `header?`, `content`,
  `width?`, `contentId?`.
- **SplitLayout** — `header?`, `pane`, `paneId?`, `content`, `contentId?`, `mobileView?: "pane" | "detail"` (a route
  decision on phones), `stickyHeader?`.
- **ArticleLayout** — `header?`, `content`, `aside?`, `asideSide?`, `footer?`, `measure?: "reading" | "wide"`,
  `stickyHeader?`, `contentId?`.
- **DocsLayout** — `header?`, `nav`, `navId`, `content`, `toc?`, `footer?`, `stickyHeader?`, `contentId?`. The TOC is a
  disclosure below 1200.
- **AuthLayout** — `brand?`, `content`, `narrative?`, `split?`, `contentId?`.
- **FocusLayout** — `header?`, `content`, `footer?`, `width?: "narrow" | "wide"`, `contentId?`.

### In rAPId

```ts
import { asRapidLayout } from "@tundralibs/ui/templates/layout";

const shell = asRapidLayout((body) => StackedLayout({ header: nav, width: "boxed", content: body, footer }));
app.get("/", { template: Home, layout: shell }, handler);
```

The frame is fixed at initialise time (it is not per-request data) — it is a closure, and only `body` flows through.
`createLayoutTemplate({ brand, navLinks, navActions, sidebarItems })` is the config shortcut for a navbar (+ sidebar)
frame.

### Static pages

The class vocabulary is the template's output: `.layout.layout--stacked`, `.layout__header`, `.layout__content`,
`.layout__sidebar`, `.layout__aside`, `.layout__rail`, `.layout__pane`, `.layout__toc`, `.layout__footer`,
`.layout--boxed`, `.layout__backdrop`. Render any layout once with the template and copy the markup, or read the
[reference page](./Reference.md#layouts) for the full class list per layout.

---

## Sticky headers and anchors

`--scroll-padding-top` (default 4.5rem) is both the `scroll-padding-top` on `html` — so a `#tab-…` deep link lands below
a sticky header — and the offset every sticky sidebar, aside and TOC sits under. Retune it together with the navbar
height in a theme.

---

## Verification

`deno task test:layouts` loads every layout at 375, 667×375, 768, 1024, 1440 and 1920 and asserts: no horizontal
overflow, `#main-content` present and within the viewport, reading/boxed frames not full-bleed on wide screens,
navigation reachable (a visible nav, or a drawer toggle that actually opens the sidebar and closes on Escape), the rail
a full-width bottom bar on phones, exactly one split pane on phones, asides stacking vs. sitting beside at their
thresholds.
