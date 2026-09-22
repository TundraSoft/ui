# Components

A tour of every component by group, with the props you reach for first and the behaviour that comes with it. Each
heading links to the generated reference page with the complete prop table, CSS hooks, `data-*` attributes, and a
**Usage** section: one or two real call sites, each with the HTML it renders — the markup a plain page writes. All
snippets are TypeScript against `@tundralibs/rapid/ui`'s `html`; the markup they produce is what a plain HTML page
writes by hand.

Common to every component: `attrs` spreads extra attributes onto the root (a caller's `class` is merged, not dropped);
`id`s are stable and derived from what you pass (never counters), so `aria-controls`, `data-toggle` and history push
survive a swap; nothing emits an inline style. For whole pages built from these — a sign-in page, a dashboard, an
invoices table with bulk actions, an upload with progress — in both rAPId and plain HTML, see
[Recipes](./UI-Recipes.md).

---

## Forms

### [Input](./reference/components-input.md)

```ts
Input({ id: "email", name: "email", type: "email", placeholder: "you@acme.com", required: true });
Input({ value: "Locked", disabled: true });
Input({ value: "bad", invalid: true }); // aria-invalid + danger border
Input({ type: "date", name: "due" }); // renders the DatePicker
Input({ size: "sm" | "md" | "lg" });
```

`type: "password"` renders the [password field](#password-input-type-password) — the same `<input>` with a Show/Hide
toggle, and `strength` / `strengthMin` / `match` for sign-up forms; `reveal: false` is the bare control. Constraints are
typed props that render the native attributes — `required`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `step` —
plus `match: "#other"` for a confirm field and `messages` (per-rule text for the validator, see
[Form](#formfield-form)). The browser enforces them on its own; `Form({ validate: true })` shows them inline.

Some types carry their own sugar, all progressive and all posting plain fields:

```ts
Input({ type: "email", name: "email", domains: ["acme.com", "acme.io"] }); // local part · @ · domain select → email + email-domain
Input({ type: "tel", name: "phone", countries: [{ code: "+1", label: "US" }, { code: "+44", label: "UK" }] }); // phone-country + phone
Input({ type: "url", name: "website", scheme: "https://" }); // website-scheme (hidden) + website
Input({ type: "number", name: "price", prefix: "$", suffix: "per seat" }); // an InputGroup without the ceremony
Input({ name: "title", maxLength: 60, counter: true }); // "12 / 60" under the field
Input({ type: "search", name: "q" }); // a clear button, on by default (clearable: false)
Input({ name: "handle", validateAction: "/fragments/check-handle" }); // asks the server on blur ("taken")
```

The composite fields (email domains, tel countries, url scheme) submit two parts each; a handler joins them with
`emailFrom` / `telFrom` / `urlFrom` from `@tundralibs/ui/shared/compose`, which also pass a whole value through
untouched. `validateAction` posts `<name>=<value>` once the native rules pass and shows a non-empty text reply as the
field's error, pinned until the value changes.

`FloatingInput({ id, name, label })` is the floating-label variant. `InputIcon({ icon, control, end? })` puts an icon in
the field; `InputGroup({ start, end, control })` adds prefix/suffix addons — text, or a `Select` (give the inner control
`extraClass: "input-group__control"`).

### [Textarea](./reference/components-textarea.md)

```ts
Textarea({ id: "bio", name: "bio", rows: 4, placeholder: "A short bio…" });
Textarea({ id: "memo", name: "memo", maxLength: 280, counter: true, autosize: true }); // counter + grows with the content
```

### [Select](./reference/components-select.md)

```ts
Select({
  id: "plan",
  name: "plan",
  value: "team",
  placeholder: "Pick a plan",
  options: [{ value: "free", label: "Free" }, { value: "team", label: "Team" }, {
    value: "x",
    label: "Sold out",
    disabled: true,
  }],
});
```

Looks and behaves like the combobox (field, caret, list, arrow keys, type-ahead) minus free typing. A native `<select>`
carries the name and is what submits — and what a no-JS page shows. Give it an `id` or `name`.

### [Combobox](./reference/components-combobox.md)

```ts
Combobox({
  id: "reviewer",
  name: "reviewer",
  label: "Assign reviewer",
  options: [{ value: "gh", label: "Grace Hopper", group: "Team" }, {
    value: "ag",
    label: "Ada Grant",
    meta: "Contractor",
  }],
  selected: "gh",
  action: "/reviewers",
  hint: "Type to filter",
});
Combobox({ id: "tags", name: "tags", multi: true, selected: ["a", "b"], options });
```

Free text + a listbox. With `action`, every keystroke asks the server for a new list (`?q=`) and your route returns
`ComboboxList({ id, options,
query, selected })`; without it the rendered options filter client-side. The value travels
in a hidden input (single) or one hidden input per token (multi; Backspace on an empty field pops the last). Keyboard:
open on focus, arrows, Enter, Escape (only claimed while open).

### [DatePicker](./reference/components-datepicker.md)

```ts
DatePicker({ id: "due", name: "due", start: "2026-09-14", min: "2026-09-01" }); // client mode
DatePicker({
  id: "period",
  name: "period",
  range: true,
  start,
  end,
  inline: true, // server mode
  buildMonthHref: (y, m) => `/report?month=${y}-${m + 1}`,
  buildDayHref: (iso) => `/report?day=${iso}`,
  presets: [{ label: "Last 7d", href: "/report?preset=7d" }],
});
```

Month **and year** navigation, single or range, min/max, presets, `align:
"end"` to hug a right edge, `inline` to stay
in flow (an inline picker is page content and ignores outside clicks). Server mode makes month/day/preset links rAPId
swaps that re-render the whole control; the route returns `DatePicker(...)` again. Hidden inputs `name` / `name_end`
carry ISO dates.

### [Otp](./reference/components-otp.md)

```ts
Otp({ id: "code", name: "code", length: 6, groups: 2, label: "SMS code", autoSubmit: true });
Otp({ id: "code", name: "code", value: "48213", length: 5, error: "That code has expired." });
```

Cells auto-advance, a paste or SMS autofill spreads across them, Backspace walks back, `otp:complete` fires when full
(`autoSubmit` calls `form.requestSubmit()`). One `autocomplete="one-time-code"` input submits; without JS it is the
control.

### [Switch](./reference/components-switch.md), [Choice](./reference/components-choice.md), [Segmented](./reference/components-segmented.md), [Slider](./reference/components-slider.md)

```ts
Switch({ id: "deploy", name: "deploy", label: "Deploy on merge", hint: "Pushes to main ship.", checked: true });
Checkbox({ name: "opt", label: "Option A", checked: true });
Radio({ name: "size", value: "m", label: "Medium" });
ChoiceGroup({ inline: true, items: [Checkbox({ label: "A" }), Checkbox({ label: "B" })] });
Segmented({
  id: "view",
  name: "view",
  legend: "View",
  value: "board",
  options: [{ value: "board", label: "Board" }, { value: "grid", icon: Icon("dashboard"), ariaLabel: "Grid" }],
  size: "sm",
  block: true,
});
Slider({
  id: "workers",
  name: "workers",
  label: "Concurrency",
  min: 1,
  max: 32,
  value: 12,
  unit: "workers",
  unitOne: "worker",
});
Slider({ id: "tier", name: "tier", label: "Size", min: 0, max: 3, value: 1, scale: ["S", "M", "L", "XL"] });
```

`Segmented` is a real radiogroup (it submits; a thumb glides to the checked option). To submit on change through rAPId,
wrap it in a `<form
data-action data-target method="get">`. `Slider` keeps a live `<output>` and paints its track from a
custom property set by the script.

### [Dropzone](./reference/components-dropzone.md)

```ts
Dropzone({
  id: "files",
  name: "files",
  accept: ".pdf,.png",
  multiple: true,
  hint: "Up to 10 MB each",
  files: [{ name: "q3.pdf", kind: "pdf", size: "2.4 MB", progress: 64 }, {
    name: "logo.png",
    size: "184 KB",
    removeHref: "/uploads/logo/delete",
  }, { name: "a.zip", error: "Unsupported" }],
});
```

A native `<input type=file>` covers the area. Upload rows are server state (`progress` is a native `<progress>`;
`removeHref` renders a POST form that swaps the row out). Put the dropzone in a `Form` with `data-action` /
`data-target="#<dropzone id>"` / `data-swap="outer"` and the upload is a swap: dropzone.js renders a pending row per
picked file on submit, fills its bar from rAPId's `rapid:progress`, and the reply (the `Dropzone` again, with your rows)
replaces them. See the [upload recipe](./UI-Recipes.md#5-attachments-with-upload-progress).

### Password (`Input({ type: "password" })`)

```ts
Input({ id: "password", name: "password", type: "password", required: true }); // sign-in: Show/Hide toggle
Input({
  id: "new-password",
  name: "password",
  type: "password",
  required: true,
  minLength: 12,
  autocomplete: "new-password",
  strength: true, // the four-segment bar, scored as the user types
  strengthMin: 3, // below "Good" the field is invalid
  messages: { strength: "Choose a stronger password." },
});
Input({
  id: "confirm",
  name: "confirm",
  type: "password",
  match: "#new-password",
  messages: { match: "The passwords do not match." },
});
```

`Input({ type: "password" })` renders this field: the plain input with a Show/Hide toggle, an optional strength bar
(length, character classes, repeats, sequences and the most common passwords → Too weak / Weak / Good / Strong, hidden
while empty, a class change only) and `match` for the confirm field; `reveal: false` is the bare native control.
Client-side by nature: without JS it is a password input, nothing more. Pair with `Form({ validate: true })` so "too
weak" and "does not match" read like any other field error; the server must enforce the same rules — the bar is a hint,
not a gate.

### [CardFields](./reference/components-card-fields.md)

```ts
CardFields({ name: "card", luhn: true }); // card-number, card-expiry, card-name, card-cvc
CardFields({ name: "stored", fields: ["number", "expiry"] }); // only the parts a flow needs
CardFields({ name: "c", required: { cvc: false }, errors: { number: "This card was declined." } });
```

Four `FormField`s that know about each other: the number is grouped as typed and names its brand from the prefix (Visa,
Mastercard, Amex, Discover, Diners, JCB), which sets the CVC to 3 or 4 digits; expiry is `MM/YY` with the slash inserted
and a past date refused; every part carries the matching `autocomplete="cc-*"`. Format checks only — length, digits,
expiry range, CVC length — plus the Luhn checksum with `luhn`, which is offline and says nothing about whether the card
exists. `fields` picks the parts and `required` can be per part; the number and CVC are never echoed back into markup.
Rendering card fields means the number reaches your server unless the form posts to the processor: that is PCI scope,
and yours to decide.

### [Editor](./reference/components-editor.md)

```ts
Editor({ id: "notes", name: "notes", mode: "markdown", value, previewAction: "/preview" });
Editor({ id: "bio", name: "bio", mode: "html", value: "<p>Trusted, <strong>sanitised</strong> HTML</p>" });
```

Markdown: a textarea with a toolbar (bold, italic, strikethrough, heading, quote, code, link, image, lists, rule, clear
— every command toggles; Ctrl/Cmd+B/I/K) and a Preview view the **server** renders: `previewAction` receives `text` and
answers an HTML fragment. HTML: a WYSIWYG surface (same toolbar plus underline; block formats toggle) mirrored into the
textarea that submits. Sanitise on the server; the initial HTML value is trusted.

### [FormField](./reference/components-form-field.md), [Form](./reference/components-form.md)

```ts
Form({
  id: "signup",
  action: "/signup",
  error: formError,
  attrs: { "data-action": "/signup", "data-target": "#signup", "data-swap": "outer" },
  content: html`${
    FormGrid({
      fields: [
        FormField({
          id: "name",
          label: "Name",
          required: true,
          span: 6,
          error: fields.name,
          control: (a11y) =>
            Input({ id: "name", name: "name", invalid: a11y.invalid, attrs: { "aria-describedby": a11y.describedBy } }),
        }),
        FormField({
          id: "plan",
          label: "Plan",
          help: "Change any time.",
          span: 6,
          control: Select({ id: "plan", name: "plan", options }),
        }),
      ],
    })
  }${FormActions({ content: Button({ label: "Create", type: "submit" }) })}`,
});
```

**Client-side validation** is one prop: `Form({ validate: true })`, and **unsaved-changes protection** another,
`Form({ guard: true })`, which asks before the page is left once any field changed, until the form submits. form.js
replaces the browser's bubble with the same message rendered inline in the field's error slot — the markup a server
error uses — on the field's first blur and on submit; an invalid submit is stopped before rAPId's runtime sees it and
the first invalid field gets focus. The rules are the native constraint attributes plus `match` and a password's
`strengthMin`; the wording is the browser's, or `messages` per rule. A server-rendered error stays until the user edits
that field. Without JS the browser validates natively, and the server validates regardless — the client layer is
feedback, never the gate.

`Form({ error })` renders rAPId's `RapidFormError` as a banner (`FormErrorAlert`), `FormField({ error })` wires
`aria-describedby` and `aria-invalid` through the `control` callback, `FormGrid` is a 12-column field grid,
`FormActions` the button row.

---

## Data

### [DataTable](./reference/components-data-table.md)

```ts
DataTable<Invoice>({
  id: "invoices",
  title: "Invoices",
  selectable: true,
  selected: ["INV-2"],
  maxHeight: "md",
  sort: { key: "id", dir: "desc" },
  buildSortHref: (key, dir) => `/invoices?sort=${key}&dir=${dir}`,
  columns: [
    { key: "id", label: "Invoice", pinned: true, mono: true, sortable: true },
    { key: "client", label: "Client", sortable: true },
    { key: "status", label: "Status", render: (r) => Badge({ label: r.status, dot: true }) },
    { key: "total", label: "Total", numeric: true },
  ],
  rows,
  rowKey: (r) => r.id,
  bulkAction: "/invoices/bulk",
  bulkActions: html`${
    Button({ label: "Archive", size: "sm", type: "submit", attrs: { name: "op", value: "archive" } })
  }${Button({ label: "Clear", size: "sm", attrs: { "data-bulk-clear": "" } })}`,
  rowActions: (r) =>
    RowActions({
      id: `row-${r.id}`,
      label: `Actions for ${r.id}`,
      items: [
        { label: "View", href: `/invoices/${r.id}` },
        { label: "Duplicate", attrs: { "data-action": `/invoices/${r.id}/duplicate`, "data-method": "post" } },
        { label: "Delete", danger: true, attrs: { "data-action": `/invoices/${r.id}/delete`, "data-method": "post" } },
      ],
    }),
  toolbar: Input({ type: "search", size: "sm", placeholder: "Filter" }),
  footer: Pagination({ page: 2, totalPages: 8, buildHref: (p) => `/invoices?page=${p}`, target: "#invoices" }),
  emptyMessage: "No invoices yet.",
});
```

The one table: sticky header, pinned/mono/numeric columns, selection with a bulk bar (`selectName`, default `selected`),
row actions, height caps, `empty` (any `Html`, e.g. an `Empty`) or `emptyMessage`. Sort links are swaps that replace the
table and push history — make them point at the page route
([why](./UI-Rapid.md#a-pushable-regions-url-is-the-page-route)). Add `data-filter-scope` around it and
`[data-table-search]` / `[data-table-filter]` controls for client-side filtering with no backend.

**The bulk bar overlays the header row** while rows are selected (sticky, inside the scroll box, the select-all cell
kept above it), so starting or clearing a selection never moves the rows. The trade-off is deliberate: while a selection
exists the header band _is_ the action bar, so sort links are covered until it is cleared (Clear, or untick select-all);
a selection made before a sort, page or back/forward swap is restored afterwards. The selection column is sticky at the
start, a pinned column sits right after it.

**Bulk actions post the selection.** With `bulkAction` set, the bulk bar and the rows sit in a `<form method="post">`
that is a rAPId swap replacing the table (`outer` into `#<id>`); the toolbar and footer stay outside it, so a search box
never submits it. Make each bulk button a submit that names its operation (`type: "submit"`,
`attrs: { name: "op", value: "archive" }`) — the runtime posts the submitter too, so the handler receives `op` plus one
`selected` entry per checked row, and answers with the re-rendered table (or a redirect without JavaScript, PRG). A
selection survives sort and page swaps and back/forward: the script remembers it per table id and re-applies it after a
GET swap; a POST reply renders whatever `selected` the server passes (usually nothing).

### [Pagination](./reference/components-pagination.md)

```ts
Pagination({
  page: 5,
  totalPages: 12,
  buildHref: (p) => withQuery("/list", view.query, { page: p }),
  target: "#list",
  siblingCount: 1,
});
```

Disabled prev/next are spans, not dead links. With `target` the links are swaps (outer, pushed).

### [Badge](./reference/components-badge.md), [Avatar](./reference/components-avatar.md), [Stat](./reference/components-stat.md)

```ts
Badge({ label: "Live", variant: "success", dot: true });
Badge({ label: "v2.1.0", variant: "code" });
Chip({ label: "Design", removable: true });
Chip({ label: "Read-only", static: true });
Avatar({ initials: "GH", size: "sm" });
Avatar({ src, alt: "Grace" });
AvatarGroup({ avatars: [a, b, c] });
Stat({ label: "Revenue", value: "$48.2k", icon: Icon("coin"), tone: "success", trend: { label: "+12.4%", up: true } });
```

### [Timeline](./reference/components-timeline.md), [Empty](./reference/components-empty.md), [Skeleton](./reference/components-skeleton.md), [Progress](./reference/components-progress.md)

```ts
Timeline({
  items: [{ title: "Created", meta: "09:12", status: "done" }, { title: "Awaiting payment", status: "current" }, {
    title: "Reconciled",
  }],
});
Empty({
  icon: "invoice",
  title: "No invoices yet",
  text: "Import a CSV to start.",
  actions: Button({ label: "Import", size: "sm" }),
});
Empty({ variant: "inline", tone: "error", icon: "warning", title: "Couldn't load", code: `502 · ${requestId}` });
Skeleton({ variant: "title", width: "half" });
SkeletonTable({ rows: 3 });
SkeletonCard();
Progress({ value: 60 });
Spinner({ label: "Loading rows" });
```

Skeletons pair with `data-load` regions: render them as the placeholder, the lazy GET swaps the real content in. Widths
are a step scale, never inline.

---

## Cards & structure

### [Card](./reference/components-card.md)

```ts
Card({
  variant: "elevated",
  title: "Elevated",
  subtitle: "With a footer",
  body: html`<p>…</p>`,
  footer: Button({ label: "Action", size: "sm" }),
});
Card({ href: "/projects/1", media: { src, alt: "", ratio: "wide" }, title: "Linked", body });
Card({
  as: "button",
  interactive: true,
  selected: true,
  avatar: Avatar({ initials: "GH" }),
  title: "Grace",
  actions: kebab,
  body,
});
Card({ variant: "danger", title: "Delete workspace", body, footer: Button({ label: "Delete", variant: "danger" }) });
```

Variants outlined / elevated / flat / danger, vertical or horizontal, as a `div`, `a` or `button`, with media (four
ratios, lazy by default, an overlay caption), header avatar/actions, split footer. The parts (`CardMedia`, `CardHeader`,
`CardBody`, `CardFooter`) are exported for custom compositions.

### [Grid](./reference/components-grid.md), [PageHeader](./reference/components-page-header.md), [Toolbar](./reference/components-toolbar.md)

```ts
Grid({ items: [GridCol({ span: 8, content }), GridCol({ span: 4, content: aside })] }); // 12 columns, 1 below md
PageHeader({
  title: "Projects",
  subtitle: "All of them.",
  breadcrumb: Breadcrumb({ items }),
  actions: Button({ label: "New" }),
});
Toolbar({ start: html`${searchInput}${statusSelect}`, end: html`${exportButton}${newButton}` });
```

### [Tabs](./reference/components-tabs.md), [Collapsible](./reference/components-collapsible.md), [Wizard](./reference/components-wizard.md)

```ts
Tabs({
  id: "settings",
  active: "billing",
  items: [{ id: "general", label: "General", content }, { id: "billing", label: "Billing", content }],
});
Collapsible({ id: "faq-1", title: "What is this?", content, defaultOpen: true });
Accordion({ id: "faq", items: [{ title: "One", content }, { title: "Two", content }] });
Wizard({
  steps: [{ label: "Details", status: "done" }, { label: "Payment", status: "active" }, { label: "Review" }],
  content,
});
```

Tabs have roving tabindex, Home/End, and a `#tab-<id>` deep link that activates the tab on load (blurring it, so a
sidebar link does not paint a focus ring).

---

## Navigation

### [Navbar](./reference/components-navbar.md), [Sidebar](./reference/components-sidebar.md), [Menu](./reference/components-menu.md), [Breadcrumb](./reference/components-breadcrumb.md)

```ts
Navbar({
  id: "top",
  brand: "Acme",
  links: [{ href: "/", label: "Home", active: true }],
  actions: Button({ label: "Sign in", size: "sm" }),
});
Sidebar({
  id: "nav",
  brand,
  collapsible: true,
  items: [
    { label: "Overview", href: "/", icon: Icon("dashboard"), active: true },
    {
      label: "Settings",
      icon: Icon("settings"),
      expanded: true,
      children: [{ label: "General", href: "/settings#tab-general" }, {
        label: "Billing",
        href: "/settings#tab-billing",
      }],
    },
  ],
});
Menu({ id: "m", items });
Breadcrumb({ items: [{ label: "Home", href: "/" }, { label: "Settings", href: "/settings" }, { label: "Profile" }] });
```

The navbar collapses to a toggle on phones. The sidebar is the drawer / collapsible rail the `SidebarLayout` manages;
`SidebarToggle({ targetId })` is the button it renders. Menus nest to any depth; the script marks the link matching the
full URL (path + hash) current and opens its parents.

### [Command](./reference/components-command.md)

```ts
Command({
  id: "palette",
  items: [{ label: "New invoice", group: "Actions", icon: "invoice", shortcut: "⌘N" }, {
    label: "INV-2048",
    group: "Recent",
    href: "/invoices/2048",
    badge: "IN",
  }],
  action: "/commands",
});
Button({ label: "Search…", attrs: { "data-command-open": "#palette" } });
```

A floating palette (⌘K or any `[data-command-open]` opens it; overlay click or Escape closes; focus returns) or
`inline: true` for an in-page one. With `action` the server answers `?q=` with `CommandList({ id, items, query })`.

---

## Actions

### [Button](./reference/components-button.md)

```ts
Button({ label: "Save", type: "submit" });
Button({ label: "Cancel", variant: "ghost" }); // primary | secondary | outline | subtle | ghost | accent | danger
Button({ label: "Small", size: "sm" }); // sm | md | lg
Button({ label: "Saving", loading: true });
Button({ label: "Docs", href: "/docs" });
Button({ label: "Wide", block: true });
Button({ iconOnly: true, iconStart: Icon("search"), attrs: { "aria-label": "Search" } });
ButtonGroup({ buttons: [Button({ label: "Day", variant: "outline" }), Button({ label: "Week", variant: "outline" })] });
```

Any button can be a swap:
`attrs: { "data-action": "/fragments/toast",
"data-target": "#toast-region", "data-swap": "append" }`.

### [Dropdown](./reference/components-dropdown.md), [Popover](./reference/components-popover.md), [Tooltip](./reference/components-tooltip.md)

```ts
Dropdown({ id: "opts", trigger: "Options", align: "end", content: Menu({ items }) }); // a text trigger is a button with a caret
ButtonGroup({
  buttons: [
    Button({ label: "Download" }),
    Dropdown({ id: "dl", trigger: Icon("chevronDown"), triggerClass: "btn btn--primary", content: Menu({ items }) }),
  ],
});
Popover({ id: "gh", trigger: PopoverTrigger({ controls: "gh", label: "Grace Hopper" }), content, align: "start" });
Popover({
  id: "profile",
  loadFrom: "/fragments/profile",
  trigger: PopoverTrigger({ controls: "profile", label: "Profile" }),
});
Tooltip({
  id: "tip",
  trigger: Button({ label: "Hover", attrs: { "aria-describedby": "tip" } }),
  content: "Helpful context",
});
```

Dropdowns close on pick, Escape and outside click, and switch to fixed positioning inside a scrolling table. Popovers
restore focus and only claim Escape when open; `loadFrom` fetches content lazily. Tooltips are CSS-only.

---

## Feedback

### [Alert](./reference/components-alert.md), [Toast](./reference/components-toast.md), [Modal](./reference/components-modal.md)

```ts
Alert({ variant: "info", title: "Scheduled maintenance", body: "Saturday 02:00–04:00 UTC.", dismissible: true });
Alert({ variant: "danger", title: "Validation failed", fields: { email: "Enter a valid email" } }); // what FormErrorAlert renders
Toast({ variant: "success", body: "Invoice sent", meta: "INV-2048", autoDismissMs: 4000 });
Toast({
  variant: "ink",
  body: "3 rows deleted",
  action: { label: "Undo", attrs: { "data-action": "/undo", "data-target": "#rows" } },
});
ToastRegion({ max: 3 }); // the core template renders one per page as #toast-region
Button({ label: "Delete", attrs: { "data-modal-open": "#confirm" } });
Modal({
  id: "confirm",
  title: "Delete workspace?",
  body,
  footer: html`${Button({ label: "Cancel", variant: "ghost" })}${Button({ label: "Delete", variant: "danger" })}`,
});
```

Toasts append into the region (`data-swap="append"` from the server, or `[data-toast-open="#template"]` client-side) and
auto-dismiss. Modals are native `<dialog>`s: centred, backdrop click closes, Escape closes, focus returns.

---

## Charts

See [Charts](./UI-Charts.md) — `Chart({ type, series, … })` for all 28 ApexCharts types on the library's tokens.
