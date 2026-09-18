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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.1.2/dist/ui.css">
<script src="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.1.2/dist/ui.js" defer></script>
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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.1.2/dist/ui.css">
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
    <script src="https://cdn.jsdelivr.net/npm/@tundralibs/ui@0.1.2/dist/ui.js" defer></script>
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
@layer tokens, reset, base, layouts, components;
```

- **tokens** — every colour, size, radius, shadow, font and motion value as a custom property on `:root`, with the dark
  variants.
- **reset** — a modern reset (box-sizing, margins, `dialog` centring, list padding for class-carrying lists).
- **base** — typography and the handful of utilities (`.stack`, `.container`, `.sr-only`, `.skip-link`, `.js-only`,
  `.mt-*`, `.hide-sm`, text helpers).
- **layouts** — the eight page frames.
- **components** — every component's structural CSS, token-driven only.

Anything you write _outside_ a layer wins over all of it regardless of specificity, which is how
[themes](./UI-Theming.md) work with no `!important`.

`ui.js` is the concatenation of one small IIFE per component that needs behaviour, plus the shared ones (`enhance` adds
`html.js` for progressive enhancement, `toggle`, `dismiss`, `theme-toggle`, `collapse-sidebar`, `filter`, `view-switch`,
`busy`). Everything is delegated on `document` and keyed off `data-*` attributes or ARIA roles, so markup added later —
by a rAPId swap or your own code — works without re-wiring. Scripts re-run their init on `rapid:swapped`.

---

## Dark mode

`data-theme="dark"` on `<html>` forces dark, `data-theme="light"` forces light, nothing set follows the OS. Any element
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

`demo/{forms,data,charts,cards,navigation,actions,feedback}.html` is the catalogue — every component in every declared
variant, size, tone and state (the test suite fails if a component or variant is missing from it) — with a theme
switcher and the dark toggle. `demo/layouts/` shows the eight frames, `demo/admin/` a complete admin sample on a theme.
`deno task app` serves the same components from a real rAPId application with the server-driven pieces wired to routes.

The same tooling runs on Node (`npm run …`) and Bun (`bun run bun:…`).

---

## Next

- [Recipes](./UI-Recipes.md) — real pages, each as a rAPId route and as plain HTML: shell, sign-in, dashboard, invoices,
  uploads, search, notifications.
- [Components](./UI-Components.md) — a tour by group, with usage.
- [Layouts](./UI-Layouts.md) — the page frames and how they respond.
- [rAPId integration](./UI-Rapid.md) — the shell, swaps, forms, history.
- [Theming](./UI-Theming.md) — tokens, dark mode, custom partials.
- [Charts](./UI-Charts.md).
- [Reference](./Reference.md) — every export.
