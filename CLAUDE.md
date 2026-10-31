# theming — agent guide

## What this project is

A standalone HTML + CSS + JS component library (cards, grids, forms, modals, notifications, navigation, typography, …)
that is a **first-class UI layer for [rAPId](https://jsr.io/@tundralibs/rapid)** — usable as plain CSS/JS by anyone, but
built so a rAPId app can drop it in as `ui.core` / `ui.layout` and get every component working with rAPId's
swap/live/history runtime with zero glue code.

This file is the spec for rAPId's UI contract — what a component _must_, _must not_, and _may_ do to work seamlessly
with rAPId. Tooling (bundler, CSS pipeline, package manager, test runner, publish target) is deliberately **not**
specified here; that gets configured separately. Treat every claim below as verified against rAPId's actual source
(`packages/rapid/ui/*.ts` and `packages/rapid/docs/Rapid-UI.md` in the TundraLibs monorepo) as of rAPId 0.4.0 —
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
triggering a fetch+swap programmatically; with the history module loaded it adds
`window.rapid.history.push(url, target, opts?)` (a swap that also pushes the URL — GET only, the region needs an `id`).

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
toast, badge/chip, avatar, breadcrumb, tooltip (CSS-only), progress/spinner, timepicker, datetimepicker, chart
(ApexCharts only — see "Charts" below), consent (analytics consent banner, 2026-10-19).

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

**rAPId is a caret range, and upload progress is handled ahead of its release (2026-09-18).** `deno.json` imports
`jsr:@tundralibs/rapid@^0.2.0` (was an exact `0.2.0`; `package.json` already had `^0.2.0`), so the lock resolves the
newest 0.2.x — 0.2.1 at the time. Bumped to `^0.4.0` the same day (0.4.0 is the release that carries the runtime changes
below), in `deno.json` and `package.json` with all three lockfiles regenerated. Deno's default 24-hour
minimum-dependency-age policy blocked the 20-minute-old release, locally and in CI alike, so `deno.json` sets
`minimumDependencyAge: { age: "P1D", exclude: [jsr/npm @tundralibs/rapid and compat] }` — the window stays for
third-party packages, our own first-party packages are exempt (the CLI flag `--minimum-dependency-age 0` is the one-off
escape). The user then asked for "rAPId ≥ the version specified": `package.json` carries
`npm:@jsr/tundralibs__rapid@>=0.4.0` (npm ranges are free-form), but `deno.json` has to stay `^0.4.0` — Deno's `jsr:`
specifier grammar accepts only `^`, `~`, an exact version or `*`, and rejects `>=0.4.0`, `>=0.4`, `>=0.4.0 <2` and
`0.4.0 - 9` as "Invalid specifier version requirement" (verified with `deno info`). `*` would parse but means any
version, not a floor. The user then chose the caret in `package.json` too, and asked instead for the pin to _follow_
rAPId automatically. **`.github/workflows/rapid-bump.yml`** (daily 06:17 UTC + manual): `scripts/bump-rapid.ts` compares
the `deno.json` pin with JSR's `latest` and, when newer, rewrites both manifests to `^X.Y.Z`; the job regenerates the
lock, runs `deno task test` (the whole thing, Chrome and all) against it, and only when that passes commits to
`deps/rapid-<version>`, opens a `feat(deps): require rAPId ^X.Y.Z` PR with auto-merge (the repo allows auto-merge; the
PAT makes CI run on it; release-please then releases). A failing suite means **no bump**: the run fails, screenshots
upload, and a `ci-health` issue ("rAPId X breaks the suite — pin not bumped", deduplicated) is opened or commented.
**`examples/tests/test-contract.ts`** (`deno task test:contract`, first in `test`): rAPId exports its client scripts as
source strings (`UI_RUNTIME`, `UI_HISTORY`, `UI_LIVE`), so the 24 hooks this library depends on —
`dataset.action/target/swap/method`, `data-load`, the `<body data-*>` config names, `rapid:swapped/error/progress`,
`FormData(form, submitter)`, `window.rapid`/`refresh`, `outer`/`append`, `dataset.push`, `CSS.escape`, `popstate`,
`rapid:push/live`, `livePath` — are asserted to still exist, each naming the file that uses it; a rename fails there in
seconds, not as a browser timeout. The weekly canary in `health.yml` stays as a second net. First real exercise
(2026-09-19, rAPId 0.5.0): the workflow correctly refused to bump — not because 0.5.0 broke anything, but because it
depends on `@tundralibs/ambient` 0.2.9, published the same day, and the age-policy exemption only named rapid and
compat; transitive first-party packages were blocked (issue #13). The rule is now scope-wide: `bump-rapid.ts` fetches
the @tundralibs package list from `api.jsr.io` on every run and rewrites `minimumDependencyAge.exclude` (jsr +
npm-bridge names, sorted) so a new first-party dependency of a future rAPId can never block a bump; the exclude entries
do apply transitively and to package.json-derived npm deps (verified in scratch projects). Lesson from the debugging:
deno.json has THREE `exclude` arrays (`publish`, `fmt`, `minimumDependencyAge`) — edit it by parsing the JSON, never
with a regex on `"exclude"`; a regex replaced `publish.exclude` twice before the real cause showed. rAPId's `main`
(unreleased then) adds `rapid:progress` (`{ url, loaded, total }`, emitted on the swap target while a multipart body
streams over `XMLHttpRequest`; `total` is `0` when unknown), `rapid:request`, its own `aria-busy` on the target and a
one-request-per-target guard. `dropzone.js` handles it now: on `submit` of a `form[data-action]` holding a dropzone with
picked files it renders a `.dropzone__file--pending` row per file (same classes as `DropzoneFile`, indeterminate
`<progress>`), keyed by the form's `data-action` URL; `rapid:progress` with that `url` fills the bars; `rapid:swapped`
drops the memory (the reply replaced the rows); `rapid:error` marks them `--error` with "Upload failed". The catalogue's
`#cat-dz-1` sits in `#cat-dz-form` posting to `routes.upload` (`/fragments/upload` in the app — `ctx.payload.files` is
`{ name, path, type, size }` per file — answering with the `Dropzone` re-rendered; the app declares
`uploads.allowedExtensions`, because rAPId refuses every upload until told otherwise). `test-catalogue.ts` drives the
client side with dispatched events; `test-app.ts` does a real upload (`uploadFile` + submit → done row).
`docs/UI-Recipes.md` is the worked-examples guide (2026-09-18): seven real pages, each as a rAPId route/template and as
the plain HTML it renders — its TypeScript lives in `examples/docs/recipes.ts` (covered by `deno task check`; run it to
render every recipe's HTML), and the guide's HTML blocks are that render, trimmed — keep the two in step when a
component's markup changes. The generated reference pages gained a **Usage** section the same day:
`examples/docs/usage.ts` holds one to three real call sites per component and layout (`render: () => Html`),
`scripts/build-docs.ts` cuts each snippet from that file's own text (`Function.toString()` would give Deno's re-emitted
JavaScript) and prints the render through `examples/docs/pretty-html.ts`; the generator throws when a module has no
entry, so a new component fails `deno task docs` (and the CI drift check) until it has a usage example. Usage examples
must render the same bytes every day: a `DatePicker` without `today` marks the real date as today, and the reference
drifted the morning after it was generated (caught by the first automated rAPId bump PR, #16). Fix a date in every
example that would otherwise read the clock.

**Client-side validation + `PasswordInput` (2026-09-22).** Until now validation was server-only (`RapidFormError` →
`Form({ error })` / `FormField({ error })` / `Input({ invalid })`). `Input`/`Textarea` gained typed constraint props
(`minLength`, `maxLength`, `pattern`, `min`, `max`, `step`, `autocomplete`), `match: "#other"` (a confirm field) and
`messages` (per-rule text → `data-msg-<rule>`, `messageAttrs()`); `Form({ validate: true })` → `data-validate`, handled
by `components/form/form.js`: native-first — the browser's Constraint Validation API is the rule engine (`novalidate` is
set by the script so the bubble never shows), the message goes into the field's `.form-field__error` slot (created if
absent, `aria-invalid` + `aria-describedby` wired, help hidden while an error shows), on first blur then live, and on
submit. The submit veto is a **capture-phase** listener with `stopImmediatePropagation`: rAPId's runtime registers its
bubbling submit listener before ui.js loads, so bubbling would be too late; capture at `document` runs first and stops
the event from ever reaching the runtime, busy.js or dropzone.js. `data-match` is checked with `setCustomValidity`, and
a confirm field is re-checked when the field it matches changes. Hidden controls are skipped — except a proxied one
(`data-validate-proxy`, 2026-10-16: see "Long lists and default search"). `components/password/` (`PasswordInput`) wraps
`Input({ type: "password" })` with a Show/Hide button (`.js-only`, text labels — the icon set has no eye), an optional
four-segment strength bar (`data-strength-level` 0–4 on the root; password.js scores length vs `minlength`, character
classes, repeats, sequences and a 30-entry common list) and `strengthMin`, which password.js enforces through
`setCustomValidity` so form.js reports it like any rule; password.js listens to `input` in the **capture** phase so the
validity is fresh when form.js reads it on the same keystroke. The server must enforce every rule too — the client layer
is feedback, never the gate (docs say so). Same day: **`Input({ type: "password" })` delegates to `PasswordInput`** the
way `type: "date"` delegates to `DatePicker` — the toggle by default; `strength`/`strengthMin`/`reveal` are
password-only props on `Input`; `reveal: false` is the bare control (and what `PasswordInput` itself passes when it
calls `Input`, which is how the two modules import each other without recursing). Every existing `type: "password"` call
site gained the toggle with no other change; the docs and usage examples teach the `Input` form, the separate
`PasswordInput` export lasted one release (0.7.0): the user asked whether it was still needed, and it was not —
`components/password/` is gone, the template is `PasswordField()` inside `input.ts`, its CSS is in `input.css` (class
names `.password*` kept) and its script is `input.js`; `PasswordStrength`/`PasswordLabels` (`passwordLabels` prop) are
exported from `input`.

**The forms batch (2026-09-22, same day, one PR).** Everything below is progressive (native attributes and plain fields
first, script on top) and lives in `components/input/input.{ts,css,js}` unless said otherwise. `Input` is now a
dispatcher over one `nativeInput()`; every `type` still renders natively, and some carry sugar: `type: "email"` +
`domains` → local part + fixed `@` + a `Select` (or fixed text) named `<name>-domain`; `type: "tel"` + `countries` →
country-code `Select` (`<name>-country`) + number; `type: "url"` + `scheme` → fixed scheme addon + hidden
`<name>-scheme`. Each posts **two fields** — the deliberate choice over a script-composed hidden field, so no-JS and JS
submit the same thing — and `shared/compose.ts` (`emailFrom`/`telFrom`/`urlFrom`, `@tundralibs/ui/shared/compose`) joins
them in a handler, passing a whole value through untouched. `prefix`/`suffix` render an `InputGroup`; `counter` (+
`maxLength`) renders `Counter()` after the control (`[data-counter-for]`, input.js keeps it current, warning from 90%);
`type: "search"` gets a clear button by default (`[data-input-clear-button]`, fires `input` so `filter.js` follows;
`clearable: false`); `validateAction` → `data-validate-action`, form.js POSTs `name=value` urlencoded with the CSRF
header from `<body data-*>` on blur once native rules pass, shows a non-empty text reply and pins it with
`setCustomValidity` until the value changes (aborts a stale request, `aria-busy` while pending). `Textarea` gained
`counter`, `autosize` (`field-sizing: content`, scrollHeight fallback via CSSOM) and `validateAction`. `Form({ guard })`
→ `data-guard`: form.js marks `data-dirty` on input/change, `beforeunload` asks while a dirty guarded form exists, a
valid submit or reset clears it. Password: the toggle is now the `eye`/`eyeOff` icon with sr-only text
(`[data-icon-show]` / `[data-icon-hide]`), and a Caps Lock notice (`[data-password-caps]`, `getModifierState` on
keydown/keyup) shows while it is on. **`CardFields`** (`components/card-fields/`): four linked `FormField`s
(`<name>-number/-expiry/-name/
-cvc`, `autocomplete="cc-*"`, `inputmode="numeric"`), `fields` picks the parts (number
always), `required` boolean or per part; card-fields.js groups the number (4-4-4-4, Amex 4-6-5), writes `data-brand` on
the root and the brand label in the addon, sets the CVC to 3/4 digits, inserts the expiry slash and refuses an
out-of-range month or a past date, and with `data-luhn` refuses a complete number that fails the checksum — custom
validities, so form.js reports them; the number and CVC are never echoed (`values` takes name/expiry only). The docs
state the PCI consequence plainly. Icons: 27 primitive-shape icons added (`eye`, `eyeOff`, `lock`, `creditCard`,
`globe`, `phone`, `xCircle`, `checkCircle`, `chevronCircle`, `clock`, `trash`, `copy`, `download`, `externalLink`,
`home`, `logout`, `refresh`, `star`, `minus`, `menu`, `image`, `file`, `send`, `help`, `shield`, `tag`, `lockOpen`) —
arcs are fine, cubic curves are not; the `Collapsible` marker is now `chevronDown` in a circled `.collapsible__icon`
instead of a text triangle. **Collapsed sidebar flyouts** (`shared/js/collapse-sidebar.js`): in the icon rail a parent's
sublist opened by toggle.js is shown as a fixed panel beside the rail (`.menu__sublist--flyout`, titled with the
parent's label, positioned via CSSOM after toggle.js ran — toggle.js registers later, so the handler defers one tick),
closed on outside click, Escape, scroll, resize or expanding the sidebar; before this, clicking a parent in the rail
showed nothing. Static demo: the catalogue's "Show toast" now uses `data-toast-open` with a `<template>` when routes are
inert (the app keeps the server route) — it had been a dead `data-action="#"` button. Two things the user caught by
looking: a grouped control (`.input-group > .input`) had `height: auto`, so every composite field measured 27px against
a plain input's 36 — it is now `calc(var(--control-height-<size>) - 2 * var(--border-width))`, the group's own border
making up the difference; and `type="search"` showed two clear buttons, ours and the browser's, so
`::-webkit-search-cancel-button` is suppressed inside `.input-clear`. Also learned here: the `v` flag is strict inside a
character class — `(`, `)` and `/` need escaping as well as `-` (two patterns shipped broken and only the app suite's
console-error capture caught them), and form.js's async check must send the swap header (`rapid-swap`) or rAPId answers
with the whole document, and must take `textContent` of the fragment rather than its markup. Flags, asked for next: the
library **ships no flag artwork** and should not — multicolour detail against an icon set of single-colour primitives,
hundreds of kilobytes against a ~150 KB bundle, emoji flags render as two letters on Windows (and emoji were removed
from this project once already), and flags change and are disputed, which is a data product's job. What ships is the
hook: `SelectOption.lead` (an `Html` slot the Combobox already had and `Select` was dropping) renders before the label
in the list and, cloned by select.js on every change, beside the value in the closed field; `CountryCode.flag` maps to
it. `examples/shared/flags.ts` draws five flags by hand from rects and a circle to demo the documented `raw()` recipe —
examples are not published, so that stays out of the library. `docs/UI-Recipes.md` §8 "An international contact form" is
the worked example for the whole composite-field family (email domains, tel countries + flags, url scheme, a `Select`
with flag leads, the handler joining the parts with `*From`), code in `examples/docs/recipes.ts` like every other
recipe.

**TimePicker, DateTimePicker, and the stuck Select tick (2026-09-30, asked for by the Brevily console).**
`components/timepicker/` (`TimePicker`): two typeable `role="spinbutton"` segments (hours carries `id`, minutes
`<id>-minute`) plus a slot listbox (`<id>-list`, every `step` minutes, default 15, inside `min`–`max`) and an optional
`zone` chip (text only). Progressive like `Otp`: the markup's value input is a native `<input type="time">` with `name`,
`min`, `max`, `required` (what no-JS shows and posts); timepicker.js flips it to `type="hidden"` — a `display: none`
control with constraints would block a submit with no visible message — and moves the constraints to a custom validity
on the **hours** segment (`data-msg-required|incomplete|min|max`). Two form.js hooks came with it: `data-validate-skip`
(the minutes segment: form.js clears a field's one error slot whenever _any_ control in it re-checks valid, so one
composite control needs one reporting part) and `[data-validate-group]` (focus moving between a control's parts is not a
blur; the picker reports its own blur by dispatching `change` on the hours segment). The segment `input` listener is
capture-phase, like password.js, so validity is fresh before form.js reads it. Keyboard: digits fill and jump,
`:`/`.`/space/→ go to minutes, ↑/↓ step, PageUp/PageDown by `step`, Home/End, Backspace on empty minutes walks back,
paste `9:30`/`0930`; Alt+↓ or F4 opens the list with focus _in_ the listbox (`aria-activedescendant`), typed digits jump
(`9` → 09:00, `14` → 14:00), Enter/Space pick, Escape returns focus. `Input({ type: "time" })` now delegates to it (the
native `step` in seconds becomes minutes). `components/datetimepicker/` (`DateTimePicker`): a client-mode `DatePicker`
(`<id>-date`, `<name>-date`) beside a `TimePicker` (`<id>-time`, `<name>-time`), plus a `data-datetime-value` hidden
input named `name` that is rendered **disabled** and enabled by the script, so a no-JS post never carries a stale whole
value. datetimepicker.js writes `YYYY-MM-DDTHH:MM:00Z` on every part `change`, moves the time's bounds on the first/last
allowed day, and reports a missing half via `data-timepicker-error` (wrapper message first). `local: true` converts the
UTC-rendered value/bounds into the browser's zone on init and names it in the chip (`data-datetimepicker-zone="auto"`,
`Intl` short name). Presets are server-computed instants (`dateTimePresets(now)`); `dateTimeFrom(body, name)` in
`shared/compose` reads the whole value or joins the no-JS parts as UTC. Wrapper hooks: `timepicker:refresh` and
`datepicker:refresh` (both take an optional `detail.value`); datepicker.js gained `retarget()` so a refresh that jumps
months keeps its nav buttons right. datetimepicker.js inits in a `queueMicrotask` because its file sorts _before_
datepicker/timepicker in the bundle and their listeners must exist first. **The Select bug**: `ComboboxList` rendered
the `.combobox__check` icon only into the option selected at render time, and combobox.js moved `aria-selected` but not
the icon — so after a pick the tick stayed on the first option (Select and single/multi Combobox alike). Every option
now carries the icon and CSS shows it off `[aria-selected="true"]`. **Floating panels in a modal**: `dialog:modal` has
UA `overflow: auto`, which clipped the time list / date panel / select list at the dialog's edge;
`.modal:has(.combobox--open, .datepicker--open, .timepicker--open) { overflow: visible }` lets an open panel spill out
(no `:has()` → the old clip, not a break). Also learned: a selector list containing `:has()` is dropped whole by a
browser that lacks it — give `:has()` its own rule. **No-JS date half (0.10.1, same day, from the console):** a
client-mode `DatePicker` (every `Input({ type: "date" })` and the DateTimePicker's date) rendered its value as
`type="hidden"`, so a no-JS page could not change it. Client mode now renders native
`<input type="date" class="input datepicker__native">` fields (`min`/`max`/`disabled` carried) that datepicker.js flips
to hidden on init and after swaps, and `html:not(.js) .datepicker--client` hides the trigger and calendar; server mode
keeps its hidden inputs (its links work without JS). The catalogue's modal group has a "form in a modal" case (Select +
DateTimePicker) and `test-catalogue.ts` drives all of it, including a no-JS pass and an `Asia/Kolkata` local-mode pass.

**Data-table actions review (2026-09-18)** — a probe that clicked every table control found that selection and the
row-menu dropdowns worked but nothing else did: every bulk button was a `type="button"` outside any form (the checkboxes
carried `name="selected"` with nothing to submit through), the shared invoices kebab and the billing "PDF" were dead
buttons, the catalogue's toolbar search boxes filtered nothing, and a sort swap silently dropped the selection. Fixes:
`DataTable.bulkAction` wraps the bulk bar and rows (not the toolbar/footer — Enter in a search box must never submit) in
a `<form method="post" data-action data-target="#id" data-swap="outer">`; bulk buttons are submits with
`name="op" value="…"` (rAPId posts the submitter, `FormData(form, submitter)`); the app's `/components/data/invoices`
route applies `op=assign|delete` to per-process state, re-renders the fragment on a swap and redirects (PRG) without JS;
`data-table.js` remembers the checked keys per table id and re-applies them after a GET swap (sort, page, back), while a
POST reply's own selection wins; `dropdown.js` re-places a fixed panel on scroll while its trigger is still inside its
clipper instead of closing on any scroll (the reset's `html:focus-within` smooth scroll was still running when a
keyboard user's Enter opened the menu, and the next scroll frame closed it). Static pages post to an inert `?bulk` like
their sort links. Same day, the user noticed the bulk bar pushed the rows down when it appeared: it is now a
**contextual action bar** — inside `.data-table__scroll`, `position: sticky; top: 0`, the header row's height with a
matching negative `margin-block-end` so it takes no flow space, `z-index` above the sticky `th`s;
`th.data-table__select` is sticky at the inline start and stacked above the bar so select-all stays usable,
`td.data-table__select` is sticky too (rows stay selectable after a horizontal scroll) and a pinned column offsets by
`--data-table-select-width`. `--data-table-header-height` / `--data-table-select-width` are the two tokens that keep
bar, header and column aligned; `test-catalogue.ts` asserts the first row's top does not move when a row is selected.
Consequence, accepted: while rows are selected the sort links are under the bar (clear the selection to sort by pointer;
a link still works from the keyboard), which is why `test-app.ts` activates the sort link with a DOM `click()` when it
checks that a selection survives a sort swap — a pointer click at those coordinates hits the bar. `test-catalogue.ts`,
`test-app.ts` and `test-admin.ts` pin all of it — the lesson is that a suite which asserts a bar appears is not a suite
which asserts the buttons in it do anything.

**`RowActions` — row actions as an in-row strip (2026-09-18, prototype for comparison).** The user asked for an
alternative to a floating dropdown per row: `RowActions({ id, label, items })` renders the kebab plus a hidden
`.data-table__row-actions` strip — absolutely positioned inside the (now sticky-at-end) actions cell, the row's own
height, anchored at the row's end and growing leftwards over the row's values, labelled buttons, danger item last after
a separator, a close button. `data-table.js` opens one at a time, moves focus in, closes on Escape / close / outside
click with focus back on the kebab, and caps the strip's `max-width` to the scroll box's `clientWidth` minus the sticky
selection/pinned cells through the CSSOM (at 375px it otherwise ran past the box's start, or hid its first buttons under
the pinned id). `td.data-table__select` and the pinned cell are `z-index: 2` so the row's identity stays readable under
an open strip. Same idiom as the bulk bar: one row → row strip, many rows → header strip. Adopted the same day: the
per-row `Dropdown` menus are gone from every data table (shared invoices, catalogue, admin `rowKebab`, the docs snippet)
and `RowActions` is the row-actions idiom. The dropdown had also started to disappear behind the next rows once
`td.data-table__actions` became sticky with a `z-index` (a stacking context traps a fixed panel inside it); the cell now
has no `z-index`, so a custom `rowActions` Html that floats still works. The strip slides in from the row's end
(`@keyframes` on `clip-path: inset(0 0 0 100%) → inset(0)`, `--transition-base`; a `transform` would grow the scroll
box's scrollable overflow for the length of the animation) and out again (`.is-closing`, hidden on `animationend`; when
reduced motion turns the animation off the script hides it at once, since `animationend` never comes) — tests wait for
the strip to be hidden rather than sleeping past the animation.

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
  5ch column. `combobox.js` dispatches `combobox:pick` on a single pick — that is the wrapper hook. (2026-10-02) A click
  on the read-only input, or its `<label for>`, **toggles** the list like a native select (it was open-only, so the
  caret was the one way to close it); a Select does not open on focus (a dialog's autofocus would unfold it and turn the
  first click into a close); a searchable combobox still opens on focus and stays open on a click into its input. Focus
  moving to another focusable element closes a combobox list or a floating date picker — but not focus moving to nothing
  or to a focusable _ancestor_ (a `<dialog>`): a press on a non-focusable option does exactly that, and closing there
  would hide the list before the click lands.
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

**Console gaps round (2026-10-04)** — a review of the Brevily console
(`/Volumes/Coding/Psionic/url-shortner/apps/console`, the library's main downstream app) found workarounds that were
really missing props; each became library surface, catalogued and asserted in `test-catalogue.ts` (`consoleGaps()`):

- **DataTable**: `DataTableColumn.headAttrs` / `cellAttrs` (fixed or `(row) => Attrs`, `class` merges — the hook for a
  CSS-only card layout on a phone, which the console had done by regex-rewriting the rendered table);
  `rowSelectable(row)` (an opted-out row keeps an empty cell; no selectable row → no column, no bar); `selectAll`
  (`{ total, fields, … }` → hidden `all=1` + the filter, "Select all N" / "Clear selection" in the bar, dropped again
  when a row is unticked); `countLabels` (`{n}`). `RowAction.post` (+ `fields`, `target` for a swap, `confirm`) renders
  its own one-button POST form with the CSRF field (`RowActionsProps.csrfToken`); a destructive row action is never a
  GET.
- **Confirmation**: `ConfirmModal()` (in `modal.ts`; the core template renders one per page unless
  `confirmDialog: false`) and a kit-wide `[data-confirm]` in `modal.js`: a capture-phase click listener stops the click
  before the runtime / busy.js / form scripts, asks, and on Confirm replays `trigger.click()` — same submitter, same
  swap. Danger tone from `btn--danger` or `data-confirm-tone`, OK label from `data-confirm-label`. A submit in an
  invalid `form[data-validate]` is not asked about (form.js reports first). Two `data-confirm-dialog`s on a page is a
  bug: the first wins (the catalogue keeps its sample in a `<template>`).
- **`Modal({ open })`** → `data-modal-autoopen`, opened on load and after `rapid:swapped` (once per element).
- **Select's visible control is a `<button role="combobox">`** (APG select-only), not a read-only `<input>`: a read-only
  text input still counts as a field that blocks implicit submission, so a search box beside a Select never submitted on
  Enter. combobox.js keys off `[role=combobox]` and `selectOnly(el)` (a button or a read-only input: no open on focus,
  click toggles, Space picks while open); the label lives in `[data-select-text]`; `aria-label` from `attrs` names the
  button too. Tests read `textContent`, not `.value`.
- **`Combobox({ hints: false })`** → `.combobox--no-hints` (CSS-hidden, so a swapped `ComboboxList` needs no flag).
- **Core template**: rAPId's `htmlDocument` has no hook for `<html>`/`<body>` attributes or the viewport, so
  `createCoreTemplate` now writes the document itself (same escaping, same `canonical`/`og:`/meta rules) and takes
  `viewport`, `htmlAttrs`, `bodyAttrs` (fixed or `(data, view) => Attrs`). A server-set `data-theme` on `<html>` now
  **wins** over the browser's stored choice in `theme-toggle.js` (and is stored), and a toggle dispatches `theme:change`
  (`detail.theme`) for the app to save — the console had a `<meta>` + localStorage dance for this.
- **Form**: `csrfToken` / `csrfField` (default `_csrf`, what rAPId's `csrf()` reads without the header) and
  `CsrfField()` for hand-built forms; `autosubmit` → `shared/js/autosubmit.js` (a choice submits via `requestSubmit()`,
  typing never does; a searchable Combobox submits on `combobox:pick`).
- **Copy**: `CopyButton()` + `shared/js/copy.js` (`[data-copy]` / `[data-copy-target]`, `data-copied` for 2 s, label
  swap in CSS, announced via the toast region).
- **Smaller slots**: `Segmented` option `label` may be `Html`, plus `count` / `alert`; `Empty.icon` takes `Html`;
  `PageHeader({ level: 2, badge })`; `TabLinks()` (link tabs, `aria-current`, `icon`/`count`/`badge`; tabs.js ignores
  `a.tabs__tab`); `Wizard` without `content` (`.wizard--steps-only`); `Alert({ actions })`; `Timeline` items `icon` /
  `tone` (`TimelineTone`) / `text`; `Breadcrumb({ collapse })` (container query on the nav at 480px folds the middle
  crumbs into a `<details>` "…" menu — no script); `DateTimePicker({ clearable })`; a `more` (horizontal dots) icon.
- **Bug fixed on the way, then properly (second pass, same day)**: a component that built
  `{ ...props.attrs, own: maybe }` let any own value that was `undefined` erase what the caller passed in `attrs` —
  `attrs.id` with no `id` prop first, then the console found `RowAction.attrs["data-confirm"]` dropped when `confirm`
  was unset. `mergeAttrs(base, own)` (`shared/attrs.ts`) is the fix: own values win only when defined. Every component
  and layout uses it; **never spread `attrs` into an object that also sets keys a prop may leave undefined** — call
  `mergeAttrs` instead.
- **Follow-up asks from the console (second pass)**: Segmented / TabLinks `count` takes `Html` plus `countTitle` (the
  exact figure behind a compact one); `Empty` `text` takes `Html` and a `details` slot sits between text and actions;
  `Wizard` marks the active step `aria-current="step"`, reads done steps as "Done: …" (`doneLabel`), names the list
  (`label`) and takes `listAttrs`; `Timeline` and each `TimelineItem` take `attrs`; `CopyButton({ label: false })` is
  icon-only (`ariaLabel` names it). `TabLinks({ listAttrs })` (attributes on the `.tabs__list` strip — the console's
  sideways-scroll class) followed once the console had adopted the rest. `Alert({ role })` came the same way: the role
  now defaults by variant — `alert` (interrupts) for warning/danger, `status` (polite) for neutral/success/info — and
  `"none"` drops it; a "Saved." notice used to interrupt a screen reader. Its cleanup batches then surfaced: **a second
  `class` attribute** wherever a component wrote `class="…" ${renderAttrs(attrs)}` (Avatar, AvatarGroup, Breadcrumb,
  ButtonGroup, Collapsible/Accordion, Choice, InputGroup, Form, Navbar, Progress/Spinner, Pagination links, Select's
  native control, Textarea, Toast action) — the parser drops the caller's class; all now use `classAttrs`, and
  `test-catalogue.ts` fails any page with a tag carrying two `class` attributes. Plus `Alert({ role: "note" })`,
  `Avatar` `initials` as Html, `Combobox({ loadOnFocus })` (first focus fetches once with an empty query), segmented.js
  re-measures through a `ResizeObserver` (a control in a dialog closed at load measured 0 wide), and `DataTable`
  `rowAttrs` + `rowGroup` (full-width `.data-table__group` heading rows — a `<th>`, so it undoes the sticky header-cell
  styling). Not taken: a measuring `Breadcrumb` (the console folds only when the trail is actually cut, at any width;
  the library's `collapse` is a 480px container query — different behaviour, the console keeps its own).

**rAPId 0.9 `layoutData` (2026-10-05).** rAPId used to hand a layout only `{ body, title }`, which is why the console
regex-read its own rendered page for the breadcrumb and phone bar. The theming side drafted the request, TundraLibs
shipped it (#778, rapid 0.9.0): a route's object `template` takes `layoutData` (a record or a function of the content),
and the module layout receives it as `page` (`RapidLayoutData`; never the core, never on a swap). `asRapidLayout<P>` now
types the frame's `data` as `LayoutData<P>` (`page?: P`, default `LayoutPage`) and returns
`RapidTemplate<RapidLayoutData>`; `PageCrumbs(page)` draws `page.crumbs` (a collapsing `Breadcrumb` in
`.layout__crumbs`); `createLayoutTemplate` and the example app's shell use it, and `test-app.ts` checks the record and
function forms, a route without it, and that a swap carries none.

**rAPId compose support + Alert slots (2026-10-05).** rAPId 0.9's `compose` renders a deferred part as an EMPTY
`<div data-part data-status="202" data-load data-compose aria-busy="true">` (utils/composer.ts `wrap`), fetched in one
`?parts=a,b` request whose `[data-part]` elements replace the placeholders by name; a denied/failed part is the app's
error template inside that wrapper. The library styles both without markup of its own: skeleton.css draws the empty
placeholder as a shimmer block of `--part-min-height` (token, 6rem) and dims a retrying (504) one; error-page.css
compacts `[data-part] > .error-page`; `ErrorTemplate` renders a compact inline `Empty` when the payload carries `part`
(asked of TundraLibs — rapid passes no part name yet, so until then the CSS does the work and the `<h1>` stays).
`test-contract.ts` asserts the runtime's `dataset.compose` / `[data-part="` / `aria-busy`; `examples/app/parts.ts` is a
decorated `RapidModule` (TC39 decorators run under Deno, Node via tsx and Bun) mounted with `app.modules()`, and
`test-app.ts` checks first paint, the single batched fetch, the settled parts and the compact error. Same day, `Alert`
gained `aside` (beside the body: a badge, a link), `bodyAttrs` and `textTag: "p"` — the shapes the console's last
hand-written alerts needed.

**Inline components render tight (0.16.1).** `deno fmt` reflows a long
`html\`…\``onto new lines, so a component
whose template starts on a new line emits a leading`\n `and trailing`\n
`— a visible gap wherever it sits
inline (avatars in a stack, an icon in a label, a button beside text; the console's`bareAvatar`trimmed it by hand).
Inline components return through`inline()`(`shared/inline.ts`:`raw(render(markup).trim())`, already-rendered Html
only): Avatar, AvatarGroup, Button (+ CopyButton), ButtonGroup, Tooltip, Progress, Spinner, Switch, Icon.`test-catalogue.ts`renders each and fails on surrounding whitespace — add a new inline component to that list.
Tooltip also merged its class the old way (second`class`attribute); fixed. On a phone (< 576px) an`Alert`aside that
holds an action (`a`,`button`,`form`) wraps under the text, the close button staying on the first line (`:has()`,
in rules of its own). 0.17.1 fixed that rule: the body kept its`auto`basis, so a long message
wrapped onto its own line under the icon; there the body is`flex:
1 1
0`and the aside is indented by`--alert-aside-indent`(0.18.1: set to`--alert-icon-size`+ gap only on an alert with an`.alert__icon`element; a
theme drawing a`::before`icon with`icon:
false` sets the indent on its variants — 0.18.0 tied the indent to the icon element, so the token did nothing there) so
the action lines up with the text (the console found it at 390; the catalogue now checks a long message).

**Long lists and default search (2026-10-16).** A Select with 418 options opened a 14,840px list and a 40-item Dropdown
a 1,714px panel — nothing capped either. `--dropdown-max-height` (`min(20rem, 60vh)`, tokens/default.css) now caps
`.combobox__list` (which scrolls, its hints bar sticky at the bottom) and `.dropdown__panel` (a flex column whose
`.dropdown__body` scrolls). The user then asked that **dropdowns be searchable by default**: `Select({ searchable })`
and `Dropdown({ searchable })` default to true (`searchPlaceholder`, `searchLabel`, `emptyText` word them). A Select's
popup is now `#<id>-list.combobox__list--popup` (what opens/closes — the id tests and the console use is unchanged)
holding a `.combobox__search` box and `#<id>-listbox.combobox__options[role=listbox]` (the button's `aria-controls`);
combobox.js filters locally off `[data-combobox-search]`, opens a select on its pick (highlighted, scrolled into view),
moves focus into the box (not on a touch tap — the phone keyboard would cover the list), highlights the first match as
you type so Enter takes it, mirrors `aria-activedescendant` onto the box, and returns focus to the button on close;
select.js sends a printable key on the button into the box (native type-ahead stays for `searchable: false`). Dropdown
renders `.dropdown__search` + `.dropdown__body` + `[data-dropdown-empty]`; dropdown.js filters `[data-dropdown-item]`s
else the body's `<li>`s by their own label (a parent stays while a child matches and its sublist opens for the search,
restored after), hides the box when there is nothing to filter, ↓/↑ walk the visible items, Enter in the box takes the
first non-toggle match, close clears it. Both boxes carry `form="<id>-search-scope"` (no such form): no form owner, so
the box is not a field that blocks implicit submission — the autosubmit "Enter beside a Select submits" check proves it.
The admin notifications Dropdown passes `searchable: false` (a feed, not choices). Asked next: a required Select with
nothing picked was broken in both kinds of form — the user found it by asking what a no-match search does in a required
dropdown. The native `<select>` is `display: none`, so a plain form's browser check failed to focus it and blocked the
submit with only a console error ("not focusable"), and form.js skipped hidden controls, so `Form({ validate })` posted
it empty. Now the native control carries `data-validate-proxy="#<button id>"` and the `.select` wrapper is a
`[data-validate-group]`: form.js checks a proxied control even though hidden, reports on the stand-in
(aria-invalid/describedby/focus on the button, `.combobox--invalid` on the UI root, the error slot in the control's own
field), treats focus leaving the group as its blur, and in a plain form takes over the control's `invalid` event
(preventDefault, render, focus it when it is the form's first problem — the submit stays blocked) and re-checks it on
`change`. `Select({ requiredMessage })` → `data-msg-required`. The search boxes are `data-validate-skip` (otherwise
form.js "validated" them valid and wiped the Select's error slot). The user asked to check multi select too: `Combobox`
had no `required` at all — it has `required` + `requiredMessage` now (single: a pick, typed text alone never counts;
multi: at least one token); combobox.js holds the message in `data-combobox-required` and keeps it as a custom validity
on the input, updated on pick / token add / remove / an un-picking keystroke and announced with `change`, so a plain
form gets the browser's bubble and form.js reports it like any rule. A press on an open list's option blurs the field
before the pick lands, so form.js skips the blur check then (`picking`). Harness lesson: two more catalogue cases above
a test lengthened a `scrollIntoView` enough that the `html:focus-within` smooth scroll was still running at the click —
scroll with `behavior: "instant"` before a click.

**Combobox for large sets (2026-10-27).** A multi list is `aria-multiselectable`. `hideSelected` (multi default):
combobox.js tucks picked options away (`data-combobox-tucked`, CSS `display: none` — kept apart from `hidden`, which is
the search filter's) on each open and each search, never on the pick itself, so the rows under the pointer do not move;
a search finding only picks shows the `[data-combobox-note]` "Already selected." Re-picking a ticked row stays a no-op
(the token's × removes). `openOn: "type"` + `minChars` (default 1): shut on focus/click/arrows until enough is typed,
with an action the list opens only once the fragment landed (`rapid.swap` resolves `false` when a newer keystroke
aborted it — skip then), a pick clears the text and shuts it; `caret` defaults to `false` there. After every server swap
the picks are re-applied to the new rows (`markPicks` — the route only saw `q`, so ticks used to vanish).
`ComboboxList({ total, moreText })` ends a capped page with `.combobox__more` and pins the hints count
(`data-combobox-total`, which `refresh()` leaves alone); `selectedOptions` labels picks the page does not hold.
Scroll-to-load-more pages were discussed and deferred until a screen needs browsing rather than searching.

**Outsmart rebuild + Brevily asks (2026-10-19, issues #63–#72, one PR).** Found rebuilding the Outsmart Markets design
on 0.19.0 and re-checked against 0.20.0 (none had been fixed). What changed, and the rules that fell out of it:

- **Page-level rules are unlayered** (`styles/page.css`, imported without `layer()`):
  `html { font-family; line-height }`,
  `body { margin; min-height; font-family: inherit; font-size; line-height; color; background }`. A host that injects
  unlayered page defaults (claude.ai artifacts wrap pages in `body{font:14px …;color:#000;
  background:#fff}`) beat
  every layered rule — black text on dark cards. Plain `html`/`body` selectors on purpose: equal specificity with the
  host, so the later sheet wins, and a theme's `body {…}` still overrides. Do not move them back into a layer, and do
  not raise their specificity (a theme would lose). `color-scheme` follows the palette: the light default and the
  system-preference case are `:where()` (zero specificity, so a light-only theme's `:root { color-scheme: light }` and a
  host's win), an explicit `data-theme` / `data-theme-default` outranks both.
- **`data-theme-default` on `<html>`** is the site's default for someone who has not chosen: it replaces the system
  preference, below an explicit `data-theme`. The tokens' two dark blocks carry it
  (`:root:not([data-theme="light"])
  :not([data-theme-default="light"])` in the media block;
  `:root[data-theme="dark"],
  :root[data-theme-default="dark"]:not([data-theme="light"])`), so do page.css's
  `color-scheme`, theme-toggle.js (current = theme ‖ default ‖ system; the default is never stored) and chart.js's
  `mode()`. The four light-default example themes use the same selectors; Console sets `color-scheme` itself. A theme's
  dark blocks must copy them.
- **InputIcon + search**: `.input-icon__glyph` has `z-index: 1` — a later positioned sibling (`.input-clear`) painted
  over it — and `.input-icon > .input-clear` fills the row. InputIcon merges `attrs.class` (it wrote a second `class`).
- **Segmented** is `width: max-content; max-width: 100%; overflow-x: auto` (no visible scrollbar): as wide as its
  options, never wider than its container. The thumb is absolutely positioned inside the scroll box, so segmented.js
  adds `scrollLeft` to its measurement (RTL: scrollLeft runs negative) and scrolls the checked option into view on load
  and change — by setting `scrollLeft`, never `scrollIntoView`, which would move the page. `--block` fills again.
- **StackedLayout**: every content child is `inline-size: 100%` (a flex column does not stretch a child with auto inline
  margins, so `max-width + margin-inline: auto` shrank to its content); `width: "bleed"` drops the column's padding and
  gap (and the ≥1400 cap). **`subheader`** on every layout with a header except Focus, through `layouts/header.ts`
  `frameHeader()` (internal, not exported): `.layout__header--sub` wraps, the navbar takes a 0 basis so it is never the
  item that wraps, `.layout__subheader` is `flex: 1 0 100%; min-width: 0; overflow-x: auto` with `data-dropdown-clip`.
  Without a subheader the header markup is unchanged. `.navbar__link` is `nowrap` while the bar is horizontal.
- **Collapsible**: `.collapsible__heading` resets `font`, `letter-spacing`, `color` to inherit — the global `h3` rules
  reached the trigger through its `font: inherit`.
- **Chart options are JSON**, so functions are dropped: `Chart` warns once per id+path on the server. `format`/`xFormat`
  (`ChartFormat`: `number`, `integer`, `compact`, `percent`, `currency:XXX`, `unit:<intl unit>`, or
  `{ intl, prefix, suffix }`) go out as `data-chart-format` and chart.js builds `Intl.NumberFormat` formatters
  (`<html
  lang>`); non-numbers pass through (a horizontal bar's category axis). Value format → y labels (x on
  horizontal bars), tooltip, data labels; circular charts → tooltip + donut value only. The value axis always formats as
  `number` (the engine printed `16000.0000000000`). Line/area/rangeArea with more categories than fit get `tickAmount` +
  `rotate: 0` (computed from the element's width); `trim` turned labels into dots and bars ignore `tickAmount`, so
  neither is used.
- **Slider `showValue`** renders the `<output>` without a label (for a FormField); **Navbar `menuActions`** go into the
  phone menu (hidden ≥ 768) and pair with **`.hide-md`** (< 768) on the twin in `actions`; the menu toggle renders for
  `menuActions` alone. **SidebarLayout** prints its sidebar static, full height; full-page screenshots are a docs note.
- **`Switch({ labels: { on, off } })`**: both words rendered, `.switch__input:checked ~ * .switch__state--off` /
  `:not(:checked) ~ * …--on` hide the other — no script. Alone the word is the label; beside `label` it is an
  `aria-hidden` echo.
- **`ConsentBanner`** (`components/consent/`, `createCoreTemplate({ consent })`): rendered `hidden`; consent.js shows it
  with no stored choice (`data-consent-key`, default `ui-consent`, values `granted`/`denied`, in-memory fallback without
  storage), appends `data-consent-loaders` in order on Accept and on later visits (attrs copied, `on*` refused, the
  bundle script's nonce copied), and on Reject calls gtag/clarity consent and expires `data-consent-cookies` on the host
  and each parent domain. `[data-consent-open]` reopens with focus on the first button and returns focus after; Escape
  closes only a reopened banner. Same button for Accept and Reject; `z-index: var(--z-toast)` and rendered after the
  toast region so no toast covers Reject. `consent:change` on every choice. Catalogue case id is `cat-consent-banner` —
  **`cat-<component>` is the catalogue's own section id**, so a case element named that collides (the first probe
  "found" a banner that would not hide; it was the section). Cookie expiry is asserted in `test-app.ts` (file:// has no
  cookies); the loader is `consentSampleScript` (`demo/consent-sample.js`, app route `/consent-sample.js`,
  `DemoRoutes.consentLoader`).

`test-catalogue.ts` `outsmartFixes()` pins all of it (host defaults injected ahead of the bundle, data-theme-default in
CSS and on the toggle's first click, glyph hit-test, Segmented at 375 incl. thumb alignment after scrolling picks,
accordion type, every chart format's rendered labels and no float tails anywhere, menuActions at 375/1280, switch words,
the consent lifecycle across seeded storage); `test-layouts.ts` checks the stacked subheader row, a centred probe
wrapper and `bleed` at every band; each was verified to fail with its fix removed from `dist/ui.css`.

The console's regex rewrites and scripts read kit names directly (`data-table__row`, `data-row-key`, `data-select-row`,
`page-header__title`, `--segmented-x/-w`): grep it before renaming one.

**The demo site (2026-10-29) — rebuilt from scratch; the sidebar is the only navigation.** The user asked for the demo
pages to be redone: every capability covered, navigation by a collapsible sidebar alone, grouped into sub-menus. The old
builders (`build-catalogue.ts`, `build-layouts.ts`, `build-theme-builder.ts`, one page per catalogue group with a
navbar, breadcrumbs, an "On this page" dropdown, an inline link index and a ⌘K jump palette, plus a separate layouts
index with its own navbar) are gone. `examples/pages/build-demo.ts` (`deno task build:site`, first half of
`build:demos`) writes one site:

- **Map** — `examples/pages/site/nav.ts` is the whole information architecture: `COMPONENTS` (label, icon, one-line
  blurb per component) and `COMPONENT_TREE` (eight groups → sections → components: Forms › Fields / Choices / Pickers /
  Form layout, Data › Tables / Display / Loading & empty, Charts (a one-component group renders as a plain link),
  Structure, Navigation, Actions, Feedback, Marketing & media), plus `FOUNDATIONS`, `LAYOUT_INFO`, `RAPID_PAGES`,
  `ADMIN_PAGES`. `siteMenu(path, base)` renders it with the current leaf `aria-current` and every group above it open.
  The build throws when a catalogued component is missing from the tree, listed twice, or unknown — a new component
  needs a line here as well as its catalogue entry.
- **Chrome** — `site/chrome.ts` `sitePage(meta, content)`: a `SidebarLayout` whose collapsible `Sidebar` (rail + flyouts
  on desktop, drawer on phones) is the navigation; the header holds **no links** — a plain-text context line ("Forms ·
  Choices"), a theme `Select` (Base / Console / Ledger / Portal / Sunset — swaps `#theme-css`), a density `Select` (sets
  `data-density` on `<html>`), and the dark toggle. Theme and density persist in `localStorage` (`site-theme`,
  `site-density`); every page carries `ToastRegion` + `ConfirmModal`; ApexCharts loads only where a page draws a chart.
- **Pages** — `index.html` (overview: stats, quick start, what the sidebar holds, principles);
  `foundations/{tokens,typography,icons,utilities,motion,theming,theme-builder}.html` (`site/foundations.ts` — the token
  pages parse `tokens/default.css`, `styles/typography.css`, `styles/utilities.css` and `styles/motion.css` at build
  time; swatches paint through generated `.tk-<token>` classes in site.css, values are read back live by site.js so a
  theme/dark/density switch updates them; the motion page replays every shared keyframe); one `components/<name>.html`
  per catalogue entry (`site/component-page.ts`: import line, the catalogued cases in
  `section#cat-<name>[data-catalogue]` — the hooks `test-catalogue.ts` drives —, the usage examples as TypeScript +
  rendered HTML in `Tabs` of `CodeBlock`s (snippets cut by `examples/docs/snippets.ts`, shared with
  `scripts/build-docs.ts`), and an API list: exported functions with their JSDoc, CSS hooks, script attributes, events);
  `layouts/<name>.html` (`site/pages.ts`: an iframe of `frames/<name>.html` at phone/tablet/desktop widths — a
  `Segmented` writes `data-view` via view-switch.js, site.js scales a frame wider than its column — plus the bands and
  the `--layout-*` tokens it reads); `rapid/{integration,errors}.html` (the data-* contract and events as `DataTable`s,
  template snippets, and `ErrorTemplate` rendered as frames for 404/403/500-dev plus the compact part).
- **Frames** — `demo/frames/*.html` are standalone documents (the eight layout samples, the error pages) loading
  `frames/frame.js`, which applies the theme/density/mode the parent page posts (`postMessage` — `file://` pages are
  opaque origins, so `contentDocument` is off limits). `test-layouts.ts` drives them directly.
- **`demo/pages.json`** lists every page (`site`, `frames`, `admin`); `test-all-pages.ts` and `test-visual.ts` read it
  instead of hand-kept lists. `test-all-pages.ts` also holds the navigation rule on every site page: one current link,
  every group above it open, no header links, no breadcrumb or `.cat-nav` in the chrome, sub-groups present, every site
  page linked from the sidebar exactly once and every link resolving; and drives the chrome once (collapse to the rail
  and back, persisted; a rail flyout; theme and density switches; the phone drawer and Escape).
- **`test-catalogue.ts` on per-component pages** — one tab; the render/axe/dark checks loop over every component page;
  the behaviour blocks stay grouped and call `go(page, "<component>")` before each step (a no-op when already there, so
  consecutive steps keep the page's state). Two lessons: a guarded form left dirty asks `beforeunload` before the tab
  moves on — the tab accepts dialogs; and `about:blank` has no `localStorage`, so the new-document clear is guarded.
- `menu.js` now marks every parent above the current link `menu__link--current-parent` (it did so only for a hash
  match), so the collapsed rail shows which group the current page is in.

Not rebuilt: the admin example app's content (its sidebar gained Profile and the link back; breadcrumbs went), the
`examples/shared/` case library, themes and layout samples — they are the content the site presents, and the regression
suites are written against them.

**Collapsible is `<details>` again (0.25.3, 2026-10-29).** Asked for by Website FE moving Brevily's FAQ off native
`<details>`: 0.25.2 gave a row its `id` on the root and opened the row a hash names, but a closed row still needed
script to open at all (a `<button data-toggle>` + `hidden` panel). Now the root is `<details class="collapsible">`, the
trigger `<summary class="collapsible__trigger">` holding `<h3 class="collapsible__heading">` + the icon, and the panel
`.collapsible__panel > .collapsible__inner` as before — every class keeps its role, because Brevily's website and
console style `.collapsible*` directly. An `Accordion` passes its id as the rows' `name` (native exclusivity, no
script). collapsible.js takes over a summary click (preventDefault) to animate the grid row and removes `open` only once
a closing row has finished (`.is-closing` on the row, which also un-turns the icon); it moves `name` into
`data-collapsible-name` on init and after `rapid:swapped` so the row an accordion closes can animate too, and a
capture-phase `toggle` listener keeps the group exclusive when the browser opens a row itself (find-in-page, a
fragment). `test-catalogue.ts` drives it with JS off as well.

**Sidebar slots (2026-10-29, asked for by the Brevily console).** The console hand-wrote `<aside class="sidebar">`
because `SidebarProps` held only `brand`, `items`, `collapsible`. Now: `head` (`.sidebar__head`, after the brand),
`sections` (`{ label?, items }[]` → `.sidebar__section[role=group]` with a `.sidebar__section-label`, each its own
`Menu` `<id>-menu-<n>`, all inside the one nav), `foot` (`.sidebar__foot`, `margin-top: auto`), `navLabel`, and
`collapsible: { position: "edge" }` (`.sidebar--toggle-edge` + `.sidebar__collapse-toggle--edge`, rendered right after
the brand). On the rail `.sidebar__label` (the convention for head control text — `Button` has no label span), section
labels and the foot hide; collapse-sidebar.js titles a control from its `.sidebar__label` (marked `data-sidebar-title`
so a title of its own survives). Head and foot carry `data-dropdown-clip` (a switcher dropdown goes `position: fixed`
instead of being clipped by the sidebar's `overflow-y: auto`). The edge button straddles the border, so in edge mode the
sidebar is `overflow: visible` and the nav scrolls; the sidebar gets `position: relative` only where a layout does not
already make it sticky — a components-layer rule beats the layouts layer whatever its specificity, so it is scoped with
`:not(.layout__body > .sidebar)` and kept inside the ≥992 query (`.js .sidebar` is fixed below it).

**Stat links and nameless comboboxes (2026-10-29, asked by Console FE).** `Stat({ href, note })`: `note` sits in its own
grid row under the value (`.stat--with-note` adds the row, so a stat without a note keeps its height); `href` makes the
label an `a.stat__link` whose `::after` is stretched — over the tile (`.stat--link` is positioned), or over the whole
Card when the stat is `.card__body`'s child (the stat goes static and the card is the containing block). The link is
named by the label alone; the sparkline sits above the stretch so its point tips still work.
`Combobox({ ariaLabel,
labelledBy })` names a combobox with no visible label (a toolbar filter); the same name goes on
the listbox, and a visible `label` now has an id (`<id>-label`) that names the listbox too.

**Menu badges, chart height, Select size (2026-10-30, asked by brevily-design moving to 0.27.0).** `MenuItem.badge`
(`string | number` → a `Badge` in `badgeVariant`, or `Html`) renders `.menu__badge` after `.menu__link-label` (before a
parent's caret) — outside the label, because collapse-sidebar.js titles rail links and flyouts from the label's text and
a count inside it read "Link setup2". The rail hides badges; `.menu__link--alert` (`alert`, default on for a `danger`
badge) draws a dot on the icon (`--sidebar-alert-dot-size`); a flyout shows them again. `Chart` renders a zero-width
floated `<svg class="chart__reserve" height=…>` inside a `display: flow-root` box: an SVG `height` attribute is the one
CSP-clean way to size an element before script runs (no `style=`, and a custom property needs one). The value is
`height + parentHeightOffset` (15 by default) because ApexCharts sets exactly that `min-height` on the element when it
mounts — reserving `height` alone still grew the box 15px. A `%` height reserves nothing. `Select({ size })` (the
`InputSize` union, `.select--sm|lg`; the email-domain and tel-country selects take the Input's size) and
`Input({ inputmode })` (wins over a variant's own keyboard, then `attrs.inputmode`). `test-catalogue.ts` `designAsks()`
pins all four.

**Titles that read as titles, text that is never hidden (2026-10-30, the Brevily playbook's review of the website).**
Prose headings scale from `--prose-size` (`--prose-h1..h4-size`: 2.25 / 1.75 / 1.35 / 1.15×, a step less below 576),
because fixed `--font-size-2xl` h2s left an 18px article with 24px section titles; `li` and the table are body-sized.
`.pricing__name` is a display-family title at `--pricing-name-size` (default `--font-size-2xl`). **Reveal no longer
hides text by default**: `rise`/`scale` only move; `hide: true` (`data-reveal-hide`) or the `fade`/`blur` effects start
transparent — a fast scroll passed staggered headings before they appeared. **ScrollSteps picks the step whose
`.scroll-steps__text` is nearest the viewport's middle** (scroll + rAF while the section is in view), not the step band
crossing a 40–60% IntersectionObserver band: the band trigger left the previous step's picture beside text that was
wholly on screen; the test samples every 20px and fails on the old trigger. A step's first heading is
`--scroll-steps-title-size` (3xl). `Hero({ fill, footer })`: `min-height: 100svh - --hero-fill-offset` (vh fallback,
offset defaults to `--scroll-padding-top`), auto margins centre the inner block and drop the footer to the bottom. Not
kit work, said so to the site: the compare table's group eyebrows, the FAQ's 18px triggers and /features' h2 < h3 are
the site's own `brv-*` CSS; the kit's base scale is already ordered (h2 3xl > h3 2xl > h4 xl). `playbookAsks()` in
`test-catalogue.ts` pins it.

**Carousel sides / stack / page scroll, ScrollSteps `dim` (2026-10-30, asked by Console v4 for the website's tour).**
`controls: "sides"` wraps the track in `.carousel__frame` with 44px round `.carousel__side--prev|next` at the middle
edges; carousel.js measures the room beside the frame on each side (viewport edge, not "the page is centred" — a
`(100vw - 100%) / 2` outset ran past the viewport beside the catalogue's sidebar) and writes
`--carousel-side-outset-start|end`: fully outside with room, as far out as fits, at most `--space-2` inside; a disabled
end fades out. `stack` (sm/md/lg breakpoints), `stackReducedMotion`, `stackNoScript` share one
`@define-mixin
carousel-stacked` (grid of slides, bar and arrows gone, no pin) — postcss-mixins expands CSS-defined
mixins, this is the first one; carousel.js treats a grid track as stacked (no keys, no autoplay, goTo is a no-op), and
the option rules also set `--carousel-stacked: 1` so the script can tell the page's stack from its own "unfit" one.
`scroll: "page"` renders a `[data-carousel-pin]` around frame + bar; while it applies (JS, > 1 slide, no reduced motion,
not stacked, and the tallest slide fits — measured as a plain row under `.carousel--measuring`, never painted; too tall
→ `data-carousel-unfit`, the stacked mixin) the root gets `data-carousel-pinned` + `--carousel-page-count` (CSSOM) →
`(100svh − header) + (n − 1) × 100svh` tall (the pin leaves the moment the last slide's place passes — `n × 100svh` left
a trailing screen), the pin one screen under `--scroll-padding-top` with track and slides filling it, the track
`overflow-x: hidden` with snap off; scroll + rAF set `scrollLeft`: each segment holds `hold/2` (default 0.8) on the
outgoing slide, moves, holds `hold/2` on the next (first and last slides get half a hold at the ends), the outgoing
slide's `opacity` = 1 − t through the move; the IntersectionObserver stands aside, and goTo scrolls the PAGE to
`start + i/(n-1) × length` — buttons, dots and keys all go through goTo, so nothing needs a capture-phase override.
`.carousel__slide` is `position: relative`: an absolutely placed child (an `.sr-only` caption) otherwise sat against
`.carousel`, outside the track's clip, and a slide far along the row widened the page (/trust measured 3,315px at 1440;
the catalogue's page-scroll case carries such a caption, 3,535px without the fix). `ScrollSteps({ dim: false })` →
`.scroll-steps--no-dim`. All pinned in `playbookAsks()`.

**CodeBlock for every Brevily sample (2026-10-30, asked by the Brevily playbook and Console v4).** A blank line kept no
height: `.code__line` is `display: block` with nothing in it. The filler is `.code__line::after { content: "\200b" }` on
every line — not `::before` (the line number lives there) and not `:empty` (a highlighter splitting a multi-line comment
leaves an empty span on the blank line). `aside` (`Html`, `.code__aside`) sits between title and copy. code.js colours
`python`/`py`, `php` and `java`; what stays open across lines is now `BLOCKS` (`[opener, closer, class]`, so a Python
docstring or a Java text block continues as a string), checked at each position inside the scan so an opener inside a
string or a line comment never counts. `tok-mark` / `tok-quiet` (`--code-mark`, `--code-quiet`) mark a run inside a line
in `highlighted` markup; `highlighted` turns the tokenizer off, so that markup carries any other colours itself.

**ScrollSteps' two copies, optional Carousel id (2026-10-30, asked by Console FE and Console v4).** `step.media` renders
twice (in the step, on the stage) and only one is displayed at any width, because a single copy moved by script would
shift the first paint. The stage copy gets `<id>-stage-` on every id it declares and on references to them
(`withIdPrefix` in reveal.ts: ID-reference attributes, and `#id` in any other attribute) — a prefix, because scripts
derive ids from a root's (`<id>-list`). The stage is no longer `aria-hidden` (it hid focusable controls); a faded
picture is `visibility: hidden`, flipping after the fade. A field in media would post twice, so forms do not belong
there. `Carousel.id` is optional; carousel.js never used it. `playbookAsks()` pins it at 375 and 1280, axe included.

**DataTable `pinEnd` (2026-10-30, asked by Console FE for the owner).** From 768px the last column (the row actions, or
the last of `columns` without them) and its header stay at the scroll box's end; the rules hang off
`.data-table--pin-end` with `:last-child`, so cells need no class of their own. They sit in a `min-width: 768px` query
so a phone layout, the kit's cards or an app's own through `cellAttrs`, never meets them. The cell's ground follows
hover and selected, and the body cell has no z-index, like `td.data-table__actions`. The box renders `tabindex="0"` and
a name (`scrollLabel`); data-table.js `fitPinned` drops the tab stop while nothing overflows and writes
`--data-table-pin-end-width` for `scroll-padding-inline-end`, so a link focused by Tab comes clear of the pinned cell.
Height counts as overflow only on a capped box (rows animating in poke past an uncapped one) and the table is observed
as well as the box; `data-pin-fits` drops the pinned edge while the table fits, and without the script the edge stays.
`playbookAsks()` pins it, keyboard and axe included.

**Tooltip top layer, long row strips, Dropdown in a cell (2026-10-31, asked by the Brevily playbook).** A fixed element
escapes overflow but not its stacking context, and in a table there are two: a sticky cell, and every row, because
data-table.js names rows for view transitions (`view-transition-name` makes a stacking context). So tooltip.js shows the
bubble through the Popover API (`popover="manual"`, set by the script) and a `:has()` rule lifts the row and the cell
holding an open Dropdown. Select, Combobox, DatePicker, TimePicker and Popover panels are absolute, so a scroll box
clips them: `uiFloat.escape(anchor, panel, { onLeave })` (shared/js/float.js) makes one fixed and following its anchor
while it is open, only inside `.data-table__scroll` / `[data-dropdown-clip]`, and closes it when the anchor scrolls out
of the box. `RowActions` items scroll in `.data-table__row-actions-items` beside Close, which stays in view;
data-table.js marks `data-more-start|end` on the view, which shows a fade with a chevron. A chevron is a `<span>`,
`aria-hidden`, because Tab already walks the items and the console's phone sheet copies every `a, button` in the strip.
It steps one control at a time, so no width skips an action, and focus scrolls a control clear of the fades. Under
`MIN_STRIP` (240px) of free room the strip covers the sticky cells instead, capped to the row so a card holds it.

**ScrollSteps focus, SiteFooter `tag` (2026-10-30).** A faded picture cannot hold focus, so `activate()` in reveal.js
moves focus inside a stage picture to the control at the same place in the new one, or to the step (`tabindex="-1"`)
when that picture has no controls, always with `preventScroll`. The place is remembered while focus is being carried, so
a picture with fewer controls does not lose it for the way back. Focus elsewhere is never touched.
`SiteFooter({ tag: "div" })` is for a layout's `footer` slot, which is already a `<footer>`; a `<footer>` may not hold
another.

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
  moved into `examples/themes/admin.css` as custom partials; the demo site's harness CSS/JS is written to
  `demo/site.css|js` by its builder (`examples/pages/site/assets.ts`). `test-catalogue.ts`/`test-all-pages.ts` would
  flag any inline `style=`, and the demo build prints nothing if none exist.
- `examples/tests/test-layouts.ts` (`deno task test:layouts`) loads every layout at 375, 667×375, 768, 1024, 1440 and
  1920 and asserts: no horizontal overflow, `#main-content` present and within the viewport, reading/boxed frames not
  full-bleed on wide screens, navigation reachable (visible nav, or a drawer toggle that actually opens the sidebar
  on-screen and closes on Escape), rail is a full-width bottom bar on phones, split shows exactly one pane on phones,
  article/docs asides stack vs. sit beside at their thresholds. Add a layout → add it to `LAYOUT_INFO` (site/nav.ts),
  the bands table in site/pages.ts, and this list.
- **SidebarLayout 992–1199 is a grid, not a wrapping flex row (fixed 2026-10-05).** The range used `flex-wrap: wrap` so
  the aside could drop below the content, but the content's `auto` basis (its own width; 100% when boxed) wrapped the
  content itself onto a second line under the sticky sidebar, and a wrapped aside started at the row's edge, under the
  sidebar too — open since 2026-09-18 because `test-layouts.ts` only checked "within the viewport". The body is now
  `grid-template-columns: auto minmax(0, 1fr)` there (sidebar spans both rows; the column follows the full sidebar, the
  collapsed rail, or nothing for the fixed drawer), and the suite asserts that `#main-content` and any aside start at
  the sidebar's edge whenever an in-flow sidebar is visible.
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
  integration coverage the components have. `deno task test` runs build → demos → all suites (`test:suites`, then
  `test:visual`).

**The catalogue (2026-09-16) — every component, every variant, generated, one page per group.**
`examples/shared/catalogue.ts` is a manifest: one entry per component directory (with a `group`: forms, data, charts,
cards, navigation, actions, feedback — `catalogueGroups`), one case per exported template function × every declared
variant/size/tone/status and every meaningful state. Its server-driven cases (the projects and invoices tables, the
`#reviewer` combobox, the `#palette` command, the `#period` picker, the "Show toast" button) come from
`examples/shared/data.ts` and take a `DemoRoutes` — inert query strings on the static pages, real routes in the app —
plus a `CatalogueState` so the app can render a pushed URL's state. The demo site renders each entry on its own page
(`demo/components/<name>.html`, see "The demo site" below); the app serves the same groups at `/components/<group>`.
`examples/tests/test-catalogue.ts` (`deno task test:catalogue`, first in `test`) enforces it: **statically**, every
`export function` under `components/` and every literal of every
`*Variant|*Size|*Tone|*Status|*Type|*Width|*Mode|
Orientation|Tag|Ratio|Span` union must be referenced by `catalogue.ts`
(+ `charts.ts`, `data.ts`), so a new component or variant fails CI until it is catalogued; **in Chrome**, every
component page carries its section with every case, non-empty, every chart drew, no console/page errors, no inline
styles, no horizontal overflow, the dark toggle changes the canvas — and the per-page behaviour and theme assertions
that used to live in the gallery-v2 suite. `demo/` stays at the repo root (gitignored build output) so that a local
build is easy to find and open. One harness lesson: `file://` pages share one origin, so a persisted theme toggle leaks
between pages — clear `localStorage` in `evaluateOnNewDocument`, not after load.

**Never delete `examples/` to "clean up"** — it is the regression suite. If a sample theme grows into a product, it
lifts out into its own repo with no restructuring; that is the intended path.

**`examples/themes/*.css`** are source with no generator. An earlier layout nested them under `demo/themes/` and a
same-session `rm -rf demo` deleted them **twice** before the fix was to relocate them, not just to remember more
carefully. Reference them from a demo script with a relative path back to repo root (e.g. `demo/admin/dashboard.html` →
`../../examples/themes/admin.css`, `demo/components/select.html` → `../../examples/themes/console.css`; the site chrome
computes it from the page's depth — `data-themes` on `#theme-css`) — get the `../` count wrong and the browser just
silently 404s the stylesheet, so re-run `deno task test:all` after touching any of these paths (it would have caught
this exact class of mistake).

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

Demos (rebuilt 2026-10-29, see "The demo site" below): one site under `demo/` whose sidebar is its only navigation, plus
`demo/admin/*.html`, the one full sample theme (SidebarLayout + collapsible **dark** sidebar nav + icon set + stat
cards + ApexCharts + working filtered/paginated tables + card-grid Projects/Team + deep-linked Settings tabs + modal +
navbar search/notifications/dark-mode toggle, indigo palette — built from scratch with this library's own components,
not a clone of any commercial template's assets; its own sidebar is its navigation, ending in a "Component library" link
back to the site). All generated by `examples/pages/build-demo.ts` and `build-admin-theme.ts` (`deno task build:demos`
runs both) — edit the scripts, not the generated HTML in `demo/`.

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

`createApp({ port, hostname, assets, quiet })` (`app.ts`) boots a real rAPId `Application` (`^0.4.0`, see below) wearing
the library: `ui.core` from `createCoreTemplate`, `ui.errorTemplates` from `templates/errors.ts`, `prefer: "html"`,
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
  leaves the PR behind main. Release PRs are opened with the `RELEASE_PLEASE_TOKEN` PAT so their `pull_request` event
  runs CI (one opened with the default token triggers nothing).
- **Wiki** (`wiki-sync.yml` + `scripts/wiki-sync.ts`): `docs/` is the source of truth; every push to `main` touching it
  flattens `docs/*.md` + `docs/reference/*.md` into the `TundraSoft/ui.wiki` checkout (page name = file name, links
  between docs rewritten to page names, other repo links become GitHub blob URLs, generated `Home.md` + `_Sidebar.md`,
  fails on a link to a missing doc page) and pushes. Run it locally with `--out=<dir>` to preview.
- **Issue templates** (`.github/ISSUE_TEMPLATE/`): `bug_report.yml` (area, component, version, usage mode, browser,
  runtime, repro/expected/actual), `feature_request.yml` (area, what/why, contract checklist), `config.yml` (blank
  issues off, links to the wiki and to TundraLibs for rAPId runtime bugs) alongside the health report body.

### CI and weekly health (`.github/workflows/`, 2026-09-16)

- **`ci.yml`** on every pull request — when it opens and on each push to it; not after the merge (2026-10-29: the
  post-merge run repeated the PR's last one, and the merge-skew it alone caught still shows in the release PR's CI and
  the weekly health run) (**`main` is protected by a ruleset**, 2026-09-17: PR required, the five CI job names below are
  required status checks, no force-push or deletion; there is no review-count requirement since there is one maintainer,
  so land changes as a branch + PR and `gh pr merge --squash` once green — a direct push to `main` is refused):
  `quality` (fmt check, lint, build, **version-manifest drift**, `deno task check`, JSR `publish --dry-run`,
  `npm pack --dry-run` asserting `dist/ui.{css,js}` are in the tarball), `audit` (high+), `browser` × {deno, node, bun}
  running build + demos + `test:suites` (every suite except the visual baselines) with the runner's Chrome, and `visual`
  ("Visual baselines", 2026-10-29) running `test:visual` once — the screenshots come from the same Chrome whatever the
  runtime (CI's hashes were byte-identical across all three), so running it per runtime only tripled its cost.
  Screenshots upload on failure (`include-hidden-files: true`: `.test-output` is a dot-directory and upload-artifact v4
  skipped it, so no failed run had ever uploaded any). `deno task test` locally is still everything: build → demos →
  `test:suites` → `test:visual`.
- **Suites run pages side by side** (2026-10-29): `examples/tests/browser.ts` has `pool(items, fn, size)` and
  `isolatedPage(browser)` / `closeIsolated(page)`; `test-visual` (page × width renders), `test-all-pages` (every page),
  `test-layouts` (layout × band) and `test-catalogue`'s per-component render/axe/dark loop run `TEST_CONCURRENCY` lanes
  (default 4, `1` runs in order); `test-catalogue`'s behaviour blocks stay on one tab, in order. Each lane's tab has a
  **browser context of its own**: `file://` pages share one origin, so tabs in the default context share `localStorage`
  and a dark toggle in one leaked into another's light render. Results keep page order (the visual baseline is written
  in job order; all-pages sorts its issues by the manifest). CI wall time went from ~20 min to well under half that.
  Local caveat: in a container whose Chrome goes through an HTTPS proxy, `HERMETIC`'s DNS block never applies,
  placeholder images really download at network speed, and image pages render differently run to run — unset the proxy
  variables to reproduce CI (where those hosts fail instantly and renders are byte-stable).
- **`health.yml`** weekly (Mon 05:23 UTC) + manual, mirroring TundraLibs': `drift` (deno stable/canary, bun latest, node
  22/24/current — the full suite each), **`rapid-canary`** (`scripts/unpin.ts` rewrites the rAPId/compat pins in
  `deno.json` to `@latest`, drops the lock, re-runs `check` + `test:app` — a breaking rAPId release shows up here, not
  at a consumer's upgrade), `audit` (all severities), and `cdn` (`scripts/check-cdn.ts` fetches the jsDelivr URLs from
  `version.ts` and verifies the sha384 matches — skips while the version is 0.0.0). `close-on-success` closes any open
  `ci-health` issue; `report` creates or comments on one using `.github/ISSUE_TEMPLATE/ci_health.md` as the body (single
  source of truth) with the failing job names and run URL.

**The v3 round (2026-10-28): motion, floating panels, phone layouts, and eighteen new components.** A full walk of the
demos (every page at 1440 and 375, light and dark, every panel driven open) found that almost nothing animated, floating
panels had no viewport awareness, and phone layouts were desktop layouts stacked. What changed, and the rules that fell
out of it:

- **Motion is tokens + two conventions.** `tokens/default.css` has `--duration-fast|base|slow|enter|exit` and
  `--ease-out|in|in-out|spring` (`--transition-*` are built from them); `styles/motion.css` (layer base) holds the
  shared keyframes (`ui-float-in|out`, `ui-float-up-in|out`, `ui-scale-in|out`, `ui-rise-in`, `ui-sink-out`,
  `ui-fade-in|out`, `ui-slide-*`, `ui-reveal`). Convention one: **showing is free** — clearing `hidden` (or adding the
  open class) starts the `*-in` keyframes on the panel's own rule. Convention two: **hiding goes through
  `uiMotion.exit(el, done)`** (`shared/js/motion.js`): it adds `.is-closing`, the component's `.is-closing` rule plays
  the `*-out` keyframes with `forwards`, and `done` (set `hidden`, `remove()`, `dialog.close()`) runs on `animationend`
  — at once when the rule animates nothing, the node is detached, or reduced motion is on. `toggle.js`, `dismiss.js`,
  modal (incl. the native Escape `cancel` event, intercepted in capture), dropdown, popover, combobox/select lists, date
  and time pickers, the command palette, toasts and the rail flyout all use it. **Keyframes animate `transform`; a
  static offset goes on `translate`** (popover centring, the `--float-shift-x` nudge) so they compose.
  Collapsible/accordion animate `grid-template-rows: 0fr → 1fr` (the panel is a one-row grid, the padding moved to
  `.collapsible__inner`; collapsible.js runs in the capture phase and stops the click so toggle.js does not also act —
  accordion exclusivity moved there too). Tabs got the segmented thumb's idiom (`--tabs-x/--tabs-w` on the list,
  `::after` indicator, `data-tabs-ready`, ResizeObserver); the theme toggle cross-fades (one beat of
  `html.theme-changing` colour transitions — not a View Transition, which paints a snapshot that swallows every click
  while it runs and fights a concurrent rAPId swap); `.btn:active` and `.card--clickable:active` scale to 97%/99.5%;
  `data-table.js` gives rows a `view-transition-name` from their key (CSSOM) so a sort swap re-orders instead of
  cross-fading. Adding a component: pick the pair, set `transform-origin` towards the trigger, write the `.is-closing`
  rule, hide through `uiMotion.exit`.
- **Floating panels fit the viewport** (`shared/js/float.js`): `uiFloat.fit(panel, { anchor, flip })` measures an
  absolutely positioned panel and writes `--float-shift-x` (CSSOM) when it would run off the side, reporting
  `below: false` when it should flip (popover adds `popover--above`; the arrow counter-shifts with
  `translate: calc(-50% - var(--float-shift-x))`); `uiFloat.place(anchor, panel, { side, align, offset })` positions a
  `position: fixed` panel with flip + shift and sets `data-side` + `--float-anchor` for an arrow (tooltip.js uses it);
  `follow()` re-places on scroll/resize; `clear()` resets. Dropdown applies `fit()` to its absolute panel and keeps its
  own `place()` for the clipped (fixed) case.
- **The rail flyout painted under the content** on the admin dashboard: a sticky sidebar is a stacking context, so the
  flyout's `z-index` never reached the page and every later `position: relative` card covered it. collapse-sidebar.js
  now sets `sidebar--flyout-open` (→ `z-index: var(--z-popover)` on the sidebar) only while a flyout is open, so the
  sidebar does not otherwise cover a dropdown near its edge. The collapse toggle is hidden below 992 (a drawer has no
  rail). Dark-mode borders went one step stronger (`#302d27` / `#413d36`), every `.card` carries `--shadow-inset-top` (a
  hairline top highlight: invisible on white, the edge that lifts a dark card off the canvas), elevated cards use
  `--shadow-lg`; the dropdown's search box no longer paints the field ring when the menu opens.
- **Catalogue and usage split files**: `examples/shared/catalogue/<name>.ts` (`entry(routes, state)`) and
  `examples/docs/usage/<name>.ts` (`usage` map) — one per new component, merged by catalogue.ts/usage.ts; the coverage
  test and build-docs read them too. A new component adds two small files instead of growing the two big ones. New group
  `marketing` ("Marketing & media", `demo/marketing.html`).
- **Still plain HTML first.** Every new component renders as markup plus the bundle on the static demo pages with no
  runtime; the rAPId hooks stay optional. Sheets and the lightbox are native `<dialog>`s, the carousel is scroll-snap
  with the buttons as enhancement, the number input is a native `<input type="number">`, reveal/parallax are
  IntersectionObserver + rAF and inert under reduced motion, a lazy section calls `window.rapid.swap` only when the
  runtime exists and otherwise shows what it carries.

**Round 2 (2026-10-28/29): nineteen components, the editor, masks, grid per breakpoint, utilities, cleanliness.** Six
agents built the batch in parallel against the same hard rules; what changed and the rules that came out of it:

- **Grid per breakpoint + a utilities layer.** `GridCol({ span })` takes a number (`col-N`, from 768px as before) or a
  mobile-first map `{ xs, sm, md, lg, xl }` → `col-xs-N … col-xl-N` (576/768/992/1400; `gridColClasses()` is the
  helper); `Grid({ gap: "sm" | "md" | "lg" })`. Tracks are `minmax(0, 1fr)` — a bare `1fr` is `minmax(auto, 1fr)`, so
  twelve tracks plus eleven gaps could never shrink below their content, and a `gap-lg` grid pushed a phone past the
  viewport (the phone column gap also falls back to the default below 768). `styles/utilities.css` is a new `utilities`
  cascade layer after `components` (~200 Bootstrap-shaped, token-driven classes: `d-*` with breakpoint variants, flex,
  `gap-*`, logical `m*`/`p*` 0–8, text, sizing, position, borders, surfaces, `hide-*`/`hide-*-up`, `.stack`,
  `.cluster`); `.mt-*`, `.stack` and `.hide-*` left base.css for it. Getting Started documents the grid, the utilities
  and **custom builds** (import tokens + reset + base + chosen components through the same three PostCSS plugins;
  concatenate enhance/motion/float first for JS).
- **New components** (each `components/<name>/`, catalogued and with usage): list-group, toggle (+ ToggleGroup, hidden
  mirror input, `toggle:change`), kbd, rating (CSS-only star radios, DOM reversed so `~` fills "up to the checked one";
  rating.js remaps arrow keys to visual order), separator, ratio, figure, fab (`hideOnScroll`), scrollspy
  (`[data-scrollspy]` behaviour; the DocsLayout TOC carries it), back-to-top, context-menu (right-click, Shift+F10, long
  press; `uiFloat.place` at the pointer via a fake anchor rect), menubar (fixed panels placed with `uiFloat.follow` —
  the bar scrolls sideways below 768, which clipped absolute panels), split-pane (`--split-start` via CSSOM from
  `data-split-initial`/storage/drag/keys), scroll-area, transfer (native `<select multiple>` enhanced into two
  listboxes), color-picker (native `<input type="color">` enhanced; the literal colours in its CSS are colour science —
  black/white fades, hue spectrum, checkerboard — as custom properties with a comment), tour (spotlight = a fixed box
  with a 200vmax box-shadow scrim sized through the CSSOM; `startOn: "load"` + `storageKey`), code (per-line markup,
  `.tok-*` plus Prism/highlight.js class mappings on one set of `--code-*` properties, a regex tokeniser for plain
  pages, `codeHtml()` for trusted highlighter output), diff (`diffLines()` LCS for short texts; split pairs runs row by
  row). Reveal gained ScrollProgress (pure CSS under `@supports (animation-timeline:
  scroll())`), CountUp (final value
  in the markup; the script only animates once in view) and ScrollSteps (sticky stage, middle band of the viewport picks
  the step). Toast gained `position` (six) and the top-layer fix: with the Popover API the region shows as a manual
  popover re-raised when a toast lands or a dialog opens (visible above a modal, not clickable — a modal makes
  everything outside it inert; browser behaviour). Avatar gained `status`. `Input({ mask })`:
  phone/date/time/currency/card/postcode/custom, formatted from the significant characters with caret preservation,
  impossible dates/times as custom validities, `maskRaw` hidden value for currency.
- **Editor** grew a block-style select, popover forms for link/image/code (never `prompt()`; a `div`, not a nested
  `form`), tables with contextual row/column tools, task lists, fenced code with language, its own undo/redo in
  markdown, list continuation on Enter, Tab indent, fullscreen, a status bar (word/char counts, `maxLength`), image
  upload by drop/paste (`uploadAction`, multipart `file`, CSRF + swap headers from `<body data-*>`), align/indent in
  html mode, plain-text paste by default with a sanitising whitelist for Ctrl/Cmd+Shift+V, and `sync()` strips the
  inline styles Chrome's `execCommand` writes (keeping `text-align` as the `align` attribute) so the submitted HTML
  stays CSP-showable. `toolbar: "full" | "basic" | "minimal"`, `statusBar`, `label`.
- **The theme cross-fade was a two-second freeze on big pages.** `html.theme-changing *` (plus `*::before/::after`)
  under a class that toggles on `<html>` re-styles every element twice; on the 13,000-element forms catalogue the toggle
  took 1.7 s (134 ms without the class), which is why the suite's theme checks failed only there. The rule now names the
  surfaces that paint their own ground (body, layout regions, navbar, sidebar, card, alert, data-table cells, controls,
  panels…) — text follows `body`'s animated colour through inheritance — and the switch is 190 ms. Never put a universal
  descendant rule under a class that toggles on the root.
- **axe findings fixed at the source, not allowlisted** (the harness agent had allowlisted 21 with owner files):
  calendar weeks are `role="row"` wrappers (a grid's cells need row parents; `.calendar__week` is the 7-column grid), a
  capped DataTable scroll box and an unwrapped or capped code block are `tabindex="0"`, the combobox/command "no
  matches" note is a disabled `role="option"` (a listbox holding only text fails `aria-required-children`; the scripts'
  option queries exclude it via one `OPTION` selector constant), server-mode date links carry `aria-current` instead of
  `aria-pressed` (not allowed on `<a>`), the inverse hero's outline button is a ghost outline (its light surface
  vanished under the re-mapped text colour), the editor status bar and calendar time chip use colours that clear 4.5:1
  on their grounds, a card holding its own controls is not `interactive`, and every bare catalogue control carries an
  `aria-label` (a `<button role="combobox">` cannot take its name from content). What remains allowlisted is listed in
  `examples/tests/axe-allowlist.json` with its owner.
- **Cleanliness pass** (`scratchpad/audit`-style script, rerun on the final bundle): seven selectors declared twice in
  their own stylesheet were merged, four scripts' private `prefers-reduced-motion` checks became `uiMotion.reduced()`,
  and `.combobox__list--static` exists only for the catalogue's bare fragment sample.
  `CATALOGUE_GROUPS=forms,data deno task test:catalogue` runs one or two groups (a debugging aid).
- Harness lesson: an always-open panel in one catalogue case overlaps the next case's control, and a Puppeteer click at
  those coordinates lands on the panel's hints bar — wrap such cases in `.cat-room--lg`.
- **The user's walk of the demos (2026-10-29)** found what no suite had: a bare `ComboboxList` fragment wrapped in
  `.combobox__list` is an absolutely positioned open list floating over the page (fragment samples now sit in a static
  `.cat-listbox`); a read-only half star rendered as a small star because the overlay was a 50%-wide box and the reset's
  `svg { max-width: 100% }` shrank the icon inside it (it is full size with `clip-path: inset(0 50% 0 0)` now); an
  inline `DescriptionList` in a flex row wrapped its values letter by letter because `overflow-wrap:
  anywhere` makes
  the min-content one character (the value column has `min-width: 6rem`); a popover rendered `open` far down a page was
  flipped above its trigger on load because `uiFloat.fit` measured room against the viewport the anchor was not in
  (off-screen anchors never flip); and the collapsed sidebar rail gave no way to see a parent's children — hovering or
  focusing a rail parent opens its flyout, every rail link carries its label as a `title`, and menu.js marks the parent
  of the current child `menu__link--current-parent` (highlighted in the rail). A flyout closing restores the sublist's
  own state (`data-flyout-restore`): the current section's sublist, rendered open, used to come back collapsed after a
  hover; a flyout taller than the viewport scrolls. The catalogue's own sidebar carries `data-scrollspy` and renders the
  current page's components as plain hash links, so the component being read lights up while scrolling
  (`.menu__link.is-active` shares the active look). Stat sparklines have per-point hit columns (`sparklineLabels` names
  the points): `stat.js` shows the label in a `.stat__spark-tip` the moment the pointer is over a column (a native
  `<title>`, the no-script fallback, needs a second of stillness and never shows on touch — the user hovered and saw
  only the column tint); with `preserveAspectRatio="none"` any circle or text inside the box would stretch, so the tip
  is an HTML element placed through the CSSOM.

**Harness additions (round 2, 2026-10-28): theme builder, axe, visual baselines, density.**

- **`demo/foundations/theme-builder.html`** (`examples/shared/theme-builder.ts`'s `themeBuilderContent()` placed in the
  site chrome by `examples/pages/build-demo.ts`; Foundations › Theme builder; swept by `test:all` and `test:visual`):
  colour pickers + hex fields for ten colour tokens, sliders for radius / control height / type size / motion (derived
  tokens computed from the one slider), two font selects, a Light/Dark palette switch deciding which palette the colours
  edit, a preview of real components, Export (changed tokens only, `:root` + the two dark blocks with the tokens file's
  exact selectors) + Copy + Reset, state in localStorage and the URL hash. All through the CSSOM
  (`documentElement.style.setProperty`) — no inline style attribute, so the catalogue's CSP check still holds. Two
  lessons: `getComputedStyle(root).getPropertyValue("--color-x")` returns whatever syntax the sheet used (hex, `rgb()`,
  `color-mix()`), so the builder resolves a token to rgb through a hidden probe span's `color`; and reflecting a slider
  dispatches `input` (slider.js repaints its track from it), which the builder's own `input` listener must ignore
  (`reflecting` flag) or the reflected default lands in the exported theme.
- **axe-core in `test-catalogue.ts`** (`npm:axe-core@4.10.2`, injected from the package file with `page.addScriptTag`,
  `preload: false` because axe otherwise XHRs every stylesheet, which `file://` refuses): WCAG 2.0/2.1 A + AA on each
  catalogue page's untouched light render, serious + critical fail, `examples/tests/
  axe-allowlist.json`
  (`{ rule, target: <regex>, reason }`) names the known gaps with an owner file in the reason; the whole report goes to
  `.test-output/catalogue/axe.json`. An allowlist entry is a to-do, not a silencer — work the file down.
- **`examples/tests/test-visual.ts`** (`deno task test:visual`, after `test:all` in `test`; `test:visual:update`
  rewrites): every demo page × {1440, 375} × {light, dark} under `prefers-reduced-motion: reduce` (reveal/parallax stay
  inert, charts get 1.5 s), full-page screenshot → 16-column block-average hash (rows follow the aspect, 16–96) →
  `examples/tests/visual-baseline.json`, keyed by `navigator.platform` so a macOS run never compares with a Linux
  baseline (no baseline for the platform = pass with a note). A cell is one hex digit of grey (16 levels), changed when
  it moved ≥ 2 levels — not an above-the-mean bit: a mostly white page sits at its mean everywhere and a hairline would
  flip half the bits. Fails above 5% changed cells (`VISUAL_TOLERANCE`) or on a row-count change, **after one fresh
  re-render of that page** (a first capture once landed with every inline command list collapsed, identically never
  again — a one-off state is not a drift), saving the screenshot to `.test-output/visual/`. `VISUAL_PAGES=a,b` limits a
  run or an update (which then merges) to matching paths, `VISUAL_SAVE=1` keeps every screenshot. **Any intended visual
  change updates the baseline in the same PR**: run `deno task test:visual:update` on the platform the baseline carries
  (CI's Linux Chrome is the committed one) and commit the JSON. A drift on a page nobody touched that repeats
  identically across runs is a baseline captured mid-state: update it.
- **Density**: `--control-height-{sm,md,lg}` are `calc(var(--control-height-<size>-base) * var(--density))` (bases
  30/36/44, factor 1); `[data-density="compact|comfortable|default"]` (0.85 / 1.15 / 1, styles/base.css) on any ancestor
  retunes the controls inside. **A custom property resolves its `var()`s where it is declared**, so the `:root` calc
  bakes `:root`'s factor in and a factor changed on a descendant alone does nothing — `[data-density]` re-derives the
  three heights from the bases, and a theme region doing its own density must do the same (`examples/themes/admin.css`
  `#forms-density[data-view]` is the example; the first version set only `--density` and measured 36px in Compact). A
  theme that sets a height to a plain px value opts that height out of density (portal.css does today — switch it to the
  `-base` tokens if density should work there). The admin Forms page's Density segmented writes its value to
  `#forms-density[data-view]` through `view-switch.js`; Compact gives a 36px control 30.6px.

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
