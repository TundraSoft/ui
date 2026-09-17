# theming — agent guide

## What this project is

A standalone HTML + CSS + JS component library (cards, grids, forms, modals, notifications, navigation, typography, …)
that is a **first-class UI layer for [rAPId](https://jsr.io/@tundralibs/rapid)** — usable as plain CSS/JS by anyone, but
built so a rAPId app can drop it in as `ui.core` / `ui.layout` and get every component working with rAPId's
swap/live/history runtime with zero glue code.

This file is the spec for rAPId's UI contract — what a component _must_, _must not_, and _may_ do to work seamlessly
with rAPId. Tooling (bundler, CSS pipeline, package manager, test runner, publish target) is deliberately **not**
specified here; that gets configured separately. Treat every claim below as verified against rAPId's actual source
(`packages/rapid/ui/*.ts` and `packages/rapid/docs/Rapid-UI.md` in the TundraLibs monorepo) as of rAPId 0.2.0 —
re-verify against that source before relying on anything here if rAPId has moved on since.

## The one rule that makes everything else possible

**rAPId's runtime imposes no CSS classes, no ARIA roles, and no DOM structure on you.** Its entire client-side contract
is a small set of `data-*` attributes (below) plus one optional class (`rapid-error`, on its _own_ fallback error page,
easily overridden). Grepping rAPId's UI runtime source for `class=`/`aria-`/`role=` turns up nothing else. That means
this library owns its whole class/ARIA vocabulary — the only job is to not collide with rAPId's `data-*` names and to
correctly participate in the integration points below.

## Compatibility contract (verified against `packages/rapid/ui/*.ts`)

### 1. Markup is `Html`, never a raw string

rAPId's `html` tagged template (`@tundralibs/rapid/ui`) escapes every interpolated value by default; the only way to
embed pre-rendered markup is `raw()` or composing another `Html` value (an `Html` value is branded with a module-private
symbol specifically so untrusted JSON-shaped data can never impersonate trusted markup by accident).

Any component this library ships as a **TS template function** (as opposed to a plain `.css`/`.js` asset) must:

- Build its markup with `html`/`template()` from `@tundralibs/rapid/ui`, never string concatenation.
- Accept typed props and interpolate them normally — they get escaped for free.
- Only use `raw()` when composing a value that is _already_ `Html` (e.g., a Grid composing already-rendered Card
  fragments) — never on a caller-supplied string.

This mirrors rAPId's own security model exactly and means a component built this way is safe by construction, the same
way `Card` is in rAPId's own scaffold example.

### 2. Interactivity is `data-*` attributes, not custom JS wiring

rAPId's swap runtime (served at `ui.runtimePath`, default `/__rapid/ui.js`) reads these attributes directly off elements
— a component that wants server-driven behavior (fetch a fragment, swap it in) declares them instead of writing its own
fetch/DOM code:

| Attribute     | Meaning                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `data-action` | URL to fetch.                                                                                           |
| `data-method` | HTTP method — default `get`, or `post` if the element is a `<form>`.                                    |
| `data-target` | CSS selector for what gets updated — defaults to the triggering element itself.                         |
| `data-swap`   | `outer` \| `append` \| `prepend` \| (default: replace the target's `innerHTML`).                        |
| `data-load`   | Lazy-load marker — fetches on mount, GET only.                                                          |
| `data-push`   | Opt into history push for this action (needs `history` — see below); value may override the pushed URL. |

Config overrides live as `data-*` on `<body>`, read once at runtime start: `data-csrf-cookie` (default `csrf`),
`data-csrf-header` (default `x-csrf-token`), `data-swap-header` (default `rapid-swap`), `data-redirect-header` (default
`rapid-redirect`), `data-live-path` (default `/ws`). Components should never hardcode these header/cookie names — if a
component's own script needs them, read the same `<body
data-*>` values the runtime does, don't assume the defaults.

The runtime dispatches bubbling `CustomEvent`s a component can listen for instead of polling: `rapid:swapped`
(`detail: { status, url, method,
swap, title? }`) and `rapid:error` (`detail: { status, body }`). It exposes
`window.rapid.swap(url, target, opts)` and `window.rapid.refresh(target)` as the only public JS API surface for
triggering a fetch+swap programmatically.

### 3. Swap fragments must be self-contained

Any server route can return just _one region's_ fragment (a swap), with no document wrapper, no layout, no core — the
three tiers (`core` / `layout` / route template) are skipped entirely on a swap. Every component must therefore render
correctly as a **bare, standalone fragment**: no assumption that a parent's wrapper class/attribute is present, no
dependency on sibling markup existing. A Card, a Grid item, a notification, a modal's body — each must be a complete,
valid fragment on its own.

### 4. A region that supports back/forward navigation needs a stable `id`

rAPId's history module (`ui.history: true`, served at `/__rapid/history.js`) pushes a browser history entry keyed to a
CSS selector built from the swapped element's `id` (`'#' + CSS.escape(region.id)`) — **it refuses to push if the region
has no `id`**, logging a console warning instead. Any component meant to be a pushable page region (a main content area,
a paginated list) must render with a stable, predictable `id`. Only `GET` swaps are pushable; a `POST` form swap is
refused for push the same way.

On restore (`popstate`), history re-fetches via `window.rapid.swap()` with **no DOM cache** — a restored region is a
fresh server round-trip, not a client-side snapshot. Design accordingly: don't assume component JS state survives a
back-navigation; re-initialize from the fresh markup.

### 5. Realtime components subscribe to `rapid:push`, never open their own socket

rAPId's live module (`ui.live: true`, served at `/__rapid/live.js`) owns the one websocket connection (default path
`/ws`, overridable via `data-live-path`) and channel subscriptions (`window.rapid.live.connect(channel)`). A component
that wants live updates (a live notification feed, a presence indicator) listens for the `rapid:push` `CustomEvent`
(`detail: { channel, data }`) on `document` — it must **never** open its own `WebSocket`. Connection state is observable
via the `rapid:live` event (`detail: { connected }`).

### 6. Forms render around rAPId's validation-error shape

Server-side validation failures surface through `formState()` as `RapidFormError`:
`{ state: 'error', message, fields, values }` — where `fields` is per-field messages and `values` is the re-fillable
subset of the submission (`keptValues()` deliberately strips out nested objects/arrays/file uploads — **a file input is
never echoed back into re-rendered markup**). Form components (inputs, field-error text, form-level error banners)
should be designed to render directly from this shape, so a rAPId app's form handler can pass it straight through with
no translation layer.

### 7. Pagination / "load more" is built on `withQuery()`'s merge semantics

`withQuery(path, base, patch)` merges a base query (typically the current `view.query`) with a patch object — a patch
value of `undefined` deletes that key, everything else overwrites. A pagination/"load more" component's generated links
should assume this exact merge behavior (so a page that already has `?sort=name` keeps it when adding `?page=2`), not
invent its own query-string logic.

### 8. Assets are served through `view.asset()` — don't self-version

`view.asset(path)` appends `?v=<djb2-hash-of-file-contents>` for cache-busting (served with
`Cache-Control: public, max-age=31536000,
immutable`); rAPId owns this hashing when `server.static`'s
`fingerprint: true`. This library's build output should therefore be a **small, stable set of file paths** (e.g. one CSS
bundle, one JS bundle, maybe a few more) that `view.asset()` can version — it must not _also_ hash its own output
filenames, or the two versioning schemes fight each other and cache-busting breaks.

### 9. No inline styles or scripts — CSP is a first-class target

rAPId's own built-in fallback (`DefaultErrorPage`) uses inline `style=` attributes and says outright that it is **not**
compatible with a strict CSP (`style-src`/`script-src` without `unsafe-inline`) — that's a known, accepted gap in
rAPId's minimal fallback, not a pattern to copy. This library should do better: no inline `style=`/`onclick=`-style
attributes anywhere, so a rAPId app adopting it can run a strict CSP. Provide a richer, CSP-clean error-page template
set (covering rAPId's `ErrorData`: `status, code, message, requestId, mode, details, debug`) as a drop-in replacement
for `DefaultErrorPage` via `ui.errorTemplates`.

## What "seamless" means concretely

Ship, eventually:

1. **Plain CSS + JS assets** — framework-agnostic, servable by anything (not just rAPId) via a `<link>`/`<script>` tag,
   versioned the way §8 describes.
2. **TS component templates** built on `@tundralibs/rapid/ui`'s `html`/ `template()` (§1), so a rAPId app gets typed,
   escaped-by-default components — e.g. the equivalent of rAPId's own scaffold's `Card`, but production-grade and
   matched to this library's CSS.
3. **A `core` template** (`RapidTemplate<RapidCoreData>`: `{ body,
   title?, meta? }`) — the document shell
   (head/meta/viewport, this library's own asset links) — that plugs straight into
   `Application.initialize({ ui: { core } })`.
4. **A `layout` template** (`RapidTemplate<{ body, title? }>`) — the page frame (nav/header/content-slot/footer) — same
   plug-in shape, for `ui: { layout }`.
5. **Error templates** matching `ui.errorTemplates`, per §9.

A rAPId app should be able to depend on this library, hand its `core` and `layout` straight to `Application.initialize`,
and use its component templates in routes — no adapter code in between.

## Component inventory (built)

Each lives under `components/<name>/` as `<name>.css` (+ `<name>.ts`, + `<name>.js` where it needs behavior), wired into
`styles/index.css`'s `components` layer:

card, button, switch, choice (checkbox/radio), input (+ floating-label and prefix/suffix/dropdown-combo mutations via
`InputGroup`), textarea, select, alert, form-field/form-grid/form-actions, form, menu (multi-level, recursive), navbar,
sidebar (+ optional desktop "collapse to icons" mini-sidebar mode, see below), app-shell, auth-layout, grid (12-col,
collapses to 1 col below md), tabs, collapsible/accordion, dropdown, wizard, pagination, modal (native `<dialog>`),
toast, badge/chip, avatar, breadcrumb, tooltip (CSS-only), progress/spinner, chart (ApexCharts only — see "Charts"
below).

**v2 additions (2026-09-14, migrated from a design-agent revamp):** data-table (dense, sticky header, selection + bulk
bar, pinned/numeric/ mono columns), combobox (single/multi, server-swapped listbox, keyboard nav), datepicker
(single/range, month nav + day picks are `data-push` links), command (palette, `⌘K` opens a non-inline one), dropzone
(native `<input type=file>` covers the area; upload rows are server state, never echoed form values), slider (native
range + painted track), segmented (a real radiogroup — never `<button>`s), popover, timeline, empty (card/inline/page,
error tone with request id), skeleton (+ `SkeletonTable`/`SkeletonCard`, pairs with `data-load`), and (2026-09-15)
**otp** — one-time code entry: N cells that auto-advance, spread a paste/SMS-autofill across cells, walk back on
Backspace, and fire `otp:complete` (`autoSubmit` calls `form.requestSubmit()`). Progressive by construction: the
markup's single `autocomplete="one-time-code"` input (`.otp__value`) is what the form submits and what a no-JS user
sees; otp.js hides it and syncs it from the cells. `mode: "numeric" |
"alphanumeric"`, `groups` for separators,
`value`/`error` for a re-render after a failed attempt (§6). The same revamp re-valued the CSS of
button/input/alert/badge/table/toast/switch and the v1 TS templates now expose the new hooks as props: `Button`
`variant: "subtle" | "accent"` + `ButtonGroup`, `Badge` `dot`/`accent`/ `code`, `Chip` `static`, `Toast`
`variant: "ink"` + `icon`/`meta`/`action`, `Switch` `hint`, `Alert` `fields` (per-field name+message, what
`FormErrorAlert` now uses) + default status icons, `InputIcon`. (The v1 `Table` was retired into `DataTable` on
2026-09-16 — see the catalogue review round.)

**v2 tokens** (`tokens/default.css`): `--color-primary` is now _ink_ (near-black, inverts to near-white in dark) and a
single `--color-accent{,-strong,-contrast,-inverse}` carries the hue; new `--color-canvas` (page ground — `body` paints
it; `--color-surface` is card ground), `--color-surface-sunken`, `--color-border-subtle`, `--color-text-subtle` (the
lightest legal text colour, ≥4.5:1), `--shadow-color` RGB triplet feeding two-layer shadows, `--font-family-display`
(headings), `--font-size-2xs`, `--letter-spacing-*`, fixed `--control-height-{sm,md,lg}` (30/36/44 — padding-derived
heights never aligned an input to a button), and `--ring-*` (`--focus-ring-*` kept as aliases). Base font stack names
"Instrument Sans"/"JetBrains Mono" with system fallbacks — the fonts are _not_ bundled; a page that wants them adds the
Google Fonts link (no demo does; the fallback stack is what you see). New tokens are consumed as
`var(--color-accent, var(--color-primary))` so a v1-only theme still works, but every shipped theme sets the full set —
otherwise the base's warm neutrals bleed into a cool palette.

**CSP fixes made during the migration** (the design-agent originals used inline `style=`, which §9 forbids): the
slider's `--slider-pct` is set only by `slider.js` (the painted track is hidden under `html:not(.js)` so a no-JS page
shows the native range instead of a 0%-fill lie), ticks are flex-spaced not per-tick positioned; the dropzone progress
bar is a native `<progress>` like `components/
progress`; skeleton widths are a step scale (`.skeleton--w-xs…full`,
`SkeletonWidth` type); `DataTable` `maxHeight` is `"sm" | "md" | "lg"` mapped to `.data-table__scroll--*` (themes retune
via `--data-table-max-height`). `styles/base.css` gained `.mt-1..4` and `typography.css` `.text-medium/semibold/bold` so
demo pages never need an inline style either — `examples/tests/test-catalogue.ts` and `test-app.ts` grep the generated
HTML for `style="` and fail on any.

**Behavior scripts** for the v2 components follow the existing convention — one `components/<name>/<name>.js` IIFE each
(slider, combobox, command, popover, datepicker, data-table, dropzone), picked up automatically by
`scripts/build-js.ts`, delegated from `document`, keyed off `data-*`/ARIA roles, with `initAll()` re-run on
`rapid:swapped` (and immediately if the DOM is already ready, so a late-loaded bundle still paints). Do not reintroduce
a single "behaviors" file — it was split on purpose.

**`examples/themes/{console,ledger,portal}.css`** came with the revamp (`sunset.css` is the older test theme; all four
are on every catalogue page's switcher): Console is dark-first (`:root, :root[data-theme="dark"]` share the dark
palette; only `[data-theme="light"]` differs — so its first toggle from unset→dark is a legitimate no-op, which
`test-catalogue.ts` accounts for), Ledger swaps `--font-family-display` to a serif and squares every radius, Portal
raises `--control-height-*` and radii. Each ships custom partials (`.console-rail*`, `.ledger-masthead*`,
`.portal-split*`) outside any layer, the §"custom partials" pattern in practice.

The v2 components are catalogued like everything else (see "The catalogue"); `deno task test:catalogue` drives their
behaviour (slider sync, combobox keyboard, inline date picker, OTP, dropzone, data-table selection/bulk bar, command
palette, popover) and each theme's computed body background light and dark. `design-template/` was the design agent's
hand-off; the migration is complete and the folder is gone.

**The admin demo is composed from v2 components** (second pass, same day): the navbar search is a `[data-command-open]`
trigger for a page-level `Command` palette (`⌘K` also opens it; overlay click or Escape closes); the dashboard uses
`Timeline` (activity), `Segmented` (chart range / period), `DataTable` (orders) and a `data-load` region holding
`SkeletonTable`; Tables has two selectable `DataTable`s with bulk bars, a `Segmented` status filter wired to `filter.js`
via `inputAttrs: { "data-table-filter": "" }`, a `[data-filter-empty]` inline `Empty` that `filter.js` reveals on zero
matches, a range `DatePicker` in the toolbar, a card-level `Empty` and a lazy skeleton; Forms is every field type in one
`Form` (`InputIcon`, `InputGroup`, single + multi `Combobox`, `DatePicker` with `min`, `Segmented`, `Slider` plain +
stepped, `Dropzone` with progress/done/error rows) under a `FormErrorAlert` fed a mock `RapidFormError`; Team cards
carry a `Popover`; Profile has a selectable sessions `DataTable`; Invoice uses `Table` `numeric`/`framed`, a status
`Timeline`, `ButtonGroup`, a client `Popover` and an ink Undo `Toast`; Settings adds a multi `Combobox`, `Slider`,
billing `DataTable`, webhooks inline `Empty` and a danger-zone `Modal`. `examples/tests/test-admin.ts` drives every one
of these (palette open/focus/Escape, bulk select/all/clear, radio filter counts, empty-state show/hide, combobox pick,
token removal, slider output + `--slider-pct`, datepicker min-date disabling, dropzone `<progress>` + row removal,
popover open/outside-close, modal) — 0 issues.

**Static-demo behaviours (user feedback round):** `combobox.js` and `command.js` filter the _rendered_ options
client-side whenever the input has no `data-action` (with it, rAPId re-fetches per keystroke and they stay out of the
way); multi comboboxes add a token + hidden input on pick (name comes from `data-combobox-name` on the root; Backspace
on an empty input pops the last token). `toast.js` accepts `[data-toast-open="#template"]` (clones a `<template>` into
`#toast-region` / `data-toast-region`) — the admin pages keep their toasts in a `<template id="page-toasts">` and "Show
toast" plays them. `shared/js/view-switch.js`: a radio with `data-view-target="#el"` writes its value to `data-view` on
the target (projects grid ↔ list is pure CSS off that attribute). `Dropdown` takes `triggerClass` so it can be the caret
half of a `ButtonGroup` split button; `.dropdown__panel` is `width: max-content` so it never shrink-fits to a tiny
trigger. `DatePicker` panels now **float** (absolute, `--z-popover`) with `align: "end"` to hug a right edge and
`inline: true` to stay in flow (the gallery uses inline; a toolbar must not reflow when it opens — `test-admin.ts`
asserts the toolbar height is unchanged). The dark sidebar in light mode is intentional (admin signature look, see
`examples/themes/admin.css`) — drop the `.sidebar { --color-… }` block there to make it follow the page theme.

**Reset regressions the v2 hand-off introduced** (both caught only by a human clicking around, then pinned with
assertions in `test-admin.ts`): the v2 `reset.css` zeroes all margins, which wipes the UA's `dialog { margin: auto }` —
modals opened top-left until it was restored; and it dropped the list padding reset, so every class-carrying `<ul>`
(menu, sidebar rail, dropdown panel) inherited the UA's 40px `padding-inline-start` — sidebar links indented, collapsed
icons shoved off the rail, split-button menu labels wrapping. The reset now does
`ul[class], ol[class] { list-style: none; padding: 0 }` (prose lists keep bullets). When a reset file is replaced
wholesale, diff it against the old one for _removed_ rules, not just added ones.

**Sidebar sections + tab deep links:** `MenuItem.expanded` renders a parent open; the admin `withActive()` expands a
parent whose children live on the current page file. `components/menu/menu.js` then marks the child whose `href` equals
the _full_ URL (path + hash) `aria-current` and opens its sublist — only the browser knows which hash was followed.
`tabs.js` blurs a deep-linked tab after activating it: fragment navigation focuses the target `<button>`, and because
that isn't a pointer interaction it paints `:focus-visible` — a stray border to the person who just clicked a sidebar
link.

**Adversarial review round (2026-09-15)** — two review agents (JS/ security/rAPId-contract, CSS/a11y/responsive) plus a
Puppeteer perf audit (`deno task perf`, `examples/tests/perf-audit.ts`: bundle + gzip sizes, request count/bytes,
FCP/DCL/load, CSS/JS coverage, running animations). What changed, and the rules that fell out of it:

- **No `raw()` with a prop in it, ever.** Six components did `raw(\`
  data-x="${props.y}"\`)`— an XSS path. Every conditional
  attribute now goes through`renderAttrs({...})`(undefined = omitted),
  and`renderAttrs`validates attribute *names* against a regex since
  those are the one thing that must stay raw.`classAttrs(base,
  attrs,
  ...extra)`merges a caller's`attrs.class`into the component's own
  class (a second`class`attribute is silently dropped by the parser —`Card`
  had the merge, nothing else did); use it on every root element.
- **rAPId only reacts to click/submit on `[data-action]`** (verified in `packages/rapid/ui/ui.ts`). So: an input's
  per-keystroke fetch is done by the component script via `window.rapid.swap(url, target)` — combobox/command carry
  `data-combobox-action`/`data-command-action` (NOT `data-action`, which would make a click on the input swap the list)
  and fall back to client-side filtering without the runtime; `data-load` is a marker and the URL goes in `data-action`
  (`Popover.loadFrom`, the admin lazy regions); sort/day/preset/page links carry `data-action` + `data-target="#<id>"` +
  `data-swap="outer"`
  - `data-push`, otherwise they are full navigations; a radio can never carry `data-action` (the runtime's
    `preventDefault` cancels the check — `Segmented.action` was removed; wrap in a `<form data-action>`); a destructive
    "remove" is a `<form method="post" data-action>`, never a GET link (`DropzoneFile.removeHref`).
- **Fragment partials for every swap target**: `ComboboxList`, `CommandList`, `DatePickerPanel` are exported (§3).
- **Deterministic ids**: `Menu` takes `id` and derives sublist ids from the index path; the admin demo derives row-menu
  ids from row keys. A module-level counter drifts across server renders and breaks `aria-controls`/`data-toggle` after
  a swap.
- **Values vs labels**: single `Combobox` submits `data-value` through a hidden input, the visible text input is
  unnamed; `DataTable` checkboxes are `name=selectName` (default `selected`).
- **Escape discipline**: a component only claims Escape (preventDefault
  - stopPropagation) when it actually closed something, so the `<dialog>`/popover around it still gets it;
    popover/dropdown scope Escape to the one containing focus; focus returns to the trigger. `command.js` restores focus
    to its opener and traps Tab (aria-modal).
- **DatePicker has a client mode**: with no `build*Href`, datepicker.js runs month nav/picking/range itself (state in
  `data-datepicker-*` attributes, hidden inputs `[data-datepicker-start|end]`, label in `[data-datepicker-label]`). Day
  buttons carry full `aria-label`s, `aria-current="date"`, `aria-pressed`.
- **Mobile**: the admin navbar renders `SidebarToggle` (class-only toggle via `data-toggle-class`, so the sidebar never
  gets `hidden` and survives a resize to desktop); the closed drawer is `visibility:
  hidden` (out of the tab order);
  Escape closes it. `.navbar__actions` is `flex-shrink: 0` — the brand ellipsizes instead. Scroll wrappers are
  `position: relative` so an `.sr-only` inside a wide table cannot push the page width. `test-admin.ts` now runs a 375px
  pass.
- **Floating panels** are clamped to `calc(100vw - 2*space-4)`; `dropdown.js` switches a panel to `position: fixed`
  (CSSOM, not an attribute — CSP-clean) when the dropdown sits inside
  `.table-scroll`/`.data-table__scroll`/`[data-dropdown-clip]`, and `.data-table` dropped its `overflow: hidden`
  (corners rounded on first/last child). Any scroll/resize closes a fixed panel.
- **Contrast tokens**: `--color-border-control` (≥3:1 form-control outline; every theme sets it),
  `--color-secondary-strong` (secondary hover — hovering to `--color-text` was 1.1:1 in dark),
  `--color-media-scrim`/`--color-on-media` (fixed dark/light for text on images; primary-contrast flips in dark and
  vanished), base warning `#9a6200`. Themes: admin's dark sidebar re-maps `--color-primary` to `#a5b4fc` (active link
  was 2.45:1); sunset's brand orange is `#c2410c` for text/fill roles; blog/admin/sunset muted text darkened one step;
  portal/ledger/sunset dark blocks now set status/secondary/disabled/ overlay; console defines the full status +
  contrast set in both blocks (it otherwise inherited OS-dependent values).
- **Touch targets** ≥24px on every icon-only control (close/remove/sort/ dropdown trigger/date nav/presets) via
  min-size + negative margin so the visual stays compact; `.hide-sm` utility hides non-essential labels below 576px.
- **Reset**: `scroll-behavior: smooth` only under `html:focus-within` and
  `scroll-padding-top: var(--scroll-padding-top)` so a `#tab-…` deep link lands instantly and below the sticky navbar;
  reduced-motion keeps spinners turning slowly (a frozen ring is not a loading state); `<dialog>` keeps a viewport
  margin.
- **Perf**: ApexCharts is pinned (with SRI), `defer`red and loaded only by the page with a chart (was an unpinned
  render-blocking script on all ten admin pages: dashboard FCP ~1.4s → ~120ms; other pages make zero external requests);
  `chart.js` retries on `load` so a deferred library still initialises; skeleton shimmer is a translated `::after`
  (compositor), not an animated `background-position`; `CardMedia` defaults to `loading="lazy" decoding="async"`
  (`loading: "eager"` for a hero). Bundle (minified since 0.1.1): ~14.6 KB gz CSS, ~11.3 KB gz JS.
- **Known, deliberately not fixed**: toasts render under an open `<dialog>` (top layer beats any z-index — needs the
  Popover API, not 2022-baseline); `theme-toggle.js` runs after first paint so a stored dark preference flashes light
  for a frame (the CSP-clean fix is a server-set `data-theme` from a cookie, which is a rAPId app's job); RTL is
  converted for sidebar/menu/select/tables/dropdown but not every v1 file; no print stylesheet; demo pages keep a
  `<style>` block for harness-only layout.

Library changes that pass forced: `.card` no longer sets `overflow: hidden` (it clipped any popover/date picker/combobox
list near a card edge — the media/first-child corners are rounded individually instead); `Card` merges `attrs.class`
into its own class list (a second `class` attribute is silently ignored by browsers, which is how the danger-zone border
went missing the first time); `Segmented` has `inputAttrs`; `filter.js` honours radio/checkbox `[data-table-filter]`
(only the checked one counts, empty value = all) and toggles `[data-filter-empty]`; `command.js` handles
`[data-command-open="#id"]` and overlay clicks; a `Slider` inside a `FormField` should carry its own `label` (that's
what renders the live `<output>`), not the field's.

`templates/core.ts` and `templates/layout.ts` are the §"what seamless means" deliverables
(`RapidTemplate<RapidCoreData>` / `RapidTemplate<{body, title?}>`); `templates/errors.ts` is the CSP-clean
`DefaultErrorPage` replacement (§9). `shared/attrs.ts` (safe attribute spreading), `shared/classnames.ts` (`cx()`), and
`shared/js/` (the `.js`-only-opt-in enhance script; generic `[data-toggle]`/`[data-dismiss]` behavior;
`collapse-sidebar.js` for the mini-sidebar; `theme-toggle.js` for dark mode) are the cross-cutting pieces every
component builds on — reuse them in custom partials too rather than re-solving the same problems.

**Dark mode** is a token-level capability, not a separate theme: every token file's `:root` is the light palette;
`tokens/default.css` adds a `prefers-color-scheme: dark` block (guarded by `:not([data-theme="light"])`) plus a
`[data-theme="dark"]` block (identical values, intentionally duplicated) so an explicit choice always wins over the
system preference in either direction. `shared/js/theme-toggle.js` flips `document.documentElement.dataset.theme` on a
`[data-theme-toggle]` click and persists it to `localStorage`. Any custom theme's override file should add its own two
dark blocks the same way if it wants dark mode — copying just the light `:root` isn't enough.

**Charts (2026-09-16): ApexCharts, one engine, pinned.** The Chart.js wrapper is gone — "both behind one API" would have
been a translation layer over two divergent option models, and the value a UI library adds to a chart is the
integration, which is engine-specific work best done once. `components/chart/chart.ts` exports `APEXCHARTS`
(`{ version, src, integrity }` — the ONLY place the version lives; bump it there and recompute the sha384 of the file at
that URL), `ChartScript()` (the pinned `<script>` for a static page; a rAPId app passes `APEXCHARTS` in
`createCoreTemplate({ scripts })`, whose object form carries the integrity hash), `chartTypes` / `ChartType` (all 28
`chart.type`s ApexCharts 7 renders, incl. histogram, violin, raincloud, waterfall, dumbbell, streamgraph, treemap,
sunburst, unit, waffle, funnel, pyramid, gauge — the default CDN bundle includes the stats feature they need), and
`Chart({ type, series, categories?, labels?, height?, title?, stacked?, horizontal?, sparkline?, toolbar?, options?
})`
where `options` is verbatim ApexCharts config deep-merged over the props (`chartOptions(props)` exposes the result).
Theming is ApexCharts 7's own `--apx-*` design tokens: `chart.css` maps `--apx-accent/fore/grid/surface/series-1..6`
onto the library's tokens on `:root`, the engine re-reads them on every render, and `chart.js` sets `theme.mode` from
`data-theme` / `prefers-color-scheme`, calls `refreshTokens()` + `updateOptions()` when either changes, injects
`--font-family-base`, and destroys instances whose element leaves the DOM. Never pass `colors` to a chart — a theme that
overrides `--apx-series-*` (or `--color-accent`) restyles every chart at once. `examples/shared/charts.ts` holds one
sample per type (`chartSamples`, `chartsGallery()`), rendered on `demo/charts.html`, on the app's `/components/charts`,
and asserted by `test-app.ts` (28 canvases drawn, text fill on our tokens, re-render on the theme toggle). The engine is
~270 KB gzipped, which is the price of that catalogue; it is still never bundled.

**Catalogue review round (2026-09-16)** — the user walked `demo/catalogue.html` and found what the suites had not:

- `Dropdown` with a **string trigger** now renders a real `btn btn--outline` with a chevron (it was an unstyled text
  button that looked like a label); a custom `Html` trigger (icon, split-button half) still styles itself via
  `triggerClass`. Every catalogue control must _do_ something when clicked — a dead caret in a `ButtonGroup` is a bug
  report waiting to happen, so the split button lives under dropdown, wired.
- `Select` draws the same chevron icon as the combobox (`.select__caret`, an `Icon`, no CSS-drawn arrow) so native
  selects and comboboxes read as one family; a `Select` inside an `InputGroup` loses its own frame
  (`.input-group > .select > .select__control`).
- **`Input({ type: "date" })` renders the `DatePicker`** (client mode) instead of the native control — same look in
  every browser, keyboard nav, min/max from `attrs`, tokens; its hidden input carries `name` + ISO value so the form
  posts the same field. It needs a stable `id` or `name`. `DatePicker` gained `disabled`.
- Combobox: the list anchors to a `.combobox__anchor` around the field (not the root), so a `hint` below stays in flow
  and is hidden (`visibility`) while the list is open — previously the list rendered _below_ the hint, leaving the
  field's squared corners hanging over a text line ("the border looks broken").
- Toast `.toast__close` is `align-self: center` for every variant (only ink had it). `.table__empty > .empty` is centred
  (an inline `Empty` inside a `DataTable` hugged the left).
- Charts: a sunburst **branch needs its own `y`** (the sum) or the ring is empty; `chart.type: "raincloud"` draws
  nothing in the CDN bundle, so `chartOptions()` maps it to `violin` + the raincloud preset (`side`, `box`, `points` in
  their own lane) — the public `ChartType` keeps "raincloud".
- A `<details>`-based `Collapsible` in a flex row shrink-fits when closed and fills when open; in a catalogue, stack
  them. The catalogue's own harness classes are the first suspect when a component "looks broken" there.

**`Table` retired, `DataTable` is the one table (2026-09-16).** Two overlapping components invited the wrong choice.
`DataTable` gained `emptyMessage` (plain-text alternative to `empty`) and now owns `.data-table__sort` /
`.data-table__empty` (moved from the deleted `components/table/`); `id` is required (§4). The projects table in the v1
gallery, the admin invoice line items and the catalogue all use it. Nothing named `.table*` exists any more —
`dropdown.js` clips only inside `.data-table__scroll` / `[data-dropdown-clip]`.

**Loading state is automatic for swaps (`shared/js/busy.js`, 2026-09-16).** On a `[data-action]` click or a
`form[data-action]` submit, the region the swap will replace gets `aria-busy="true"` + `data-busy`; `skeleton.css`
paints a translucent veil with the skeleton shimmer over `[data-busy]` and turns pointer events off (no double submits);
`rapid:swapped` / `rapid:error` clear it, with a 15 s safety timeout. `data-load` regions are left alone — they carry
their own server-rendered `Skeleton*` until the fragment lands, which stays the right pattern for _content-shaped_
loading because only the server knows the shape. Images (`.card__media`, `.avatar`) already sit on a sunken ground that
reads as a placeholder until they paint. `test-app.ts` asserts the projects table wore the veil during its sort swap and
shed it after. The script only listens to the same delegated events the runtime does and never calls `rapid.*`; it does
not know whether the runtime is present, which is fine — without it the click is a plain navigation and the veil goes
with the page.

**Catalogue review round 2 (2026-09-17)** — findings from the user walking `demo/forms.html` and `data.html`:

- **`Select` is now the Combobox's UI with a read-only input** (same field, caret, list, keyboard navigation, type-ahead
  on the letters) backed by a native `<select>` that carries `name` and submits. Enhanced pages hide the native control
  (`display: none` still submits); no-JS pages show it and hide the UI. `select.js` mirrors picks into the native
  control (firing `change`, so `filter.js` and friends see a normal select) and native changes back into the UI. `id`
  goes on the visible input (a label's `for` reaches it); the native control is `<id>-native`, the list `<id>-list`.
  With no value and no placeholder the first enabled option is the selection, like a native select.
  `ComboboxOption.disabled` exists for this (`aria-disabled`, skipped on click). Inside an `InputGroup` (the addon wraps
  it, so the rules are descendant, not child, selectors) the field loses its frame, the read-only input is `5ch` wide
  and the list is `max-content` wide with a minimum, so a "+1" country-code select does not squeeze its options into a
  5ch column. `combobox.js` dispatches `combobox:pick` on a single pick — that is the wrapper hook.
- **Open combobox = one box**: while open, field and list share a 2px accent frame (border + 1px `box-shadow` spread)
  instead of an outline around the field alone; the list's top edge is open. `.chip` pads symmetrically;
  `.chip--removable` pads less on the button side.
- **Date picker: year navigation** (`data-nav="prev-year|prev|next|next-year"`, double-chevron icons
  `chevronsLeft/
  Right`; the client script retargets all four after a month change) and a stacking fix that is worth
  remembering: a **flex item with a `z-index` stacks like a positioned element even when `position: static`**, so the
  inline picker's panel (static, but `z-index` inherited from the base rule) outranked a sibling's floating panel.
  Inline panels are `z-index: auto`; an open floating picker's root gets `.datepicker--open` →
  `z-index: var(--z-popover)`.
- **Segmented control has a sliding thumb**: `segmented.js` measures the checked label and writes `--segmented-x` /
  `--segmented-w` on the root (CSSOM custom properties), `::before` is the surface that glides (transition on
  `transform`/`width`, off under reduced motion). The radios and labels are unchanged, so it still submits and works
  without JS (`data-segmented-ready` gates the thumb; the checked label keeps its own background until then).
- **`Editor`** (`components/editor`, 2026-09-17): `mode: "markdown"` is a textarea plus a toolbar — bold, italic,
  strikethrough, heading, quote, code, link, image, lists, rule, clear — where every command **toggles** (wraps unwrap,
  line prefixes come off again, clear strips the syntax from the selected lines; Ctrl/Cmd+B/I/K) and a **Preview view
  the server renders** — `previewAction` receives `text` (urlencoded POST) and answers with an HTML fragment that the
  runtime swaps into the panel (the example app's `/fragments/preview` is a deliberately small, escaped renderer; this
  library ships no Markdown parser, and rendering user text is the server's job). `mode: "html"` is a `contenteditable`
  surface driven by `execCommand` (same toolbar plus underline; block formats toggle back to a paragraph, buttons
  reflect the selection via `queryCommandState`/`formatBlock`, new lines are `<p>`s) whose HTML is mirrored into the
  hidden textarea that submits; the initial value is HTML the server already sanitised (the script sets it via
  `innerHTML` — same trust as the markup). Without JS the toolbar and surface are hidden and the textarea stands alone.
  Union `EditorMode` is catalogued like every other.
- Harness lessons: a radio that is visually hidden under its label is "not clickable" to Puppeteer — use a DOM click;
  after adding nav buttons, select them by `data-nav`, not by index.

## Layouts (`layouts/`, 2026-09-15)

A layout is a **frame**: the page chrome and its slots, never content. Eight ship, each
`layouts/<name>/<name>.{css,ts}`, all exported from `layouts/mod.ts` and individually (`./layouts/sidebar` …), in their
own cascade layer (`@layer tokens, reset, base, layouts, components` — a component always wins inside a slot):

| Layout          | Frame                                   | mobile < 768                                                                                       | tablet 768–991                    | laptop 992–1399                        | wide ≥ 1400                                                              |
| --------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `StackedLayout` | header → content → footer               | navbar collapses                                                                                   | horizontal nav                    | —                                      | `boxed` caps at `--layout-max-width`; fluid grows the gutter             |
| `SidebarLayout` | header + `Sidebar` + content (+ aside)  | off-canvas drawer (toggle rendered by the layout, Escape/backdrop close, `visibility:hidden` shut) | drawer                            | full sidebar, collapsible rail; sticky | content capped when boxed                                                |
| `RailLayout`    | icon rail + content                     | bottom tab bar                                                                                     | rail                              | rail                                   | rail                                                                     |
| `SplitLayout`   | master pane + detail                    | one pane (`mobileView`, a route decision)                                                          | both, narrow list                 | both                                   | detail capped                                                            |
| `ArticleLayout` | reading column (+ aside)                | aside below                                                                                        | aside below                       | aside beside                           | measure capped at `--layout-measure` (70ch); `measure: "wide"` for grids |
| `DocsLayout`    | nav · content · TOC                     | nav drawer, TOC disclosure                                                                         | same                              | nav + content, TOC disclosure          | three columns ≥ 1200                                                     |
| `AuthLayout`    | centred card (+ narrative with `split`) | card full width                                                                                    | centred                           | split panel                            | halves capped                                                            |
| `FocusLayout`   | one column, no chrome                   | full width                                                                                         | centred at `--layout-focus-width` | —                                      | —                                                                        |

Rules that make them frames and keep them device-compatible:

- Slots are typed `Html`; the content region always carries a stable id (`contentId`, default `main-content`) so §4
  history push works by default. `asRapidLayout(body => SomeLayout({... content: body}))` (`templates/layout.ts`) is the
  `ui.layout` adapter.
- Sizes are the `--layout-*` tokens (max-width, measure, sidebar/rail/ aside/pane widths, gutter); a theme retunes the
  frame there, never in layout CSS. `--scroll-padding-top` doubles as the sticky-header offset every sticky
  sidebar/aside/TOC sits under.
- **No page CSS in demos.** The admin demo's `HEAD_EXTRA` `<style>` block is gone: what was generic became components
  (`PageHeader`, `Stat`, `Toolbar`, `.card--danger`, `.command__trigger`, the `.stack` utility); what was theme-specific
  moved into `examples/themes/admin.css` as custom partials; the catalogue's harness CSS/JS is written to
  `demo/catalogue.css|js` by its builder. `test-catalogue.ts`/`test-all-pages.ts` would flag any inline `style=`, and
  the demo build prints nothing if none exist.
- `examples/tests/test-layouts.ts` (`deno task test:layouts`) loads every layout at 375, 667×375, 768, 1024, 1440 and
  1920 and asserts: no horizontal overflow, `#main-content` present and within the viewport, reading/boxed frames not
  full-bleed on wide screens, navigation reachable (visible nav, or a drawer toggle that actually opens the sidebar
  on-screen and closes on Escape), rail is a full-width bottom bar on phones, split shows exactly one pane on phones,
  article/docs asides stack vs. sit beside at their thresholds. Add a layout → add it to the demo builder and this list.
- `app-shell` and `auth-layout` were components in name only; they are now `layouts/sidebar` and `layouts/auth`
  (breaking rename, pre-publish).

**Repo layout — library vs. `examples/` (2026-09-15).** The published surface is exactly `components/`, `layouts/`,
`shared/`, `styles/`, `tokens/`, `templates/` plus the two build scripts in `scripts/` (`deno.json` `exports` lists
every component, `publish.exclude` drops everything else). Everything that _exercises_ the library lives under
`examples/` and is never published:

- `examples/themes/` — the six hand-authored sample themes. A theme is a downstream consumer, not a product of this repo
  (see "Base vs. theme"), but a base/theme split is only proven by a real theme, and two of the worst bugs this project
  has had (dark mode silently dead, `attrs.class` dropped) only showed _under_ one.
- `examples/pages/` — the demo builders (`build-*.ts`, `sample-cards.ts`) that write `demo/` (gitignored output, safe to
  `rm -rf`).
- `examples/tests/` — the Puppeteer suites and the perf audit; they drive the generated demo pages and are the only
  integration coverage the components have. `deno task test` runs build → demos → all suites.

**The catalogue (2026-09-16) — every component, every variant, generated, one page per group.**
`examples/shared/catalogue.ts` is a manifest: one entry per component directory (with a `group`: forms, data, charts,
cards, navigation, actions, feedback — `catalogueGroups`), one case per exported template function × every declared
variant/size/tone/status and every meaningful state. Its server-driven cases (the projects and invoices tables, the
`#reviewer` combobox, the `#palette` command, the `#period` picker, the "Show toast" button) come from
`examples/shared/data.ts` and take a `DemoRoutes` — inert query strings on the static pages, real routes in the app —
plus a `CatalogueState` so the app can render a pushed URL's state. `examples/pages/build-catalogue.ts` renders
`demo/<group>.html` × 7 and `demo/index.html` — whose chrome is itself the library (a `SidebarLayout` with a nested
`Sidebar` menu of every group and component, a `Navbar` with a ⌘K `Command` palette that jumps to any component, the
theme switcher hidden below 576px, `PageHeader` + `Breadcrumb` + an "On this page" `Dropdown`, `Stat`s on the index);
the app serves the same groups at `/components/<group>`. `examples/tests/test-catalogue.ts` (`deno task test:catalogue`,
first in `test`) enforces it: **statically**, every `export function` under `components/` and every literal of every
`*Variant|*Size|*Tone|*Status|*Type|*Width|*Mode|
Orientation|Tag|Ratio|Span` union must be referenced by `catalogue.ts`
(+ `charts.ts`, `data.ts`), so a new component or variant fails CI until it is catalogued; **in Chrome**, every section
and case is on its page and non-empty, every chart drew, no console/page errors, no inline styles, no horizontal
overflow, the dark toggle changes the canvas — and the per-page behaviour and theme assertions that used to live in the
gallery-v2 suite. `demo/` stays at the repo root (gitignored build output) so that a local build is easy to find and
open. One harness lesson: `file://` pages share one origin, so a persisted theme toggle leaks between pages — clear
`localStorage` in `evaluateOnNewDocument`, not after load.

**Never delete `examples/` to "clean up"** — it is the regression suite. If a sample theme grows into a product, it
lifts out into its own repo with no restructuring; that is the intended path.

**`examples/themes/*.css`** are source with no generator. An earlier layout nested them under `demo/themes/` and a
same-session `rm -rf demo` deleted them **twice** before the fix was to relocate them, not just to remember more
carefully. Reference them from a demo script with a relative path back to repo root (e.g. `demo/admin/dashboard.html` →
`../../examples/themes/admin.css`, `demo/forms.html` → `../examples/themes/console.css`, `demo/card-themed.html` (gone)
→ `../examples/themes/sunset.css`) — get the `../` count wrong and the browser just silently 404s the stylesheet, so
re-run `deno task test:all` after touching any of these paths (it would have caught this exact class of mistake).

`shared/icons.ts` is a small inline-SVG icon set (`Icon(name, opts)`, ~20 icons) — stroke-based, `currentColor`, built
only from primitive shapes (circle/rect/line/polyline/straight-line paths, no hand-authored bezier curves) specifically
so nothing risks rendering as a malformed blob. Used throughout the admin theme in place of emoji (sidebar nav, stat
cards, navbar, row actions) — emoji render inconsistently across platforms and read as visually "cheap"; this was the
single highest- leverage visual fix in the 2026-09-11 session. Verify a new icon by rendering it standalone at a large
size before wiring it into a real page (Puppeteer screenshot, not by eye in source) — every icon in the current set
rendered correctly on the first try doing this.

`shared/js/filter.js` is a generic client-side search/filter: an element with `data-filter-scope` defines a filterable
region; `[data-table-search]` free-text filters inside it, `[data-table-filter]` (a `<select>`) narrows further, and the
filtered items are a table's `tbody tr` rows when the scope contains a `<table>`, otherwise any `[data-filter-item]` —
so the same mechanism drives both a data table and a card grid (the admin theme's Projects/Team pages). No backend
needed; it's a real, working filter, not a decorative input.

`components/tabs/tabs.js` also supports a `#tab-<id>` URL deep link (activates that tab on load) — used by the admin
Settings page so its sidebar submenu (General/Billing/Integrations) links to a specific tab rather than a dead `#`
anchor.

Demos (restructured 2026-09-16 — the galleries, the card deep-dive, the login page and the blog sample were dropped once
the catalogue covered everything they showed): `demo/index.html` is the landing page;
`demo/{forms,data,charts,
cards,navigation,actions,feedback}.html` are the catalogue, one page per group (see "The
catalogue" below), each with the theme switcher (Base / Console / Ledger / Portal / Sunset) and the dark toggle;
`demo/layouts/*.html` are the eight frames; `demo/admin/*.html` is the one full sample theme (SidebarLayout +
collapsible **dark** sidebar nav + icon set + stat cards + ApexCharts + working filtered/paginated tables + card-grid
Projects/Team + deep-linked Settings tabs + modal + navbar search/notifications/dark-mode toggle, indigo palette — built
from scratch with this library's own components, not a clone of any commercial template's assets). All generated by
`examples/pages/build-*.ts` (`deno task build:demos` runs every one) — edit the script, not the generated HTML in
`demo/`.

`deno task test:admin` (`examples/tests/test-admin.ts`) drives the admin demo with a real headless Chrome (Puppeteer via
`npm:puppeteer-core`, pointed at the system Chrome install — no bundled Chromium) and clicks through every interactive
piece — dark mode, sidebar collapse, modal, dropdown, tabs (including the hash deep-link, opened in a **fresh** page/tab
since a hash-only `page.goto` on an already-open page may not re-run deferred scripts), submenu, switches, and the
search/filter behavior — asserting the actual **computed style** (or, for filter, the actual visible-item count)
changed, not just that a class/attribute flipped. That distinction matters: a toggle can correctly flip its own class
while a later unlayered CSS rule (e.g. a theme's own `:root` overrides) silently cancels the visual effect — exactly the
bug this test caught in dark mode on themed pages (it was missing the dark blocks entirely, not a JS bug). OS-level UI
automation (System Events / osascript) proved unreliable in this environment for verifying interactions — prefer this
Puppeteer approach for anything beyond a one-off visual screenshot. When adding a filter-scope assertion, scope the
follow-up element queries to the SAME scope handle used to find the search input, not the whole page — a page with more
than one `[data-filter-scope]` (e.g. Tables, which has both a team table and an orders table) will otherwise count
another scope's untouched rows as if the filter had no effect.

`deno task test:all` (`examples/tests/test-all-pages.ts`) is the broader sweep — every page under `demo/` (all three
themes, both admin and blog, the plain-default-theme ones too), light and dark, console/page-error capture plus the same
computed-style dark-mode assertion. Run this one whenever a change touches `tokens/default.css`, any
`examples/themes/*.css`, or shared layout components (`sidebar`, `navbar`, `app-shell`) — a fix verified on one theme
(e.g. admin) doesn't verify the others, as the 2026-09-11 session found out twice over: the dark-mode gap existed
identically in `examples/themes/blog.css` and `sunset.css`, and two demo build scripts (`build-demo.ts`,
`build-demo-themed.ts`) separately hardcoded a literal body background that no theme or dark-mode override could reach —
caught only by running this sweep across every page, not just the one being actively worked on.

## Base vs. theme, and custom partials

This repo builds **the base only**: a set of granular, reusable partials (card, form elements, form-layout, accordion,
top-nav, side-nav, and the rest of the inventory above), each shipped as token-driven structural CSS, a JS behavior
module where interaction is needed, and a rAPId TS template (§1). The base owns all markup and structural CSS for what
it ships — a component's look changes only through tokens, never by editing its CSS or markup.

**A "theme" is a downstream consumer of the base**, not something this repo produces. A theme maker:

- Sets a palette (color tokens, and any other token overrides) as a small CSS file loaded _after_ the base bundle (a
  second `<link rel="stylesheet">`, or a second import) — pure overrides, no base file is ever edited.
- Picks a **layout** (`layouts/` — a frame: chrome + slots, see below) and assembles base partials into the sections
  that fill it. Section composition is the theme's job; the frame is not.
- Is free to add **custom partials** — markup/CSS of their own, JS for custom interaction, or (for rAPId) their own TS
  template written the same way base ones are (`html`/`template()`) — for anything the base doesn't cover. Supporting
  this well, from early on, is a first-class requirement, not a later add-on.

Custom-partial support is designed in from the start via three rules:

1. **Cascade layers give overrides a free ride.** The base declares its layer order up front
   (`@layer tokens, reset, base, components;`) and keeps everything inside those layers. CSS written _outside_ any
   `@layer` automatically wins over anything inside a layer, regardless of selector specificity — so a theme's custom
   CSS overrides the base by simply not being layered, no `!important`, no specificity coordination with us.
2. **Base TS templates are composable, not sealed.** Every component is a plain exported function; a custom partial can
   import and wrap a base one, or ignore it and write its own from scratch.
3. **Base JS behavior keys off `data-*` attributes/selectors**, not hard-wired classes, so a theme's own custom
   interactive widget can't collide with a base one just by coexisting on the same page.

## Styling approach

Plain, modern CSS — no Stylus/Sass. Custom properties are the _only_ variable system (compile-time-only variables would
fight runtime theming, which is this library's whole point); native nesting; cascade layers (above) instead of
import-order guessing. A component's structural CSS may never contain a literal color/size/shadow/font value — only
`var(--token-name)` — that's the rule that makes "swap the theme file" actually sufficient.

Target baseline is browsers from 2022 onward. Native CSS nesting and `color-mix()` don't reach that baseline on their
own (they land reliably only from mid-to-late 2023 browsers), so the build runs source through PostCSS with
`postcss-nesting` (downlevels nesting to flat selectors) and `postcss-mixins` (the one thing native CSS still can't do —
loops for parameterized output like `.col-1`...`.col-12`). Both are compile-time-only sugar with no variable system or
logic of their own — not a second language, just a downleveling/macro step ahead of plain CSS.

`color-mix()` is allowed only with a **fallback declaration on the line before it**
(`background: var(--color-surface-sunken); background:
color-mix(...)`) — a 2022 browser drops the unparseable second
declaration and keeps the first, a 2023+ one takes the mix. No PostCSS plugin can downlevel it because every use mixes
`var()`s that only exist at runtime. Never add a `color-mix()` without its fallback, and never put an `opacity` in the
fallback (it would stack on the real mix in modern browsers).

## Tooling and distribution

Build and test tooling runs on **Deno, Node (≥22) and Bun** — the same scripts, unchanged, like the rest of TundraLibs.
The rules that make that true (2026-09-15):

- **No `Deno.*`, `process.*` or `Bun.*` in any script.** File access, env and exit go through `@tundralibs/compat`
  (`/file`: `readDir`, `readTextFile`, `writeTextFile`, `writeFile`, `ensureDir`, `realPath`, `stat`, `pathExists`,
  `readFile`; `/runtime`: `getEnv()`, `exit()`; the perf audit's static server is `@tundralibs/compat/webserver`'s
  `WebServer`). grep `Deno\.` across `scripts/` and `examples/` should return nothing.
- **Bare specifiers only** (`postcss`, `puppeteer-core`, `@tundralibs/compat/file`) — resolved by `deno.json` `imports`
  (`jsr:`/`npm:` mappings, `nodeModulesDir: "none"` so Deno keeps its global cache) and by `package.json`
  `devDependencies` for Node/Bun, where `@tundralibs/*` install from JSR's npm bridge (`npm:@jsr/tundralibs__compat`)
  via `.npmrc` / `bunfig.toml` (`@jsr` → `https://npm.jsr.io`; registry mapping only, no tokens).
- **Running `.ts` directly**: Deno natively; Bun natively (`bun scripts/build-css.ts`); Node through `tsx`
  (`node --import tsx`), the monorepo's convention — the source is also strip-types clean, so Node ≥ 23.6 runs it
  without tsx.
- Entry points: `deno task <x>` · `npm run <x>` · `bun run bun:<x>` (Bun gets its own script names because `npm run`
  scripts invoke `tsx`, i.e. Node). `build`, `build:demos`, `test:*`, `app`, `perf` exist in all three. Verified:
  `dist/ui.css` and `dist/ui.js` are byte-identical from all three runtimes, and the Puppeteer suites pass under each.
- `deno fmt` / `deno lint` / `deno task check` are the quality gates (CI runs all three). `fmt.lineWidth` is 120 and
  `deno fmt` also reflows the markup inside
  `html\`…\``tagged templates — that is expected; it only adds whitespace
  between block-level tags, never inside an interpolation.`version.ts`
  is excluded from fmt (generated).
- **The bundle ships minified** (`scripts/minify.ts`, esbuild's `transform` — the last step of `build-css.ts` and
  `build-js.ts`, since 0.1.1): sources stay readable, `dist/ui.{css,js}` carry only a `/*! … */` license banner. esbuild
  keeps the `color-mix()` fallback declarations, the `@layer` statement and every IIFE (verified before adopting it).
  The banner deliberately has **no version in it**: `version.ts` hashes the built bytes and the release PR bumps the
  version without rebuilding, so the bytes must not depend on it. `esbuild.stop()` is called so Deno exits. esbuild is
  pinned **exactly** (not a caret range): 0.25.0 and 0.25.12 minify media queries differently, and the three runtimes
  must produce the same bytes for the manifest's hashes to hold.

### Package: `@tundralibs/ui` (2026-09-16)

One package, two registries, one artifact:

- **JSR** (`deno.json`: `name`, `exports`, `publish.include`) carries the TS templates for rAPId apps — every component
  (`@tundralibs/ui/card`), `./layouts`, `./templates/{core,layout,errors}`, `./shared/*`, plus `./assets` and
  `./version` — **and** `dist/` (so `copyUiAssets()` can find the bundle from a JSR install).
- **npm** (`package.json`: `files: [dist/, README.md, LICENSE]`, public) exists for **jsDelivr**: the compiled bundle is
  served from `https://cdn.jsdelivr.net/npm/@tundralibs/ui@<version>/dist/ui.{css,js}`. Nothing else ships on npm; rAPId
  apps import from JSR.
- **`version.ts` is generated by the build** (`scripts/build-manifest.ts`, the last step of `deno task build`): the
  version from `deno.json`, the pinned jsDelivr URLs, and the **sha384 SRI hash of each built file**. It is committed —
  the core template imports it — and CI fails ("version manifest drift") when a fresh build disagrees with the committed
  file, so a release can never ship the wrong integrity hashes. Releasing is release-please (see below); the version
  lines in `version.ts` carry `x-release-please-version` markers so the release PR bumps them.
- **`createCoreTemplate({ assets, lang, stylesheets, scripts, head, history, live, toastRegion })`**
  (`templates/core.ts`) is the document shell. `assets: "cdn"` (default, `CoreTemplate`) emits the versioned CDN
  `<link>`/`<script>` with `integrity` + `crossorigin`; `assets: "/ui"` (any `/prefix`) self-hosts through
  `view.asset()` (§8) — the app mounts `dist/` there with `server.static: { "/ui": { root, fingerprint: true } }`. Extra
  `stylesheets`/`scripts` starting with `/` go through `view.asset()` too; full URLs are verbatim. The core always loads
  rAPId's runtime (`view.runtimePath`) **before** `ui.js` (combobox/command call `window.rapid.swap`), and
  `history: true` / `live: true` add the fixed `/__rapid/history.js` / `/__rapid/live.js` modules. Every script is
  `defer` so `<body data-*>` overrides are in place first.
- **`assets.ts`** (`@tundralibs/ui/assets`): `uiAssetsDir()` (absolute `dist/` path when the package is on disk —
  checkout or npm — else `undefined` under a JSR install), `uiAssetUrl(asset)`, and `copyUiAssets(toDir)` which
  reads-or-fetches (`file:` vs `https:` via `import.meta.resolve`) each distributable into the app's own static dir. JSR
  warns that `import.meta.resolve` is "unanalyzable" — expected; the resolve is package-relative and works.

### Example app (`examples/app/`, 2026-09-16)

`createApp({ port, hostname, assets, quiet })` (`app.ts`) boots a real rAPId `Application` (pinned 0.2.0) wearing the
library: `ui.core` from `createCoreTemplate`, `ui.errorTemplates` from `templates/errors.ts`, `prefer: "html"`,
`history: true`, and `server.static` for the self-hosted `/ui` mount (`UI_ASSETS=cdn` switches to the CDN path — only
meaningful once a version is on npm). `serve.ts` runs it (`deno task app`, `npm run app`, `bun run bun:app`; `PORT`
overrides 8010). Routes: `/` (lazy `data-load` stats region, server toasts appended into `#toast-region`), `/layouts` +
`/layouts/<name>` (every frame, `layout: false` since each sample is its own frame), `/components` (v1 gallery),
`/components/data` (v2 gallery), `/forms` (validated signup form), `/errors` (+ a route that throws), and the fragment
routes `/fragments/{stats,toast,reviewers,commands}`.

Two patterns worth copying:

- **A pushable region's URL is the page route itself.** Sort/page links of both tables on `/components/data` and
  month/day links on `/components/forms` point back at those same routes; the handler returns
  `{ …, fragment: ctx.isSwap && <which
  region> }` and the template renders **only that region** on a swap and the
  whole page otherwise. That is what makes `data-push` safe (rAPId's contract: only push page routes) — a reload or deep
  link of a pushed URL renders the full page in the right state, and the history module's back/forward re-fetch lands in
  the right region. With several pushable regions on one page, disambiguate by query keys (`psort/pdir/page` → projects,
  `sort/dir` → invoices, `month/day/preset` → picker) and build each region's links from a fixed base, not
  `withQuery(view.path, view.query, …)`, so one region's state never leaks into another's URLs.
- **Form union straight through.** `/forms/signup` validates into
  `RapidFormError | { state: "clean" } | { state:
  "added" }`; `SignupView` renders `Form({ error })` (→
  `FormErrorAlert` + per-field `FormField.error`) or the success state; the route's `prefer: "html"` + `ctx.isSwap`
  branch gives JS clients an in-place swap and no-JS clients a real 302 (PRG) to `/forms?welcome=…`.

The catalogue, its data (`examples/shared/data.ts`) and the layout samples are **shared modules** parametrised by a
`routes`/`hrefs` object: the static builders pass inert links, the app passes real routes. Add a case to the shared
module, and both the static page and the app show it. The app serves the catalogue's harness CSS from a `/app.css` route
(a string constant) — no `<style>` block, no inline styles, ever; `test-app.ts` greps every page for `style="`, `<style`
and inline `<script>` blocks.

**`examples/tests/test-app.ts`** (`deno task test:app`, part of `test`) boots the app on port 0 and asserts, with a real
Chrome: assets fingerprinted (or CDN + SRI under `UI_ASSETS=cdn`), runtime + history loaded, lazy region filled, toasts
appended, every layout page at 375/1440 with no overflow, table sort/pagination/back-button/reload-of-pushed-URL,
combobox and command palette server-filtered, date-picker month nav + day pick, invoices sort replacing only its region,
the form's error and success states in place plus the no-JS PRG path, and 404/500 through `ErrorTemplate`. Three harness
lessons baked into it: **every swap rides a View Transition** — a click fired before
`document.activeViewTransition.finished` lands on the transition overlay and does nothing (`waitForSwaps` awaits it);
Puppeteer's own scroll-into-view can park a target under the sticky header (`click()` centres first); and a
`type="email"` input with a value the _browser_ rejects never submits at all (use a value only the server rejects).

**`examples/tests/browser.ts`** is the shared Puppeteer launcher for every suite: `CHROME_PATH` (macOS default; CI sets
`/usr/bin/google-chrome`), `--no-sandbox` under `CI`, and **hermetic mode** (`HERMETIC=1`, on in CI) which blocks every
host except loopback and `cdn.jsdelivr.net` via `--host-resolver-rules` so fonts/placeholder images can never flake a
run; `isNetworkNoise()`/`isBlockedRequest()` drop the resulting console/request noise from the assertions. Under Node
(tsx) esbuild's keep-names wraps nested functions in a `__name(fn, "fn")` helper that Puppeteer's serialised
`page.evaluate` callbacks then call in the browser — the launcher installs a no-op `__name` on every new page
(`evaluateOnNewDocument`), which is what made the layouts suite pass on Node in CI. `puppeteer-core` is pinned to 25.x:
23.x pulled `extract-zip` (two unfixable high advisories that failed `deno audit`), and its `ClickOptions` renamed
`clickCount` → `count`.

### Documentation (`docs/`, 2026-09-17)

Wiki-style guides in the TundraLibs shape (title, intro, `---`, TL;DR bullets, sections): `UI-Getting-Started.md`,
`UI-Components.md` (a tour by group with usage snippets — every snippet is type-checked against the real templates
before a release, see the scratch check in the 2026-09-17 session), `UI-Layouts.md`, `UI-Rapid.md`, `UI-Theming.md`,
`UI-Charts.md`; README links them. **`docs/reference/*.md` and `docs/Reference.md` are generated** — `deno task docs`
runs `deno doc --json` over every export into `.docs-api.json` (gitignored) and `scripts/build-docs.ts` renders one page
per module: functions with signatures and JSDoc, types as prop tables (JSDoc per prop) or union lists, constants, the
CSS class hooks from the module's stylesheet, the `data-*` attributes and events from its script. They are committed,
excluded from `deno fmt`, and CI fails on drift. The JSDoc on a prop is its documentation — write it on the type, not in
a guide. `deno doc` is the one Deno-only dev tool; the generator itself is compat-based.

### Icons (2026-09-17)

`shared/icons.ts` is the library's own vocabulary (33 primitive-shape line icons, `Icon(name, { size, className })`,
typed `IconName`), not a general icon library — that stays a separate product; every icon prop takes `Html`, and the
documented recipe for another set is a one-line `raw()` helper over its SVG strings. For plain HTML there is now a
sprite: `IconSprite()` (inline once, `<use href="#icon-<name>">`) and `dist/icons.svg` (built by
`scripts/build-icons.ts` in `build`, listed in `version.ts` as `UI_ICONS` and copied by `copyUiAssets()`; same-origin
only — browsers refuse a cross-origin `<use>`). `iconNames` drives the index page's icon grid and `test-catalogue.ts`
checks the sprite holds every name.

### Releases, changelog, wiki, issues (`.github/`, 2026-09-17)

- **release-please** (`release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`) owns versions
  and `CHANGELOG.md`: conventional commits on `main` feed one open `chore(main): release x.y.z` PR that bumps
  `deno.json`, `package.json` and the marked lines of `version.ts` (release-type `node`, `bump-minor-pre-major`, the
  TundraLibs changelog sections). Merging it tags `vX.Y.Z` and the `publish` job (gated on `TundraSoft/ui` + a created
  release, `workflow_dispatch` as the manual escape hatch) builds, asserts `version.ts` has no drift and the three
  versions agree, publishes **npm first** (`--provenance`; trusted publishing or `NPM_TOKEN`), waits for jsDelivr via
  `scripts/check-cdn.ts`, then `deno publish` (JSR OIDC, 3 retries). The manifest starts at `0.0.0` so the first `feat:`
  commit proposes `0.1.0`; never hand-edit the version or the changelog again. `.github/RELEASING.md` lists the one-time
  setup (JSR repo link, npm trusted publishing, optional `RELEASE_PLEASE_TOKEN` PAT, create the wiki once).
  Bootstrapping lessons (first run, 2026-09-17): a repo with no release tag is a "first release" and release-please
  proposes **1.0.0** regardless of the manifest — `initial-version: "0.1.0"` in the config pins it; `CHANGELOG.md` is
  excluded from `deno fmt` (release-please writes `*` bullets and inserts each release straight under the H1, so the
  file is just `# Changelog` — an intro paragraph gets demoted under a second heading); and release-please only rewrites
  its PR when the release notes change, so a hidden-type commit (`ci:`, `chore:`) that touches a file the PR also edits
  leaves the PR behind main. Same-repo release PRs run CI through the push on the PR branch (the `RELEASE_PLEASE_TOKEN`
  PAT); the `pull_request` event is skipped by the jobs' `if:`.
- **Wiki** (`wiki-sync.yml` + `scripts/wiki-sync.ts`): `docs/` is the source of truth; every push to `main` touching it
  flattens `docs/*.md` + `docs/reference/*.md` into the `TundraSoft/ui.wiki` checkout (page name = file name, links
  between docs rewritten to page names, other repo links become GitHub blob URLs, generated `Home.md` + `_Sidebar.md`,
  fails on a link to a missing doc page) and pushes. Run it locally with `--out=<dir>` to preview.
- **Issue templates** (`.github/ISSUE_TEMPLATE/`): `bug_report.yml` (area, component, version, usage mode, browser,
  runtime, repro/expected/actual), `feature_request.yml` (area, what/why, contract checklist), `config.yml` (blank
  issues off, links to the wiki and to TundraLibs for rAPId runtime bugs) alongside the health report body.

### CI and weekly health (`.github/workflows/`, 2026-09-16)

- **`ci.yml`** on every push: `quality` (fmt check, lint, build, **version-manifest drift**, `deno task check`, JSR
  `publish --dry-run`, `npm pack --dry-run` asserting `dist/ui.{css,js}` are in the tarball), `audit` (high+), and
  `browser` × {deno, node, bun} running the full `test` task with the runner's Chrome; screenshots upload on failure.
- **`health.yml`** weekly (Mon 05:23 UTC) + manual, mirroring TundraLibs': `drift` (deno stable/canary, bun latest, node
  22/24/current — the full suite each), **`rapid-canary`** (`scripts/unpin.ts` rewrites the rAPId/compat pins in
  `deno.json` to `@latest`, drops the lock, re-runs `check` + `test:app` — a breaking rAPId release shows up here, not
  at a consumer's upgrade), `audit` (all severities), and `cdn` (`scripts/check-cdn.ts` fetches the jsDelivr URLs from
  `version.ts` and verifies the sha384 matches — skips while the version is 0.0.0). `close-on-success` closes any open
  `ci-health` issue; `report` creates or comments on one using `.github/ISSUE_TEMPLATE/ci_health.md` as the body (single
  source of truth) with the failing job names and run URL.

## Thinking ahead: rAPId's UI surface will grow

rAPId's own docs describe this contract as intentionally minimal (§0) so that a component library — this one — has
maximum freedom. Expect rAPId to add to it over time (new `data-*` hooks, new `ui:` config fields, new built-in runtime
modules alongside `ui.js`/`live.js`/`history.js`) rather than change what already exists — that's the pattern its
existing `enabled`/`prefer`/`runtimePath`/`live`/`history`/`csrfCookie`/ `swapHeader`/`swapUnless`/`redirectHeader`
config already follows (each one purely additive, boolean/string opt-ins). Practical implications for this library:

- Track `packages/rapid/docs/Rapid-UI.md` in the TundraLibs monorepo as the living source of truth, and re-verify this
  file's claims against it periodically rather than trusting this document to stay accurate forever.
- Design components so a _new_ rAPId runtime feature (another `data-*` attribute, another optional client module) is
  additive to adopt — nothing here should need rework just because rAPId grew a new opt-in capability.
- If this library ever needs a rAPId capability that doesn't exist yet, that's a signal to raise it against rAPId itself
  (feature request / PR), not to route around the gap with private wiring that duplicates what the runtime already
  almost does.
