# rAPId integration

How a rAPId application wears this library: the document shell, page layouts and error pages that plug into
`Application.initialize`, the components that talk to the server through rAPId's swap runtime, and the patterns that
keep back/forward, reloads and no-JS submissions honest.

---

## TL;DR

- `ui: { core: createCoreTemplate(), errorTemplates, prefer: "html", history: true }` and every page has the bundle, a
  skip link, the runtime and a toast region.
- Assets come from the versioned CDN with integrity hashes by default; `createCoreTemplate({ assets: "/ui" })`
  self-hosts through `view.asset()`.
- Components are plain functions returning `Html` — compose them in route templates; everything interpolated is escaped.
- Server-driven components (combobox, command palette, date picker, data table, pagination, lazy regions, toasts, the
  editor's preview) speak rAPId's `data-*` contract. Your route returns the **fragment** the component exports
  (`ComboboxList`, `CommandList`, `DatePickerPanel`, the table itself).
- A pushable region's URL is the **page route itself**: the handler returns the region on a swap and the whole page on a
  navigation.
- Forms render straight from `RapidFormError`; the same route serves a swap (JS) and a redirect (no JS).

---

## The three tiers

```ts
import { Application } from "@tundralibs/rapid";
import { createCoreTemplate } from "@tundralibs/ui/templates/core";
import { createLayoutTemplate } from "@tundralibs/ui/templates/layout";
import { errorTemplates } from "@tundralibs/ui/templates/errors";

const app = await Application.initialize({
  name: "acme",
  ui: {
    core: createCoreTemplate({ history: true }),
    layout: createLayoutTemplate({
      brand: "Acme",
      navLinks: [{ href: "/", label: "Home" }, { href: "/projects", label: "Projects" }],
      sidebarItems: [{ label: "Overview", href: "/" }, { label: "Projects", href: "/projects" }],
    }),
    errorTemplates,
    prefer: "html",
    history: true,
  },
});
```

**Core** (`createCoreTemplate`) is the document: `<head>` with meta, viewport, the stylesheet (and any extra ones you
pass), then the body with a skip link to `#main-content`, your page, the shared `ToastRegion`, rAPId's runtime, the
optional history/live modules, `ui.js`, and your own scripts — all `defer`red. Options:

| Option                   | Meaning                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets`                 | `"cdn"` (default) — pinned jsDelivr URLs with `integrity`; or a prefix like `"/ui"` — `view.asset()` URLs under a fingerprinted static mount. |
| `stylesheets`, `scripts` | Extra files. A path starting with `/` goes through `view.asset()`; a full URL is used as is. A script may be `{ src, integrity }`.            |
| `head`                   | Constant extra `<head>` markup (favicon, preconnects).                                                                                        |
| `history`, `live`        | Also load `/__rapid/history.js` / `/__rapid/live.js`. Pair with `ui.history` / `ui.live`.                                                     |
| `toastRegion`            | `false` to leave the toast region out.                                                                                                        |
| `lang`                   | `<html lang>`, default `en`.                                                                                                                  |

**Layout** is the page frame. `createLayoutTemplate()` builds a navbar (+ sidebar) frame from config;
`asRapidLayout(body => SomeLayout({ …, content: body }))` turns any of the eight [layouts](./UI-Layouts.md) into the
`RapidTemplate<{ body, title? }>` rAPId expects. Set it app-wide, per module or per route (`layout: false` opts out —
the example app does that for pages that are complete frames themselves).

**Error pages**: `errorTemplates` (`default`, `4xx`, `5xx`) render rAPId's error payload (`status`, `code`, `message`,
`requestId`, `details`, `debug`) on the library's tokens with no inline styles — a drop-in for the built-in
`DefaultErrorPage`, which cannot run under a strict CSP.

### Self-hosting the assets

```ts
import { copyUiAssets } from "@tundralibs/ui/assets";

await copyUiAssets("./static/ui"); // ui.css + ui.js, from JSR or npm
const app = await Application.initialize({
  name: "acme",
  server: { static: { "/ui": { root: "./static/ui", fingerprint: true } } },
  ui: { core: createCoreTemplate({ assets: "/ui" }) },
});
```

rAPId's `view.asset()` appends a content hash and serves the files immutable; the library never hashes its own
filenames, so the two schemes don't fight.

---

## Rendering components

```ts
import { html, template } from "@tundralibs/rapid/ui";
import { Card } from "@tundralibs/ui/card";
import { Grid, GridCol } from "@tundralibs/ui/grid";
import { PageHeader } from "@tundralibs/ui/page-header";

const Projects = template<{ items: { name: string; owner: string }[] }>(
  (data) =>
    html`${PageHeader({ title: "Projects" })}${
      Grid({
        items: data.items.map((p) =>
          GridCol({ span: 4, content: Card({ title: p.name, subtitle: p.owner, href: `/projects/${p.name}` }) })
        ),
      })
    }`,
  "Projects",
);

app.get("/projects", { template: Projects }, () => ({ content: { items } }));
```

Every prop is interpolated through rAPId's `html`, so strings are escaped. `raw()` is never used on caller data.
Components render correctly as bare fragments — no wrapper is assumed — which is what makes swaps work.

---

## Server-driven components

rAPId's runtime does one thing: on a click or submit of a `[data-action]` element it fetches the URL and swaps the
response into `data-target` (`data-swap`: replace / `outer` / `append` / `prepend`), sending the `rapid-swap: 1` header.
Your handler sees `ctx.isSwap`. These components use it:

| Component                                                                          | What it emits                                                                                                    | What your route returns                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Combobox({ action })`                                                             | per-keystroke `rapid.swap(action?q=…, "#<id>-list")`                                                             | `ComboboxList({ id, options, query, selected })`               |
| `Command({ action })`                                                              | same, `?q=`                                                                                                      | `CommandList({ id, items, query })`                            |
| `DatePicker({ buildMonthHref, buildDayHref, presets })`                            | month/day/preset links with `data-action` + `data-target="#<id>"` + `data-swap="outer"` (+ `data-push` on picks) | `DatePicker(...)` again (the whole control)                    |
| `DataTable({ buildSortHref })`                                                     | sort links → `#<id>`, outer, `data-push`                                                                         | the `DataTable` again                                          |
| `Pagination({ target })`                                                           | page links → `target`, outer, `data-push`                                                                        | whatever the target is                                         |
| `Popover({ loadFrom })`                                                            | `data-load` on open                                                                                              | the popover's content                                          |
| any element with `data-load`                                                       | fetched on mount                                                                                                 | the region's content (render a `Skeleton*` as the placeholder) |
| a button with `data-action` + `data-target="#toast-region"` + `data-swap="append"` | —                                                                                                                | a `Toast(...)`                                                 |
| `Editor({ previewAction })`                                                        | POST `text` via `rapid.swap`                                                                                     | the rendered HTML fragment                                     |
| `Form({ attrs: { "data-action", "data-target", "data-swap" } })`                   | the form posts as a swap                                                                                         | the form (with `error`) or the success state                   |

Without the runtime the same markup degrades: combobox and command filter their rendered options client-side, the date
picker runs its own month navigation, links are ordinary links.

### A pushable region's URL is the page route

History push (`data-push`) records the fetched URL against the region's `id`; back/forward **re-fetches** it. So the URL
you push must render the full page on a plain navigation. The pattern the example app uses on `/components/data`:

```ts
app.get("/components/data", { template: DataPage, layout: shell }, (ctx) => {
  const q = new URL(ctx.url).searchParams;
  const sort = q.has("sort") ? { key: q.get("sort")!, dir: q.get("dir") === "desc" ? "desc" : "asc" } : undefined;
  // On a swap, return only the region the link targets; on a navigation, the whole page.
  return { content: { sort, fragment: ctx.isSwap && q.has("sort") ? "invoices" : false } };
});

const DataPage = template<Data>((d) =>
  d.fragment === "invoices" ? InvoicesTable(d.sort) : html`…the whole page, with ${InvoicesTable(d.sort)} in it…`
);
```

Build each region's links from a fixed base with distinct query keys, not by merging the current query, so one region's
state never leaks into another's URLs. Every region that pushes needs a stable `id` (rAPId refuses to push without one).

### Loading state

`busy.js` marks the target of any swap `aria-busy="true"` + `data-busy` the moment the click or submit fires; the
skeleton stylesheet paints a shimmer veil over it and blocks pointer events until `rapid:swapped` or `rapid:error` (15 s
safety timeout). `data-load` regions are left alone — render `SkeletonTable()` / `SkeletonCard()` as their initial
content, since only the server knows the shape that is coming.

---

## Forms

`formState()` hands you `RapidFormError` (`{ state: "error", message,
fields, values }`); `Form({ error })` renders it
as a banner, `FormField({
error })` per field, and `Input({ value: values.name, invalid })` re-fills. One route serves
both worlds:

```ts
app.post("/signup", { template: { render: SignupView, prefer: "html" } }, async (ctx) => {
  const form = await formState(SignupSchema, await ctx.payload);
  if (!form.ok) return { content: form.error }; // 200: the union's own state
  if (!ctx.isSwap) return { content: form.data, redirect: "/welcome" }; // no JS: Post/Redirect/Get
  return { content: { state: "added", values: form.data } }; // JS: swap the success state in
});
```

Give the form `attrs: { "data-action": "/signup", "data-target": "#signup",
"data-swap": "outer" }` and an `id`. A file
input is never echoed back.

`Input({ type: "date" })` renders the `DatePicker` (its hidden input carries the name and ISO value); `Otp` submits one
`autocomplete="one-time-code"` field; `Editor` submits Markdown or HTML through its textarea.

---

## Errors and empty states

`Empty({ tone: "error", code: requestId })` is the in-page failure state. A failed swap fires `rapid:error` on the
target without touching it — show a toast from that event rather than swapping an error page over a half-filled form.
Full-page errors go through `errorTemplates`.

---

## The example app

`examples/app/` is a complete rAPId application exercising all of the above — every layout, every component with its
server-driven cases wired to routes, the form union, the preview route, the error pages — and
`examples/tests/test-app.ts` drives it with a real browser, asserting that swaps happen in place, history pushes and
restores, reloads of pushed URLs render full pages, and the busy veil comes and goes. Start it with `deno task app` and
read `app.ts` as the worked example.
