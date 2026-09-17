# Theming

This library builds **the base**: token-driven structural CSS, a behaviour script and a template per component. A theme
is a downstream consumer — one stylesheet loaded after the bundle that overrides tokens (and, if it wants, adds its own
partials). No base file is ever edited.

---

## TL;DR

- Override tokens on `:root` in a second stylesheet. Include **both dark blocks** or dark mode silently stops working
  for your palette.
- Your CSS is unlayered, so it wins over everything in the bundle without `!important` or specificity games.
- A component's structural CSS never contains a literal colour, size, shadow or font — only `var(--token)` — which is
  why swapping the theme file is enough.
- Custom partials (your own markup + CSS + JS) sit alongside base components; key your JS off `data-*` attributes and
  they cannot collide.
- `examples/themes/` has five worked themes (admin, console, ledger, portal, sunset); the catalogue's theme switcher
  loads them live.

---

## A theme file

```css
/* acme.css — loaded after ui.css */
:root {
  --color-accent: #2563eb;
  --color-accent-strong: #1d4ed8;
  --color-accent-contrast: #ffffff;
  --color-accent-inverse: #93c5fd;
  --font-family-display: "Space Grotesk", var(--font-family-base);
  --radius-md: 6px;
}

/* Dark mode: both blocks, identical values — the system preference and an
   explicit choice must each win in their own direction. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-accent: #60a5fa;
    --color-accent-contrast: #0b1220;
  }
}
:root[data-theme="dark"] {
  --color-accent: #60a5fa;
  --color-accent-contrast: #0b1220;
}
```

Every shipped theme sets the full colour set — palette, status colours, contrasts, borders, surfaces — for both modes.
Copying only the light `:root` is the classic mistake: the toggle then flips the attribute and nothing changes.

---

## Tokens

All in `tokens/default.css`, on `:root`, dark variants in the two blocks described above.

**Colour**

- Ink and accent: `--color-primary`, `--color-primary-strong`, `--color-primary-contrast` (primary is _ink_ —
  near-black, near-white in dark); `--color-accent`, `--color-accent-strong`, `--color-accent-contrast`,
  `--color-accent-inverse` (the hue); `--color-secondary`, `--color-secondary-strong`, `--color-secondary-contrast`.
- Surfaces: `--color-canvas` (page ground), `--color-surface` (card ground), `--color-surface-alt`,
  `--color-surface-sunken`, `--color-surface-inverse`, `--color-overlay`.
- Text: `--color-text`, `--color-text-muted`, `--color-text-subtle` (the lightest legal text, ≥ 4.5:1),
  `--color-text-inverse`, `--color-disabled`, `--color-disabled-text`.
- Borders: `--color-border`, `--color-border-subtle`, `--color-border-strong`, `--color-border-control` (form-control
  outline, ≥ 3:1).
- Status, each with `-contrast`, `-soft` and `-soft-text`: `--color-success`, `--color-warning`, `--color-danger`,
  `--color-info`.
- Media: `--color-media-scrim`, `--color-on-media` (text over images; fixed in both modes).
- `--shadow-color` — an RGB triplet feeding the shadows.

**Type**: `--font-family-base`, `--font-family-display` (headings), `--font-family-mono`; sizes `--font-size-2xs … 4xl`
and `-base`; weights `--font-weight-normal|medium|semibold|bold`; `--line-height-tight|base|relaxed`;
`--letter-spacing-tighter|tight|caps`. The base stack names Instrument Sans / JetBrains Mono with system fallbacks and
does not bundle the fonts — add a font link if you want them.

**Space and shape**: `--space-0 … 16`; `--radius-sm|md|lg|full`; `--border-width`, `--border-width-thick`;
`--shadow-sm|md|lg|xl`, `--shadow-inset-top`; `--control-height-sm|md|lg` (30/36/44 — inputs and buttons align because
heights are fixed, not padding-derived); `--container-max-width`.

**Focus**: `--ring-color`, `--ring-width`, `--ring-offset` (`--focus-ring-*` are aliases).

**Motion and stacking**: `--transition-fast|base|slow`; `--z-dropdown|sticky|popover|overlay|modal|toast`.

**Layout**: `--layout-max-width`, `--layout-measure`, `--layout-focus-width`, `--layout-sidebar-width`,
`--layout-rail-width`, `--layout-aside-width`, `--layout-pane-width`, `--layout-gutter`, `--scroll-padding-top`.

**Charts**: `--apx-accent`, `--apx-fore`, `--apx-grid`, `--apx-surface`, `--apx-series-1 … 6` — see
[Charts](./UI-Charts.md).

Some components expose their own knobs, documented on their reference page (for example `--data-table-max-height` on the
scroll classes).

---

## Why it works: cascade layers

`ui.css` declares `@layer tokens, reset, base, layouts, components;` and keeps every rule inside those layers. CSS
written outside any layer beats every layered rule regardless of selector specificity. So a theme's plain `:root { … }`
overrides tokens, and a theme's `.card { … }` — should it ever want to go beyond tokens — overrides the base's `.card`
too, with no `!important`.

If your theme itself wants layers, declare them after the bundle's; an unlayered rule still wins over both.

---

## Custom partials

Anything the base does not cover you build yourself, three rules apart:

1. Markup and CSS are yours; the class vocabulary is yours (prefix it — `.acme-masthead`). Keep it unlayered and it
   overrides nothing by accident and everything on purpose.
2. Reuse the shared behaviours instead of re-solving them: `[data-toggle="#id"]` / `[data-toggle-class]` for show/hide,
   `[data-dismiss]` for close buttons, `[data-theme-toggle]`, the filter scope (`[data-filter-scope]`,
   `[data-table-search]`, `[data-table-filter]`, `[data-filter-item]`), `[data-view-target]`.
3. For rAPId, write templates the same way the base does — `html` / `template()` from `@tundralibs/rapid/ui`, `raw()`
   never on caller data — and compose base components inside them. Every base component is a plain exported function you
   can wrap.

The admin sample (`examples/themes/admin.css` + `examples/pages/build-admin-theme.ts`) is the worked example: a dark
sidebar in light mode, stat chips, invoice totals — all partials, no base edits.

---

## Dark mode

`shared/js/theme-toggle.js` flips `document.documentElement.dataset.theme` on any `[data-theme-toggle]` click and
persists it in `localStorage`. It runs after first paint, so a stored dark preference can flash light for one frame; the
CSP-clean fix is to set `data-theme` server-side from a cookie — a rAPId app's job, not the library's.

A dark-first theme (Console) can make `:root` _and_ `[data-theme="dark"]` the dark palette and only
`[data-theme="light"]` different; the first toggle from unset to dark is then a legitimate no-op.

---

## Charts, images, media

Charts follow tokens automatically. Images sit on `--color-surface-alt` until they paint. Text over media uses
`--color-media-scrim` / `--color-on-media`, which do not flip in dark mode — a scrim over a photo should stay a scrim.

---

## Checking a theme

Run the catalogue with your stylesheet in the switcher (add it to `themes` in `examples/pages/build-catalogue.ts`) and
`deno task test:catalogue` — it asserts each theme's computed body background changes, light and dark.
`deno task test:all` sweeps every page under `demo/` in both modes for console errors and the same computed-style check.
