# Recipes

Real pages built from the library, each shown twice: as a rAPId route with its template, and as the plain HTML that
template renders, for a page served by anything else. The rAPId code is `examples/docs/recipes.ts` in the repository,
type-checked against the library on every change; the HTML blocks are what that code renders (SVG icon bodies elided as
`…`).

---

## TL;DR

- Every recipe is one page or one region a product actually has: an app shell, sign-in, a dashboard, an invoices table
  with bulk actions, attachments with upload progress, search, notifications.
- **rAPId**: the template is a function of typed data; a route returns that data (the whole page on a navigation, one
  region on a swap). Nothing is hand-wired on the client.
- **Plain HTML**: the same markup, served by your framework of choice. The behaviour script in `ui.js` keys off `data-*`
  attributes and ARIA roles, so selection, menus, filters, toasts and the palette work; what needs a server round trip
  (sort, pagination, uploads, live search) is an ordinary link or form.
- Skim the [Components](./UI-Components.md) tour for the props, the [Reference](./Reference.md) for every one.

Imports used throughout (rAPId):

```ts
import { html, template } from "@tundralibs/rapid/ui";
import { Application } from "@tundralibs/rapid";
```

---

## 1. App shell

A sidebar frame with a navbar, a collapsible menu and a dark-mode toggle. Every page renders inside it.

### rAPId

```ts
import { SidebarLayout } from "@tundralibs/ui/layouts";
import { asRapidLayout } from "@tundralibs/ui/templates/layout";
import { createCoreTemplate } from "@tundralibs/ui/templates/core";
import { errorTemplates } from "@tundralibs/ui/templates/errors";
import { Navbar } from "@tundralibs/ui/navbar";
import { Sidebar } from "@tundralibs/ui/sidebar";
import { Button } from "@tundralibs/ui/button";
import { Icon } from "@tundralibs/ui/shared/icons";

const frame = (body: Html) =>
  SidebarLayout({
    sidebarId: "nav",
    header: Navbar({
      brand: "Acme",
      actions: Button({ label: "Dark", size: "sm", variant: "outline", attrs: { "data-theme-toggle": "" } }),
    }),
    sidebar: Sidebar({
      id: "nav",
      collapsible: true,
      items: [
        { label: "Dashboard", href: "/", icon: Icon("dashboard", { size: 18 }), active: true },
        { label: "Invoices", href: "/invoices", icon: Icon("invoice", { size: 18 }) },
        { label: "Settings", href: "/settings", icon: Icon("settings", { size: 18 }) },
      ],
    }),
    content: body,
  });

const app = await Application.initialize({
  name: "acme",
  ui: {
    core: createCoreTemplate({ history: true }),
    layout: asRapidLayout((body) => frame(body)),
    errorTemplates,
    prefer: "html",
    history: true,
  },
});
```

The frame is a closure fixed at start-up; only `body` flows through per request. Mark the current item `active` from the
route (the example app's `withActive()` helper does that by path). The content region is `#main-content`, which is what
history push needs.

### Plain HTML

```html
<div class="layout layout--sidebar">
  <header class="layout__header">
    <button type="button" class="navbar__toggle navbar__toggle--sidebar js-only layout__drawer-toggle"
      data-toggle="#nav" data-toggle-class="" aria-expanded="false" aria-controls="nav"
      aria-label="Open navigation">&#9776;</button>
    <nav class="navbar">
      <div class="navbar__brand">Acme</div>
      <div class="navbar__spacer"></div>
      <div class="navbar__actions">
        <button type="button" class="btn btn--outline btn--sm" data-theme-toggle="">Dark</button>
      </div>
    </nav>
  </header>
  <div class="layout__body">
    <aside class="sidebar" id="nav">
      <nav class="sidebar__nav" aria-label="Main">
        <ul class="menu__list">
          <li><a class="menu__link menu__link--active" href="/" aria-current="page">
            <span class="menu__icon"><svg …>…</svg></span><span class="menu__link-label">Dashboard</span></a></li>
          <li><a class="menu__link" href="/invoices">
            <span class="menu__icon"><svg …>…</svg></span><span class="menu__link-label">Invoices</span></a></li>
          <li><a class="menu__link" href="/settings">
            <span class="menu__icon"><svg …>…</svg></span><span class="menu__link-label">Settings</span></a></li>
        </ul>
      </nav>
      <button type="button" class="sidebar__collapse-toggle js-only" data-collapse="#nav" aria-expanded="true"
        aria-label="Collapse sidebar">
        <span class="sidebar__collapse-icon">&#8249;</span><span class="sidebar__collapse-label">Collapse</span>
      </button>
    </aside>
    <div class="layout__backdrop" data-toggle-close="#nav"></div>
    <main class="layout__content" id="main-content">
      <div class="page-header">
        <div class="page-header__heading">
          <h1 class="page-header__title">Dashboard</h1>
        </div>
      </div>
      <p>Page content goes here.</p>
    </main>
  </div>
</div>
```

Below 992px the sidebar is an off-canvas drawer: the `navbar__toggle` opens it, the backdrop and Escape close it. The
collapse toggle and the theme toggle are wired by `ui.js`; `.js-only` hides them on a page without it.

---

## 2. Sign-in page

A centred card beside a narrative panel, a form that re-renders with field errors, and a route that serves both the swap
(JavaScript) and the redirect (no JavaScript).

### rAPId

```ts
import type { RapidFormError } from "@tundralibs/rapid/ui";
import { AuthLayout } from "@tundralibs/ui/layouts";
import { Form } from "@tundralibs/ui/form";
import { FormActions, FormField, FormGrid } from "@tundralibs/ui/form-field";
import { Input } from "@tundralibs/ui/input";
import { Switch } from "@tundralibs/ui/switch";

type SignIn = { state: "clean" } | RapidFormError;

const signInForm = (s: SignIn) =>
  Form({
    id: "signin",
    action: "/signin",
    error: s.state === "error" ? s : undefined,
    attrs: { "data-action": "/signin", "data-target": "#signin", "data-swap": "outer" },
    content: html`${
      FormGrid({
        fields: [
          FormField({
            id: "email",
            label: "Email",
            required: true,
            error: s.state === "error" ? s.fields.email : undefined,
            control: (a) =>
              Input({
                id: a.id,
                name: "email",
                type: "email",
                value: s.state === "error" ? s.values.email : undefined,
                invalid: a.invalid,
                attrs: { "aria-describedby": a.describedBy, autocomplete: "email" },
              }),
          }),
          FormField({
            id: "password",
            label: "Password",
            required: true,
            error: s.state === "error" ? s.fields.password : undefined,
            control: (a) =>
              Input({
                id: a.id,
                name: "password",
                type: "password",
                invalid: a.invalid,
                attrs: { "aria-describedby": a.describedBy, autocomplete: "current-password" },
              }),
          }),
          Switch({ label: "Keep me signed in", name: "remember" }),
        ],
      })
    }${FormActions({ content: Button({ label: "Sign in", type: "submit", block: true }) })}`,
  });

const SignInPage = template<SignIn>((s) =>
  AuthLayout({
    brand: "Acme",
    split: true,
    narrative: html`
      <h2>Welcome back</h2>
      <p>Invoices, payments and reports in one place.</p>
    `,
    content: signInForm(s),
  }), "SignInPage");

app.get("/signin", { template: SignInPage, layout: false }, () => ({ content: { state: "clean" } }));
app.post("/signin", { template: { render: SignInPage, prefer: "html" }, layout: false }, async (ctx) => {
  const body = ((await ctx.payload) ?? {}) as Record<string, string>;
  const user = await users.verify(body.email, body.password);
  if (!user) {
    const error: RapidFormError = {
      state: "error",
      message: "Check the highlighted fields.",
      fields: { password: "Wrong password." },
      values: { email: body.email ?? "" }, // never the password
    };
    return { content: error };
  }
  await session.start(ctx, user);
  if (!ctx.isSwap) return { content: { state: "clean" }, redirect: "/" }; // no JS: Post/Redirect/Get
  return { content: { state: "clean" }, redirect: "/" }; // JS: the runtime follows rapid-redirect
});
```

`Input({ type: "password" })` renders the password field with its Show/Hide toggle (the `.js-only` button is hidden
without JS). The form's `id` is the swap target, so a validation failure re-renders just the form in place, with the
values the server chose to keep. Pass the error's `fields[name]` to each `FormField`, and use the `control` callback so
the input gets `aria-describedby` and `aria-invalid` for free. `layout: false` because `AuthLayout` is a complete frame.

### Plain HTML

The clean form, and (second block) the same form as the server re-renders it after a failed attempt:

```html
<form class="form" id="signin" action="/signin" method="post">
  <div class="form-grid">
    <div class="form-field">
      <label class="form-field__label"
        for="email">Email<span class="form-field__required" aria-hidden="true">*</span></label>
      <input type="email" class="input" autocomplete="email" id="email" name="email">
    </div>
    <div class="form-field">
      <label class="form-field__label"
        for="password">Password<span class="form-field__required" aria-hidden="true">*</span></label>
      <div class="password" data-password data-strength-level="0">
        <div class="password__field">
          <input type="password" class="input password__input" autocomplete="current-password" id="password"
            name="password">
          <button type="button" class="password__reveal js-only" data-password-reveal aria-controls="password"
            aria-pressed="false" data-label-show="Show" data-label-hide="Hide">Show</button>
        </div>
      </div>
    </div>
    <label class="switch">
      <input type="checkbox" class="switch__input" name="remember">
      <span class="switch__track"><span class="switch__thumb"></span></span>
      <span class="switch__label">Keep me signed in</span>
    </label>
  </div>
  <div class="form-actions"><button type="submit" class="btn btn--block">Sign in</button></div>
</form>
```

```html
<form class="form" id="signin" action="/signin" method="post">
  <div class="alert alert--danger" role="alert">
    <span class="alert__icon"><svg …>…</svg></span>
    <div class="alert__body">
      <div class="alert__title">Check the highlighted fields.</div>
      <ul class="alert__list">
        <li class="alert__field"><span class="alert__field-name">password</span>Wrong password.</li>
      </ul>
    </div>
  </div>
  <div class="form-grid">
    <div class="form-field">
      <label class="form-field__label" for="email">Email<span class="form-field__required" aria-hidden="true">*</span></label>
      <input type="email" class="input" autocomplete="email" id="email" name="email" value="ada@acme.com">
    </div>
    <div class="form-field">
      <label class="form-field__label" for="password">Password<span class="form-field__required" aria-hidden="true">*</span></label>
      <div class="password" data-password data-strength-level="0">
        <div class="password__field">
          <input type="password" class="input password__input input--invalid" aria-describedby="password-error"
            autocomplete="current-password" id="password" name="password" aria-invalid="true">
          <button type="button" class="password__reveal js-only" data-password-reveal aria-controls="password"
            aria-pressed="false" data-label-show="Show" data-label-hide="Hide">Show</button>
        </div>
      </div>
      <p class="form-field__error" id="password-error" role="alert">Wrong password.</p>
    </div>
    …
  </div>
  <div class="form-actions"><button type="submit" class="btn btn--block">Sign in</button></div>
</form>
```

For the full page wrap it as `AuthLayout` renders: `<div class="layout layout--auth layout--auth-split">` holding a
`<section class="layout__auth-narrative">` and a `<main class="layout__auth-form" id="main-content">` whose
`.layout__auth-panel` contains the brand and the form (see [Layouts](./UI-Layouts.md)). Without rAPId the `data-action`
attributes are simply left out and the post is a normal navigation.

---

## 3. Dashboard

Stat tiles that load lazily, a chart on the library's tokens, and an activity timeline.

### rAPId

```ts
import { Grid, GridCol } from "@tundralibs/ui/grid";
import { PageHeader } from "@tundralibs/ui/page-header";
import { Stat } from "@tundralibs/ui/stat";
import { Card } from "@tundralibs/ui/card";
import { APEXCHARTS, Chart } from "@tundralibs/ui/chart";
import { SkeletonTable } from "@tundralibs/ui/skeleton";
import { Timeline } from "@tundralibs/ui/timeline";

type Stats = { revenue: string; open: number; overdue: number };
const statsRow = (s: Stats) =>
  Grid({
    items: [
      GridCol({
        span: 4,
        content: Stat({ label: "Revenue (30d)", value: s.revenue, trend: { label: "+12.4%", up: true } }),
      }),
      GridCol({ span: 4, content: Stat({ label: "Open invoices", value: String(s.open) }) }),
      GridCol({ span: 4, content: Stat({ label: "Overdue", value: String(s.overdue), tone: "danger" }) }),
    ],
  });
const StatsFragment = template<Stats>(statsRow, "StatsFragment");

const Dashboard = template<Record<never, never>>(
  () =>
    html`${
      PageHeader({ title: "Dashboard", subtitle: "The last 30 days." })
    }<div id="stats" data-load data-action="/fragments/stats">${
      SkeletonTable({ rows: 1, columns: [["lg", "sm"], ["lg", "sm"], ["lg", "sm"]] })
    }</div>${
      Grid({
        items: [
          GridCol({
            span: 8,
            content: Card({
              title: "Revenue",
              body: Chart({
                id: "revenue",
                type: "area",
                series: [{ name: "Revenue", data: [12, 19, 14, 22, 28, 25, 31] }],
                categories: ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
              }),
            }),
          }),
          GridCol({
            span: 4,
            content: Card({
              title: "Activity",
              body: Timeline({
                items: [
                  { title: "INV-2048 paid", meta: "2 hours ago", status: "done" },
                  { title: "Reminder sent to Contoso", meta: "Yesterday", status: "done" },
                  { title: "Quarter close", meta: "30 Sep", status: "pending" },
                ],
              }),
            }),
          }),
        ],
      })
    }`,
  "Dashboard",
);

app.get("/", { template: Dashboard }, () => ({ content: {} }));
app.get("/fragments/stats", { template: StatsFragment }, async () => ({ content: await reports.last30Days() }));
```

Pass `APEXCHARTS` in `createCoreTemplate({ scripts: [APEXCHARTS] })` (pinned, with its integrity hash). The `data-load`
region fetches `/fragments/stats` on mount and swaps the reply in; the skeleton is what the page shows until then.
Charts follow the theme and the dark toggle automatically.

### Plain HTML

```html
<div class="page-header">
  <div class="page-header__heading">
    <h1 class="page-header__title">Dashboard</h1>
    <p class="page-header__subtitle">The last 30 days.</p>
  </div>
</div>

<div class="grid">
  <div class="col-4">
    <div class="stat">
    <span class="stat__label">Revenue (30d)</span><span class="stat__value">$48,200</span>
    <span class="stat__trend"><span class="badge badge--success">+12.4%</span></span>
  </div>
  </div>
  <div class="col-4">
    <div class="stat"><span class="stat__label">Open invoices</span><span class="stat__value">12</span></div>
  </div>
  <div class="col-4">
    <div class="stat stat--danger"><span class="stat__label">Overdue</span><span class="stat__value">3</span></div>
  </div>
</div>

<div class="grid">
  <div class="col-8">
    <div class="card">
      <div class="card__content">
        <div class="card__header">
          <div class="card__heading">
            <div class="card__title">Revenue</div>
          </div>
        </div>
        <div class="card__body">
          <div class="chart" id="revenue" data-chart-type="area"
            data-chart='{"chart":{"type":"area","height":240},"series":[{"name":"Revenue","data":[12,19,14,22,28,25,31]}],"xaxis":{"categories":["Mar","Apr","May","Jun","Jul","Aug","Sep"]}}'></div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-4">
    <div class="card">
      <div class="card__content">
        <div class="card__header">
          <div class="card__heading">
            <div class="card__title">Activity</div>
          </div>
        </div>
        <div class="card__body">
          <ol class="timeline">
            <li class="timeline__item timeline__item--done">
              <span
                class="timeline__rail"><span class="timeline__marker"><svg …>…</svg></span><span class="timeline__line"></span></span>
              <span
                class="timeline__body"><span class="timeline__title">INV-2048 paid</span><span class="timeline__meta">2 hours ago</span></span>
            </li>
            <li class="timeline__item timeline__item--pending">
              <span
                class="timeline__rail"><span class="timeline__marker"></span><span class="timeline__line"></span></span>
              <span
                class="timeline__body"><span class="timeline__title">Quarter close</span><span class="timeline__meta">30 Sep</span></span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>
```

Without a runtime there is no lazy region: render the stats inline (as above). The chart needs the ApexCharts script tag
on the page (`ChartScript()` renders the pinned one); `ui.js` reads `data-chart` and draws it.

---

## 4. Invoices

The page most products have: a sortable, selectable table with bulk actions that post the selection, a per-row action
strip, a client-side filter, and pagination — all on one URL that back/forward and reloads understand.

### rAPId

```ts
import { DataTable, RowActions } from "@tundralibs/ui/data-table";
import { Pagination } from "@tundralibs/ui/pagination";
import { Badge } from "@tundralibs/ui/badge";
import { Empty } from "@tundralibs/ui/empty";

type Invoice = { id: string; client: string; status: string; total: string };
type Sort = { key: string; dir: "asc" | "desc" };

const invoicesTable = (rows: Invoice[], sort: Sort, page: number, totalPages: number) =>
  DataTable<Invoice>({
    id: "invoices",
    title: "Invoices",
    selectable: true,
    sort,
    buildSortHref: (key, dir) => `/invoices?sort=${key}&dir=${dir}`,
    bulkAction: `/invoices/bulk?sort=${sort.key}&dir=${sort.dir}`,
    columns: [
      { key: "id", label: "Invoice", pinned: true, mono: true, sortable: true },
      { key: "client", label: "Client", sortable: true },
      {
        key: "status",
        label: "Status",
        render: (r) =>
          Badge({
            label: r.status,
            variant: r.status === "Paid" ? "success" : r.status === "Overdue" ? "danger" : "info",
            dot: true,
          }),
      },
      { key: "total", label: "Total", numeric: true, sortable: true },
    ],
    rows,
    rowKey: (r) => r.id,
    bulkActions: html`${
      Button({ label: "Send reminders", size: "sm", type: "submit", attrs: { name: "op", value: "remind" } })
    }${
      Button({
        label: "Archive",
        size: "sm",
        variant: "danger",
        type: "submit",
        attrs: { name: "op", value: "archive" },
      })
    }${Button({ label: "Clear", size: "sm", attrs: { "data-bulk-clear": "" } })}`,
    rowActions: (r) =>
      RowActions({
        id: `inv-${r.id}`,
        label: `Actions for ${r.id}`,
        items: [
          { label: "View", href: `/invoices/${r.id}` },
          {
            label: "Duplicate",
            attrs: {
              "data-action": `/invoices/${r.id}/duplicate`,
              "data-method": "post",
              "data-target": "#invoices",
              "data-swap": "outer",
            },
          },
          {
            label: "Archive",
            danger: true,
            attrs: {
              "data-action": `/invoices/${r.id}/archive`,
              "data-method": "post",
              "data-target": "#invoices",
              "data-swap": "outer",
            },
          },
        ],
      }),
    toolbar: Input({
      type: "search",
      size: "sm",
      placeholder: "Filter this page",
      attrs: { "data-table-search": "", "aria-label": "Filter invoices" },
    }),
    footer: Pagination({
      page,
      totalPages,
      buildHref: (p) => `/invoices?page=${p}&sort=${sort.key}&dir=${sort.dir}`,
      target: "#invoices",
    }),
    empty: Empty({ variant: "inline", title: "No invoices yet", icon: "invoice" }),
    attrs: { "data-filter-scope": "" },
  });

type InvoicesData = { rows: Invoice[]; sort: Sort; page: number; totalPages: number; fragment: boolean };
const InvoicesPage = template<InvoicesData>(
  (d) =>
    d.fragment
      ? invoicesTable(d.rows, d.sort, d.page, d.totalPages)
      : html`${PageHeader({ title: "Invoices", actions: Button({ label: "New invoice", href: "/invoices/new" }) })}${
        invoicesTable(d.rows, d.sort, d.page, d.totalPages)
      }`,
  "InvoicesPage",
);

const query = (url: string) => {
  const q = new URL(url).searchParams;
  return {
    sort: { key: q.get("sort") ?? "id", dir: q.get("dir") === "asc" ? "asc" as const : "desc" as const },
    page: Math.max(1, Number(q.get("page") ?? 1)),
  };
};

app.get("/invoices", { template: InvoicesPage }, async (ctx) => {
  const { sort, page } = query(ctx.url);
  const { rows, totalPages } = await invoices.list({ sort, page });
  // A swap gets just the table; a navigation, a reload or a deep link gets the page.
  return { content: { rows, sort, page, totalPages, fragment: ctx.isSwap } };
});

app.post("/invoices/bulk", { template: { render: InvoicesPage, prefer: "html" } }, async (ctx) => {
  const body = ((await ctx.payload) ?? {}) as Record<string, string | string[]>;
  const ids = ([] as string[]).concat(body.selected ?? []);
  if (body.op === "archive") await invoices.archive(ids);
  if (body.op === "remind") await invoices.remind(ids);
  const { sort, page } = query(ctx.url);
  const { rows, totalPages } = await invoices.list({ sort, page });
  if (!ctx.isSwap) {
    return {
      content: { rows, sort, page, totalPages, fragment: false },
      redirect: `/invoices${new URL(ctx.url).search}`,
    };
  }
  return { content: { rows, sort, page, totalPages, fragment: true } };
});
```

What you get without writing any client code: sort and page links swap only the table and push history (back and forward
re-fetch the right state, a reload of the pushed URL renders the whole page); ticking rows shows the bulk bar over the
header row; each bulk button posts `op` plus one `selected` per checked row through the table's own form, and the reply
replaces the table; a selection survives a sort; the search box filters the rows on the page; a row's kebab opens its
action strip inside the row. The table wears a busy veil while any of it is in flight.

### Plain HTML

Sort and page links are ordinary links your server answers with the whole page; the bulk form is an ordinary post.
Selection, the bulk bar, the row strip and the filter still work from `ui.js`. Two rows shown, icons elided:

```html
<div class="data-table" data-filter-scope="" id="invoices">
  <div class="data-table__toolbar">
    <span class="data-table__title">Invoices</span>
    <input type="search" class="input input--sm" data-table-search="" aria-label="Filter invoices"
      placeholder="Filter this page">
  </div>
  <form class="data-table__form" method="post" action="/invoices/bulk?sort=id&amp;dir=desc">
    <div class="data-table__scroll">
      <div class="data-table__bulk" hidden data-bulk-bar>
        <span class="data-table__bulk-count" data-bulk-count>0 rows selected</span>
        <span class="data-table__bulk-sep"></span>
        <button type="submit" class="btn btn--sm" name="op" value="remind">Send reminders</button>
        <button type="submit" class="btn btn--danger btn--sm" name="op" value="archive">Archive</button>
        <button type="button" class="btn btn--sm" data-bulk-clear="">Clear</button>
      </div>
      <table class="data-table__table">
        <thead>
          <tr>
            <th class="data-table__select"><input type="checkbox" aria-label="Select all rows" data-select-all></th>
            <th class="data-table__cell--pinned" aria-sort="descending">
              <a class="data-table__sort" href="/invoices?sort=id&amp;dir=asc">INVOICE <svg …>…</svg></a></th>
            <th><a class="data-table__sort" href="/invoices?sort=client&amp;dir=asc">CLIENT</a></th>
            <th>STATUS</th>
            <th
              class="data-table__num"><a class="data-table__sort" href="/invoices?sort=total&amp;dir=asc">TOTAL</a></th>
            <th class="data-table__actions"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr class="data-table__row" data-row-key="INV-2048">
            <td
              class="data-table__select"><input type="checkbox" name="selected" aria-label="Select row INV-2048" data-select-row value="INV-2048"></td>
            <td class="data-table__cell--pinned data-table__mono">INV-2048</td>
            <td>Northwind Traders</td>
            <td><span class="badge badge--success"><span class="badge__dot" aria-hidden="true"></span>Paid</span></td>
            <td class="data-table__num">$12,400.00</td>
            <td class="data-table__actions">
              <button type="button" class="btn btn--ghost btn--sm btn--icon" data-row-actions="#inv-INV-2048-strip"
                aria-expanded="false"
                aria-controls="inv-INV-2048-strip"><svg …>…</svg><span class="sr-only">Actions for INV-2048</span></button>
              <div class="data-table__row-actions" id="inv-INV-2048-strip" role="group"
                aria-label="Actions for INV-2048" hidden>
                <a class="btn btn--sm" href="/invoices/INV-2048">View</a>
                <form method="post"
                  action="/invoices/INV-2048/duplicate"><button type="submit" class="btn btn--sm">Duplicate</button></form>
                <span class="data-table__row-actions-sep"></span>
                <form method="post"
                  action="/invoices/INV-2048/archive"><button type="submit" class="btn btn--sm btn--danger">Archive</button></form>
                <span class="data-table__row-actions-sep"></span>
                <button type="button" class="btn btn--ghost btn--sm btn--icon" data-row-actions-close
                  aria-label="Close actions"><svg …>…</svg></button>
              </div>
            </td>
          </tr>
          <tr class="data-table__row" data-row-key="INV-2047">
            <td
              class="data-table__select"><input type="checkbox" name="selected" aria-label="Select row INV-2047" data-select-row value="INV-2047"></td>
            <td class="data-table__cell--pinned data-table__mono">INV-2047</td>
            <td>Contoso Ltd</td>
            <td><span class="badge badge--info"><span class="badge__dot" aria-hidden="true"></span>Open</span></td>
            <td class="data-table__num">$3,120.00</td>
            <td class="data-table__actions">…</td>
          </tr>
        </tbody>
      </table>
    </div>
  </form>
  <div class="data-table__footer">
    <nav class="pagination" aria-label="Pagination">…</nav>
  </div>
</div>
```

In the rAPId render the sort links, the bulk form and the row buttons also carry `data-action` /
`data-target="#invoices"` / `data-swap="outer"` (and `data-push` on the links); here the row's Duplicate and Archive are
small POST forms instead, since a state change must never be a GET link.

---

## 5. Attachments with upload progress

A dropzone inside a form. The upload is a real multipart post; while it streams, each picked file shows a row with a
progress bar; when the server answers, its own rows replace them.

### rAPId

```ts
import { Dropzone, type DropzoneFile } from "@tundralibs/ui/dropzone";

const attachments = (files: DropzoneFile[]) =>
  Dropzone({
    id: "attachments",
    name: "files",
    multiple: true,
    accept: ".pdf,.png",
    hint: "PDF or PNG, up to 10 MB",
    files,
  });

const uploadForm = (files: DropzoneFile[]) =>
  Form({
    id: "attach",
    action: "/invoices/INV-2048/attachments",
    attrs: { "data-action": "/invoices/INV-2048/attachments", "data-target": "#attachments", "data-swap": "outer" },
    content: html`${attachments(files)}${FormActions({ content: Button({ label: "Upload", type: "submit" }) })}`,
  });

const AttachmentsFragment = template<{ files: DropzoneFile[] }>((d) => attachments(d.files), "AttachmentsFragment");

const app = await Application.initialize({
  name: "acme",
  uploads: { allowedExtensions: [".pdf", ".png"] }, // rAPId refuses every upload until you declare these
  ui: {/* … */},
});

app.post("/invoices/:id:/attachments", { template: AttachmentsFragment }, async (ctx) => {
  const body = ((await ctx.payload) ?? {}) as Record<string, unknown>;
  const picked = ([] as { name: string; path: string; size: number }[]).concat((body.files as never) ?? []);
  const stored = await attachmentsStore.add(ctx.params.id, picked); // move the temp files somewhere permanent
  return {
    content: {
      files: stored.map((f) => ({
        name: f.name,
        kind: f.name.split(".").pop(),
        size: f.sizeLabel,
        removeHref: `/invoices/${ctx.params.id}/attachments/${f.id}/delete`,
      })),
    },
  };
});
```

On submit, `ui.js` renders a pending row per picked file (indeterminate bar). rAPId streams the body over
`XMLHttpRequest` and emits `rapid:progress` on the target as bytes leave; the bars fill. The rows stay pending until the
reply lands, because 100% uploaded is not yet stored. The reply is the dropzone with your rows — a file input is never
echoed back, so `files` always comes from your own store — and each row's remove button is a small POST form that swaps
the dropzone again. `rapid:error` marks the pending rows "Upload failed".

### Plain HTML

```html
<form class="form" id="attach" action="/invoices/INV-2048/attachments" method="post" enctype="multipart/form-data">
  <div class="dropzone" id="attachments" data-dropzone>
    <div class="dropzone__area">
      <input class="dropzone__input" id="attachments-input" type="file" name="files" aria-labelledby="attachments-label"
        accept=".pdf,.png" multiple="" aria-describedby="attachments-hint">
      <span class="dropzone__icon"><svg …>…</svg></span>
      <span class="dropzone__label"
        id="attachments-label">Drop files, or <span class="dropzone__browse">browse</span></span>
      <span class="dropzone__hint" id="attachments-hint">PDF or PNG, up to 10 MB</span>
    </div>
    <div class="dropzone__files">
      <div class="dropzone__file dropzone__file--done">
        <span class="dropzone__file-icon"><svg …>…</svg></span>
        <span class="dropzone__file-body">
          <span
            class="dropzone__file-row"><span class="dropzone__file-name">contract.pdf</span><span class="dropzone__file-size">2.4 MB</span></span>
        </span>
        <form method="post" action="/invoices/INV-2048/attachments/contract.pdf/delete">
          <button type="submit" class="dropzone__remove" aria-label="Remove contract.pdf"><svg …>…</svg></button>
        </form>
      </div>
    </div>
  </div>
  <div class="form-actions"><button type="submit" class="btn">Upload</button></div>
</form>
```

The native file input covers the drop area, so click, keyboard and drag-and-drop all work without a script; the
drag-over highlight comes from `ui.js`. Add `enctype="multipart/form-data"` yourself (rAPId's runtime posts `FormData`,
a plain form needs the attribute). Progress needs the runtime; a plain post shows the browser's own progress.

---

## 6. Search: a server-filtered combobox and a command palette

### rAPId

```ts
import { Combobox, ComboboxList } from "@tundralibs/ui/combobox";
import { Command, CommandList } from "@tundralibs/ui/command";

const reviewer = Combobox({
  id: "reviewer",
  name: "reviewer",
  label: "Reviewer",
  placeholder: "Type a name…",
  action: "/fragments/reviewers",
  options: [{ value: "ada", label: "Ada Lovelace", meta: "Finance" }, {
    value: "grace",
    label: "Grace Hopper",
    meta: "Ops",
  }],
});
const ReviewersFragment = template<{ q: string; options: { value: string; label: string; meta?: string }[] }>(
  (d) => ComboboxList({ id: "reviewer", query: d.q, options: d.options }),
  "ReviewersFragment",
);

const palette = Command({
  id: "palette",
  action: "/fragments/commands",
  placeholder: "Jump to…",
  items: [
    { label: "New invoice", group: "Actions", icon: "plus", shortcut: "N" },
    { label: "Contoso Ltd", group: "Clients", badge: "CL", href: "/clients/contoso" },
  ],
});
const CommandsFragment = template<{ q: string; items: { label: string; href?: string; group?: string }[] }>(
  (d) => CommandList({ id: "palette", query: d.q, items: d.items }),
  "CommandsFragment",
);

const openPalette = Button({
  label: "Search",
  size: "sm",
  variant: "outline",
  attrs: { "data-command-open": "#palette" },
});

app.get("/fragments/reviewers", { template: ReviewersFragment }, async (ctx) => {
  const q = new URL(ctx.url).searchParams.get("q") ?? "";
  return { content: { q, options: await people.search(q) } };
});
app.get("/fragments/commands", { template: CommandsFragment }, async (ctx) => {
  const q = new URL(ctx.url).searchParams.get("q") ?? "";
  return { content: { q, items: await search.everything(q) } };
});
```

Each keystroke (debounced) fetches `action?q=…` and swaps the reply into the list; the input keeps focus, arrow keys and
Enter pick, the hidden input carries the picked value under `name`. `⌘K` (or the button) opens the palette; Escape
closes it and returns focus.

### Plain HTML

Leave `data-combobox-action` / `data-command-action` out and the same markup filters the rendered options on the client
— for a few hundred options that is all you need:

```html
<div class="combobox" data-combobox>
  <label class="form-field__label" for="reviewer">Reviewer</label>
  <div class="combobox__anchor">
    <div class="combobox__field">
      <input type="hidden" name="reviewer" value="" data-combobox-value>
      <input class="combobox__input" id="reviewer" type="text" role="combobox" autocomplete="off" value=""
        placeholder="Type a name…"
        aria-expanded="false" aria-controls="reviewer-list" aria-autocomplete="list">
      <span class="combobox__caret"><svg …>…</svg></span>
    </div>
    <div class="combobox__list" id="reviewer-list" role="listbox" hidden>
      <div class="combobox__option" role="option" id="reviewer-opt-0" aria-selected="false" data-value="ada">
        <span class="combobox__option-label">Ada Lovelace</span><span class="combobox__option-meta">Finance</span></div>
      <div class="combobox__option" role="option" id="reviewer-opt-1" aria-selected="false" data-value="grace">
        <span class="combobox__option-label">Grace Hopper</span><span class="combobox__option-meta">Ops</span></div>
      <div
        class="combobox__hints"><span>&uarr;&darr; navigate</span><span>&crarr; select</span><span class="combobox__count">2 matches</span></div>
    </div>
  </div>
</div>

<button type="button" class="btn btn--outline btn--sm" data-command-open="#palette">Search</button>
<div class="command" id="palette" data-command hidden>
  <div class="command__sheet" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="command__search">
      <span class="command__search-icon"><svg …>…</svg></span>
      <input class="command__input" type="text" role="combobox" autocomplete="off" aria-label="Run a command"
        aria-controls="palette-list" aria-expanded="true" value="" placeholder="Jump to…">
      <button type="button" class="command__kbd command__esc" data-command-dismiss>esc</button>
    </div>
    <div class="command__list" id="palette-list" role="listbox">
      <div class="command__group" role="presentation">Actions</div>
      <button type="button" class="command__item" id="palette-item-0" role="option">
        <span class="command__item-icon"><svg …>…</svg></span><span class="command__item-label">New invoice</span><span class="command__kbd">N</span></button>
      <div class="command__group" role="presentation">Clients</div>
      <a class="command__item" id="palette-item-1" href="/clients/contoso" role="option">
        <span class="command__item-badge">CL</span><span class="command__item-label">Contoso Ltd</span></a>
    </div>
    <div
      class="command__footer"><span>&uarr;&darr; move</span><span>&crarr; run</span><span class="command__count">2 results</span></div>
  </div>
</div>
```

---

## 7. Notifications

A server-sent toast after an action, and a live feed without opening a socket of your own.

### rAPId

```ts
import { Toast } from "@tundralibs/ui/toast";

const ReminderToast = template<{ client: string }>(
  (d) => Toast({ variant: "success", body: `Reminder sent to ${d.client}`, dismissible: true, autoDismissMs: 6000 }),
  "ReminderToast",
);

const remindButton = (id: string) =>
  Button({
    label: "Send reminder",
    size: "sm",
    attrs: {
      "data-action": `/invoices/${id}/remind`,
      "data-method": "post",
      "data-target": "#toast-region",
      "data-swap": "append",
    },
  });

app.post("/invoices/:id:/remind", { template: ReminderToast }, async (ctx) => {
  const invoice = await invoices.remind(ctx.params.id);
  return { content: { client: invoice.client } };
});
```

`createCoreTemplate()` puts `#toast-region` on every page; the button appends the reply there and `ui.js` dismisses it
after six seconds. For live updates (`ui: { live: true }`, `createCoreTemplate({ live: true })`) listen for `rapid:push`
and drop a toast in — the runtime owns the one socket:

```ts
// in your own deferred script
document.addEventListener("rapid:push", (e) => {
  const { channel, data } = (e as CustomEvent).detail;
  if (channel === "invoices") {
    window.rapid.swap(`/fragments/toast?event=${data.id}`, "#toast-region", { swap: "append" });
  }
});
```

### Plain HTML

Keep toasts in a `<template>` and play them with a button that carries `data-toast-open`:

```html
<div class="toast-region" id="toast-region" role="status" aria-live="polite"></div>

<template id="reminder-toast">
  <div class="toast toast--success" data-dismissible="" data-toast-autodismiss="6000">
    <span class="toast__icon"><svg …>…</svg></span>
    <div class="toast__body">Reminder sent to Contoso Ltd</div>
    <button type="button" class="toast__close" data-dismiss aria-label="Dismiss"><svg …>…</svg></button>
  </div>
</template>

<button type="button" class="btn btn--sm" data-toast-open="#reminder-toast">Send reminder</button>
```

`ui.js` clones the template into the region, dismisses on the close button or after `data-toast-autodismiss`
milliseconds, and stacks several. Server-rendered pages can also just include the toast markup in the region on the next
render.

---

## Where to go next

- The [example app](./UI-Rapid.md#the-example-app) is all of these recipes running: `deno task app`, then read
  `examples/app/app.ts`.
- The catalogue (`deno task build:demos`, `demo/index.html`) shows every component in every state, with the exact markup
  to copy for a plain page.
- [Theming](./UI-Theming.md) is how the same pages take your palette.
