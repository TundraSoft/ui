# Getting started

`@tundralibs/ui` is an HTML + CSS + JS component and layout library that is also the first-class UI layer for
[rAPId](https://jsr.io/@tundralibs/rapid). Plain pages get a themeable, CSP-clean bundle with one `<link>` and one
`<script>`; a rAPId app gets typed, escaped-by-default templates for every component and layout, a document shell, and
error pages that plug straight into `Application.initialize`.

---

## TL;DR

- **Plain HTML**: load `ui.css` and `ui.js` from the versioned CDN (or self-host the same two files). Write the markup
  the components document; the behaviour script finds it by `data-*` attributes and ARIA roles.
- **rAPId**: `import { Card } from "@tundralibs/ui/card"` and render it inside your route templates. Hand
  `createCoreTemplate()` and `errorTemplates` to `Application.initialize({ ui })` and every page has the assets, a skip
  link and a toast region. See [rAPId integration](./UI-Rapid.md).
- **Themes are one stylesheet** loaded after the bundle that overrides tokens. Dark mode is built in. See
  [Theming](./UI-Theming.md).
- **No inline styles or scripts, ever** — a strict CSP (`style-src 'self';
  script-src 'self'`) works out of the box.
- **Browsers from 2022 onward**; native nesting and `color-mix()` are downlevelled or fall back.

---

## Install

### Plain HTML (CDN)

<!-- x-release-please-start-version -->

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.27.0/dist/ui.css">
<script src="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.27.0/dist/ui.js" defer></script>
```

<!-- x-release-please-end -->

Pin the version. The package's `version.ts` carries the sha384 integrity hash of each file for the version it was built
with, if you want to add `integrity="…" crossorigin="anonymous"` (a rAPId app gets that for free).

### Self-hosted

```sh
npm install @tundralibs/ui      # dist/ui.css, dist/ui.js
```

Serve `node_modules/@tundralibs/ui/dist/` under any path and link the two files. Nothing else in the package is needed
at runtime.

### rAPId (JSR)

```sh
deno add jsr:@tundralibs/ui         # Deno
npx jsr add @tundralibs/ui          # Node / Bun
```

Every component is its own export (`@tundralibs/ui/card`, `@tundralibs/ui/data-table`, …), layouts are under
`@tundralibs/ui/layouts`, the shell and error pages under `@tundralibs/ui/templates/*`. See the
[Reference](./Reference.md) for the full list.

---

## A first page

<!-- x-release-please-start-version -->

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.27.0/dist/ui.css">
  </head>
  <body>
    <div class="layout layout--stacked layout--boxed">
      <header class="layout__header">
        <nav class="navbar">
          <a class="navbar__brand" href="/">Acme</a>
          <div class="navbar__nav">
            <a class="navbar__link navbar__link--active" href="/">Home</a>
            <a class="navbar__link" href="/docs">Docs</a>
          </div>
          <div class="navbar__spacer"></div>
          <div class="navbar__actions">
            <button type="button" class="btn btn--outline btn--sm" data-theme-toggle>Dark</button>
          </div>
        </nav>
      </header>
      <main class="layout__content" id="main-content">
        <div class="card card--elevated">
          <div class="card__header">
            <h3 class="card__title">Hello</h3>
          </div>
          <div class="card__body">
            <p>The base, unthemed.</p>
          </div>
        </div>
      </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.27.0/dist/ui.js" defer></script>
  </body>
</html>
```

<!-- x-release-please-end -->

The markup for every component is exactly what its template renders; the [catalogue](#see-everything) shows all of it,
and [Recipes](./UI-Recipes.md) walks through complete pages in both flavours.

---

## How the bundle is put together

`ui.css` declares its cascade layers up front and keeps everything inside them:

```css
@layer tokens, reset, base, layouts, components, utilities;
```

- **tokens** — every colour, size, radius, shadow, font and motion value as a custom property on `:root`, with the dark
  variants.
- **reset** — a modern reset (box-sizing, margins, `dialog` centring, list padding for class-carrying lists).
- **base** — typography, the shared motion keyframes and the page plumbing (`.container`, `.sr-only`, `.skip-link`,
  `.js-only`, text helpers).
- **layouts** — the eight page frames.
- **components** — every component's structural CSS, token-driven only.
- **utilities** — the small utility set below; last, so a utility always beats a component's own rule.

Plus one small unlayered block: the page-level `html` / `body` rules (font, line height, text colour, canvas,
`color-scheme`), so a host page's own unlayered defaults cannot override them (see [Theming](./UI-Theming.md)).

Anything you write _outside_ a layer wins over all of it regardless of specificity, which is how
[themes](./UI-Theming.md) work with no `!important`.

`ui.js` is the concatenation of one small IIFE per component that needs behaviour, plus the shared ones (`enhance` adds
`html.js` for progressive enhancement, `toggle`, `dismiss`, `theme-toggle`, `collapse-sidebar`, `filter`, `view-switch`,
`busy`, `motion`, `float`). Everything is delegated on `document` and keyed off `data-*` attributes or ARIA roles, so
markup added later — by a rAPId swap or your own code — works without re-wiring. Scripts re-run their init on
`rapid:swapped`.

### The grid and the utilities

The grid is 12 columns. A cell's span is a number (`col-N`, applied from 768px; every cell is full width below that, or
two-up with `phoneColumns: "2"`) or a span per breakpoint, mobile first — `xs` at every width, `sm` from 576px, `md`
from 768px, `lg` from 992px, `xl` from 1400px:

```ts
Grid({
  gap: "sm", // "sm" | "md" | "lg"
  items: tiles.map((tile) => GridCol({ span: { xs: 6, md: 4, xl: 3 }, content: tile })),
});
// → <div class="grid grid--gap-sm"><div class="col-xs-6 col-md-4 col-xl-3">…
```

`styles/utilities.css` is a token-driven set of about 200 single-purpose classes with Bootstrap-shaped names, so a page
composed from components rarely needs CSS of its own: display (`d-none`, `d-flex`, `d-grid`, with `d-md-*` breakpoint
variants), flex (`flex-column`, `flex-wrap`, `flex-1`, `align-items-center`, `justify-content-between`, `flex-md-row`),
`gap-0…8`, spacing (`m`/`p` × `t`/`b`/`s`/`e`/`x`/`y` × `0…8`, logical so RTL follows, plus `mx-auto`/`ms-auto`/
`me-auto`), text (`text-center`, `text-truncate`, `text-nowrap`, `text-break`, `text-balance`), sizing (`w-100`,
`mw-100`, `min-w-0`, `h-100`, `measure`), position (`sticky-top`, `position-relative`), borders and radii (`border`,
`rounded`, `rounded-lg`, `shadow`), surfaces (`bg-surface`, `bg-sunken`), status text colours, the `.stack` / `.cluster`
rhythm helpers and responsive visibility (`hide-sm` / `hide-md` / `hide-lg` hide _below_ a width; `hide-md-up` /
`hide-lg-up` hide _from_ one). Every value is a token (`--space-*`, `--radius-*`, `--shadow-*`, `--color-*`), so a theme
retunes the utilities with the components.

---

## Custom builds

The published bundle carries every component. A site that uses a dozen can build its own `ui.css` / `ui.js` from the
sources. The JSR package ships them (`styles/`, `tokens/`, `components/`, `layouts/`, `shared/`; the npm package carries
only `dist/`, so install from JSR — `npx jsr add @tundralibs/ui` puts the files under `node_modules/@tundralibs/ui` — or
vendor the directories from the repository). Each component is one `components/<name>/<name>.css` plus, where it has
behaviour, one `components/<name>/<name>.js` IIFE with no imports between files.

**CSS.** Write an entry that imports the layers in the order `styles/index.css` uses and only the components you need,
then run it through PostCSS with `postcss-import`, `postcss-mixins` and `postcss-nesting` (the same three plugins
`scripts/build-css.ts` uses; the sources rely on native nesting, which the build downlevels for 2022 browsers):

```css
/* my-ui.css — a custom build of @tundralibs/ui */
@layer tokens, reset, base, layouts, components, utilities;

@import "@tundralibs/ui/tokens/default.css" layer(tokens);
@import "@tundralibs/ui/styles/reset.css" layer(reset);
@import "@tundralibs/ui/styles/base.css" layer(base);
@import "@tundralibs/ui/styles/typography.css" layer(base);
@import "@tundralibs/ui/styles/motion.css" layer(base);
@import "@tundralibs/ui/styles/page.css";

@import "@tundralibs/ui/layouts/layout.css" layer(layouts);
@import "@tundralibs/ui/layouts/stacked/stacked.css" layer(layouts);

@import "@tundralibs/ui/components/button/button.css" layer(components);
@import "@tundralibs/ui/components/card/card.css" layer(components);
@import "@tundralibs/ui/components/input/input.css" layer(components);
@import "@tundralibs/ui/components/form-field/form-field.css" layer(components);
@import "@tundralibs/ui/components/modal/modal.css" layer(components);

@import "@tundralibs/ui/styles/utilities.css" layer(utilities);
```

Keep `tokens`, `reset`, `base` (all three files), `page.css` and `layouts/layout.css`; everything else is optional. Some
components style their neighbours' hooks — `skeleton.css` paints the `[data-busy]` veil every swap wears, `form-field`
holds the error slot `input`, `select` and the pickers report into, `combobox` is what `select` and `datepicker` render
their lists with — so take a component's dependencies with it (its stylesheet's class names say which). The
`color-mix()` fallback lines and the `@layer` statement survive minification with esbuild; other minifiers may not keep
either, so check the output for both.

**JS.** Concatenate `shared/js/enhance.js`, `shared/js/motion.js` and `shared/js/float.js` first (every script that
shows or hides a panel calls `uiMotion` / `uiFloat`), then the shared behaviours you use (`toggle`, `dismiss`, `busy`,
`theme-toggle`, …) and each chosen component's `.js`. Each file is an IIFE that reads nothing from another at load time,
so order among components does not matter — the same rule `scripts/build-js.ts` relies on. Serve it `defer`.

**rAPId apps** need no custom build to drop unused _templates_: those are tree-shaken by the import graph. A custom
build only trims the shipped CSS and JS, so do it when the ~35 KB gzipped of styles and ~40 KB of scripts the full
bundle costs matters for the page.

---

## Dark mode

`data-theme="dark"` on `<html>` forces dark, `data-theme="light"` forces light, nothing set follows the OS — or the
site's `data-theme-default` when it carries one (a dark-first site renders `data-theme-default="dark"`). Any element
with `data-theme-toggle` flips it and persists the choice in `localStorage`. Every token file ships both a
`prefers-color-scheme: dark` block and a `[data-theme="dark"]` block so an explicit choice always wins.

---

## CSP

No component emits `style=`, `onclick=`, `<style>` or inline `<script>`. Values that must vary per element (a slider's
fill, a segmented control's thumb, a fixed-position dropdown) are written by the scripts as CSS custom properties or
CSSOM style sets, never as inline attributes in markup. The example app runs every page through an
inline-style/inline-script grep in its test.

The one thing to allow if you use it: the chart engine (ApexCharts) is loaded from jsDelivr, so `script-src` needs
`https://cdn.jsdelivr.net` (with the integrity hash the library carries). See [Charts](./UI-Charts.md).

---

## Icons

The library ships a small line-icon set (33 names, 24×24, `currentColor`, primitive shapes only). Three ways to use it:

```ts
import { Icon, iconNames, IconSprite } from "@tundralibs/ui/shared/icons";
Icon("search", { size: 16 }); // inline SVG, in any template — typed `IconName`
IconSprite(); // one hidden <svg> of <symbol id="icon-…">s, inline once per page
```

```html
<!-- plain HTML, after inlining IconSprite() or when self-hosting dist/icons.svg -->
<svg width="16" height="16" aria-hidden="true">
  <use href="#icon-search"></use>
</svg>
<svg width="16" height="16" aria-hidden="true">
  <use href="/ui/icons.svg#icon-search"></use>
</svg>
```

`dist/icons.svg` is part of the bundle (`copyUiAssets()` copies it; the version manifest carries its URL and hash).
Browsers refuse a cross-origin `<use>`, so from the CDN inline the sprite rather than referencing the file.

Every icon prop (`iconStart`, `icon`, `lead`, `brand`, …) accepts any `Html`, so a bigger set is a one-line helper away:

```ts
import { raw } from "@tundralibs/rapid/ui";
import { icons } from "lucide-static"; // or any set that gives you SVG strings
const lucide = (name: keyof typeof icons) => raw(icons[name]); // constant markup, never user data
Button({ label: "Print", iconStart: lucide("Printer") });
```

The built-in set is the library's own vocabulary, not a general icon library — that is a separate product, and the
recipe above is the intended way to bring one.

---

## See everything

```sh
deno task build && deno task build:demos
open demo/index.html
```

`demo/` is a site built from the library, navigated by its collapsible sidebar alone. `demo/components/<name>.html` is
one page per component — every declared variant, size, tone and state (the test suite fails if a component or variant is
missing), the usage code, and the CSS and JS hooks. `demo/foundations/` covers tokens, typography, icons, the grid and
utilities, motion, themes and dark mode, and the theme builder. `demo/layouts/` previews the eight frames at three
widths, `demo/rapid/` the integration and the error pages, and `demo/admin/` is a complete admin example on a theme. The
header switches the theme, the density and light/dark for the whole site. `deno task app` serves the same components
from a real rAPId application with the server-driven pieces wired to routes.

The same tooling runs on Node (`npm run …`) and Bun (`bun run bun:…`).

---

## Next

- [Recipes](./UI-Recipes.md) — real pages, each as a rAPId route and as plain HTML: shell, sign-in, dashboard, invoices,
  uploads, search, notifications, an international contact form.
- [Components](./UI-Components.md) — a tour by group, with usage.
- [Layouts](./UI-Layouts.md) — the page frames and how they respond.
- [rAPId integration](./UI-Rapid.md) — the shell, swaps, forms, history.
- [Theming](./UI-Theming.md) — tokens, dark mode, custom partials.
- [Charts](./UI-Charts.md).
- [Reference](./Reference.md) — every export.
