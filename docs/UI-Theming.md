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

**Motion and stacking**: `--duration-fast|base|slow|enter|exit` and `--ease-out|in|in-out|spring` (the
`--transition-fast|base|slow` shorthands are built from them); `--z-dropdown|sticky|popover|overlay|modal|toast`. See
[Motion](#motion) below.

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

The one exception is the handful of page-level declarations everything inherits from —
`html { font-family;
line-height }`, `body { margin; min-height; font-size; color; background }` and `color-scheme`
(`styles/page.css`). They are **unlayered**, because a host that injects its own unlayered page defaults (an embedding
frame, a preview iframe, a CMS: `body { font: 14px system-ui; color: #000; background: #fff }`) would otherwise beat a
layered reset — black text on a dark theme's cards and the system font instead of yours. They use plain `html` / `body`
selectors, so they compete on the host's terms (the later stylesheet wins) and a theme's own `body { … }`, loaded after
`ui.css`, still overrides them. Do not restate them in a theme to "fix" a host; load `ui.css` after the host's styles.

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

Who decides, in order: an explicit `data-theme` on `<html>` (the person's choice — rendered by the server or stored by
the toggle), then **`data-theme-default`** on `<html>` (the site's default for someone who has not chosen), then the
system's `prefers-color-scheme`. The tokens honour that order in CSS, so `<html data-theme-default="dark">` paints dark
with no script and no flash, and the toggle reads the same order, so its first click always flips what is on screen. The
default is never stored. `createCoreTemplate({ htmlAttrs: { "data-theme-default": "dark" } })` renders it in a rAPId
app. `color-scheme` follows too, so native controls and scrollbars match the palette.

A theme that wants dark mode adds its two dark blocks with the same selectors as `tokens/default.css`:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme-default="light"]) {
    /* dark palette */
  }
}
:root[data-theme="dark"],
:root[data-theme-default="dark"]:not([data-theme="light"]) {
  /* the same dark palette */
}
```

A theme with no dark blocks is light-only; add `:root { color-scheme: light }` to it so native controls and scrollbars
stay light when the visitor's system is dark (the library's own system-preference rule has no specificity, so that one
line wins).

A dark-first theme (Console) can make `:root` _and_ `[data-theme="dark"]` the dark palette and only
`[data-theme="light"]` different. Render `data-theme-default="dark"` with it: without it the toggle reads the system's
light preference and its first click is a no-op.

---

## Motion

Every panel in the kit enters and leaves the same way, and every move is built from five durations and four curves, so a
theme retunes the whole feel from the tokens alone — `--duration-enter: 160ms` makes everything snappier,
`--ease-spring: linear` takes the bounce out of the segmented thumb and the tab indicator.

- **Floating panels** (dropdown, popover, select and combobox lists, date and time pickers, the rail flyout) fade and
  rise from their trigger (`ui-float-in`, 220ms, `--ease-out`) and leave the same way, quicker (`ui-float-out`, 150ms,
  `--ease-in`). Modal, command palette, sheet and lightbox scale from 96% with a backdrop fade (`ui-scale-in`); toasts
  and banners rise in (`ui-rise-in`); a side sheet slides in from its edge.
- **Leaving is a convention, not a special case.** A component hides a panel with `uiMotion.exit(el, done)`
  (`shared/js/motion.js`): the element gets `.is-closing`, its stylesheet's `.is-closing` rule plays the `*-out`
  keyframes, and `done` runs after `animationend`. Give any custom partial an `.is-closing` rule and the same helper
  animates it out; leave the rule out and it is hidden at once. The generic `[data-toggle]` and `[data-dismiss]`
  behaviours already go through it.
- **Height** (collapsible, accordion) animates the panel's grid row from `0fr` to `1fr`, so nothing is measured.
- **Indicators** (segmented thumb, tabs underline) are one surface that glides to the selected option; the selected
  tab's own border is the fallback until the script has measured.
- **The theme toggle** cross-fades the palette: a View Transition where the browser has one, otherwise one beat of
  colour transitions on every element (`html.theme-changing`).
- **Pressed** buttons and clickable cards scale to 97%; table rows carry a `view-transition-name` from their key, so a
  sorted table re-orders under rAPId's swap transition instead of cross-fading.
- **Reduced motion** is one switch: `styles/reset.css` zeroes every animation and transition under
  `prefers-reduced-motion`, the scripts check the same query, and spinners alone keep turning (slowly).

The keyframes live in `styles/motion.css` (`ui-fade-in|out`, `ui-float-in|out`, `ui-float-up-in|out`, `ui-scale-in|out`,
`ui-rise-in`, `ui-sink-out`, `ui-slide-in|out-start|end|bottom`, `ui-reveal`). They animate `transform`; a panel's
static offset (centring, the shift `shared/js/float.js` writes when a panel would leave the viewport) goes on
`translate`, so the two never fight.

## Charts, images, media

Charts follow tokens automatically. Images sit on `--color-surface-alt` until they paint. Text over media uses
`--color-media-scrim` / `--color-on-media`, which do not flip in dark mode — a scrim over a photo should stay a scrim.

---

## Checking a theme

Run the catalogue with your stylesheet in the switcher (add it to `themes` in `examples/pages/build-catalogue.ts`) and
`deno task test:catalogue` — it asserts each theme's computed body background changes, light and dark.
`deno task test:all` sweeps every page under `demo/` in both modes for console errors and the same computed-style check.
