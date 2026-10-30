# @tundralibs/ui

HTML + CSS + JS component and layout library, and the first-class UI layer for
[rAPId](https://jsr.io/@tundralibs/rapid). Plain `<link>`/`<script>` consumers get a themeable, CSP-clean bundle; a
rAPId app gets typed, escaped-by-default templates for every component and layout, plus a document shell and error pages
that plug straight into `Application.initialize`.

- **Components** (81): buttons, toggles, inputs (with masks), forms, a markdown/WYSIWYG editor, data table (cards on a
  phone), combobox, transfer list, colour picker, rating, command palette, date picker, calendar, OTP, modal, sheet,
  toasts, banner, tour, tabs, menus, menubar, context menu, tree, list group, scroll spy, split pane, scroll area, code
  block and diff viewer, charts (every ApexCharts type, pinned, on the library's tokens), and a marketing set — hero,
  feature grid, pricing, testimonials, carousel, lightbox, scroll reveal, count-up, pinned scroll steps — all moving on
  one set of motion tokens, plus a 12-column grid with spans per breakpoint and a small utilities layer.
- **Layouts** (8): stacked, sidebar, rail, split, article, docs, auth, focus — each defined at every viewport band from
  phones to ultrawide.
- **Themes**: tokens only. A theme is one stylesheet loaded after the bundle; dark mode is built in.

## Plain HTML

<!-- x-release-please-start-version -->

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.29.1/dist/ui.css">
<script src="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.29.1/dist/ui.js" defer></script>
```

<!-- x-release-please-end -->

`dist/` is also in the npm package for self-hosting.

## rAPId

```ts
import { Application } from "@tundralibs/rapid";
import { createCoreTemplate } from "@tundralibs/ui/templates/core";
import { createLayoutTemplate } from "@tundralibs/ui/templates/layout";
import { errorTemplates } from "@tundralibs/ui/templates/errors";
import { Card } from "@tundralibs/ui/card";

const app = await Application.initialize({
  name: "my-app",
  ui: {
    core: createCoreTemplate(), // assets from the versioned CDN, with SRI
    layout: createLayoutTemplate({ brand: "Acme", navLinks: [{ href: "/", label: "Home" }] }),
    errorTemplates,
    prefer: "html",
  },
});
app.get("/", { template: Home }, () => ({ content: {} }));
```

`createCoreTemplate({ assets: "/ui" })` self-hosts instead — copy the bundle with `copyUiAssets()` from
`@tundralibs/ui/assets` and mount it with `server.static: { "/ui": { root, fingerprint: true } }`.

Every server-driven component (combobox, command palette, date picker, sortable tables, pagination, lazy regions,
validated forms, toasts) speaks rAPId's `data-*` swap contract and needs no client glue. The example app under
`examples/app/` wires all of them; run it with `deno task app`.

## Documentation

Also browsable on the [wiki](https://github.com/TundraSoft/ui/wiki), synced from `docs/` on every push.

- [Getting started](docs/UI-Getting-Started.md) — install (CDN, self-host, JSR), a first page, how the bundle is built.
- [Recipes](docs/UI-Recipes.md) — real pages as rAPId routes and as plain HTML: app shell, sign-in, dashboard, invoices
  with bulk actions, uploads with progress, search, notifications, an international contact form with flags.
- [Components](docs/UI-Components.md) — a tour of every component with usage.
- [Layouts](docs/UI-Layouts.md) — the eight page frames and how they respond.
- [rAPId integration](docs/UI-Rapid.md) — the shell, swaps, forms, history, the example app.
- [Theming](docs/UI-Theming.md) — tokens, dark mode, cascade layers, custom partials.
- [Charts](docs/UI-Charts.md).
- [Reference](docs/Reference.md) — every export, generated from the sources.

## Development

```sh
deno task build        # dist/ui.css, dist/ui.js, version.ts
deno task build:demos  # static demo pages under demo/ — open demo/index.html
deno task test         # every browser suite (needs Chrome; CHROME_PATH)
deno task app          # the rAPId example app on :8010
```

`demo/` is a site built from the library itself. Its collapsible sidebar is the only navigation: groups → sections →
pages, collapsing to an icon rail with flyouts. It holds the foundations (tokens, typography, icons, grid and utilities,
motion, themes and dark mode, the theme builder), one page per component (every declared variant, size, tone and state,
plus usage code and its CSS/JS hooks; CI fails if a component or variant is missing), the eight layouts previewed at
phone, tablet and desktop widths, the rAPId integration and error pages, and the admin example app.

The same tooling runs on Node (`npm run …` via tsx) and Bun (`bun run bun:…`). See `CLAUDE.md` for the full contract and
conventions.

## License

MIT
