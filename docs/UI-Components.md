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

Country codes take a `flag`, and `SelectOption` takes a `lead` — any `Html` shown before the label in the list and
beside the value in the closed field. **The library ships no flag artwork**: flags are multicolour, heavy, and they
change, so they belong to a set you choose. Bring one the way the icon docs describe:

```ts
import { raw } from "@tundralibs/rapid/ui";
import flags from "some-flag-set"; // any package that gives you SVG strings
const flag = (code: string) => raw(flags[code]); // constant markup, never user data

Input({ type: "tel", name: "phone", countries: [{ code: "+44", label: "UK", flag: flag("gb") }] });
Select({ name: "market", options: [{ value: "de", label: "Germany", lead: flag("de") }] });
```

The composite fields (email domains, tel countries, url scheme) submit two parts each; a handler joins them with
`emailFrom` / `telFrom` / `urlFrom` from `@tundralibs/ui/shared/compose`, which also pass a whole value through
untouched. `validateAction` posts `<name>=<value>` once the native rules pass and shows a non-empty text reply as the
field's error, pinned until the value changes.

`FloatingInput({ id, name, label })` is the floating-label variant. `InputIcon({ icon, control, end? })` puts an icon in
the field; `InputGroup({ start, end, control })` adds prefix/suffix addons — text, or a `Select` (give the inner control
`extraClass: "input-group__control"`).

### Masked inputs (`Input({ mask })`)

```ts
Input({ id: "phone", name: "phone", mask: "phone" });
Input({ id: "amount", name: "amount", mask: "currency", maskCurrency: "EUR", maskLocale: "de-DE" });
Input({ id: "dob", name: "dob", mask: "date", maskLocale: "en-GB", messages: { mask: "Use dd/mm/yyyy." } });
Input({ id: "sku", name: "sku", mask: "custom", maskPattern: "AA-####" });
```

`mask` is `phone`, `date`, `time`, `currency`, `card`, `postcode` or `custom` (`maskPattern`: `#` digit, `A` letter, `*`
either, the rest literal). input.js formats as you type from the significant characters, so typing, pasting and dropping
all land the same way; the caret stays after the same count of typed characters and steps over a separator the person
typed; Backspace over a literal skips it. A date's slot order and a currency's separators follow `maskLocale` through
`Intl`; an impossible date or time (month 13, Feb 30) is a custom validity form.js reports. `currency` submits the raw
number (`1234.50`) through a hidden input (`maskRaw`, default on for currency only). Without the script the plain text
field submits whatever was typed, so the server parses leniently either way.

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

Looks and behaves like the combobox (field, caret, list, arrow keys) minus free typing. A native `<select>` carries the
name and is what submits — and what a no-JS page shows. Give it an `id` or `name`.

Every Select is **searchable by default**: the open list has a search box on top that filters the options as you type
(focus moves into it on open, Enter takes the first match, and typing on the closed field starts a search). The box is
unnamed and belongs to no form, so it never posts and never stops Enter in a sibling field from submitting.
`searchable: false` drops it and brings back the native-style type-ahead; `searchPlaceholder`, `searchLabel` and
`emptyText` word it. The list caps at `--dropdown-max-height` (`min(20rem, 60vh)`) and scrolls, opening on the picked
option.

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
open on focus, arrows, Enter, Escape (only claimed while open). `required` asks for a pick — one option, or at least one
token with `multi`; typed text that picks nothing does not count — reported by the browser in a plain form and inline by
`Form({ validate: true })`, worded by `requiredMessage`.

A multi combobox leaves its picks out of the list each time it opens or is searched (`hideSelected: false` keeps them,
ticked); a pick made while the list is open keeps its row until then, so nothing moves under the pointer, and a search
that finds only picks says "Already selected." (`selectedText`). For a large, server-searched set: `openOn: "type"` with
`minChars` keeps the list shut — and unfetched — until enough is typed (it also drops the chevron; `caret` overrides);
the route returns one page as `ComboboxList({ …, total })`, which ends with "Showing 50 of 9,812. Keep typing to
narrow." (`moreText`); and `selectedOptions` gives the labels of picks that page does not hold, so a token never shows a
raw id.

A combobox with no visible `label` — a filter in a toolbar — takes `ariaLabel` ("Organisation"), or `labelledBy` with
the id of a caption already on the page; either names the input and its list. With a `label`, the label names both.

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

### [TimePicker](./reference/components-timepicker.md)

```ts
TimePicker({ id: "pickup", name: "pickup", value: "09:30", min: "08:00", max: "18:00", step: 30, required: true });
TimePicker({ id: "send-at", name: "send_at", zone: "UTC", label: "Send at" });
Input({ type: "time", name: "t" }); // renders the TimePicker
```

A 24-hour time as two typeable segments. Keyboard first: digits fill a segment and jump on (`14` → minutes), `:` jumps
too, ↑/↓ step a segment, PageUp/PageDown move by `step`, a pasted `9:30` fills both; Alt+↓ (or the chevron) opens a list
of slots every `step` minutes (default 15) inside `min`–`max`, where typed digits jump (`9` → 09:00) and Enter picks.
Posts ISO `HH:MM` under `name`. `zone` is a label chip, nothing more. Without JS the markup's native
`<input type="time">` is the control; with it, `required`/`min`/`max` are reported on the hours segment, so
`Form({ validate: true })` shows them in the field's error slot (`messages` for the wording). The server checks them
too.

### [DateTimePicker](./reference/components-datetimepicker.md)

```ts
DateTimePicker({
  id: "go-live",
  name: "go_live",
  value: "2026-10-01T09:00:00Z",
  min: now.toISOString(),
  presets: dateTimePresets(now), // Tomorrow 09:00 · In 1 week · End of month
});
DateTimePicker({ id: "from", name: "from", local: true }); // the viewer's zone, posted as UTC

// in the handler
const goLive = dateTimeFrom(await ctx.payload, "go_live"); // "2026-10-01T09:00:00Z" | undefined
```

A `DatePicker` beside a `TimePicker`, posting **one ISO UTC instant** under `name`. On the first and last allowed days
the time's bounds follow `min`/`max`; a missing half is reported through the time's validity ("Pick a date."). By
default the parts are UTC wall time and the chip says so; `local: true` converts the value and bounds into the viewer's
zone, names it in the chip, and still posts UTC. The parts also post as `<name>-date` / `<name>-time` — all a no-JS page
can send — and `dateTimeFrom()` (`@tundralibs/ui/shared/compose`) reads whichever arrived. Presets are instants the
server computes (pass the request's clock) and show only with JS.

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
Switch({ name: "analytics", checked, labels: { on: "On", off: "Off" } }); // the word follows the state, no script
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
FormField({ label: "Position size", id: "size", control: Slider({ id: "size", name: "size", showValue: true }) });
```

`Segmented` is a real radiogroup (it submits; a thumb glides to the checked option). It is as wide as its options and
never wider than its container: on a phone a long set scrolls sideways inside the control, the thumb with it (`block`
fills the row instead). To submit on change through rAPId, wrap it in a `<form
data-action data-target method="get">`.
`Slider` keeps a live `<output>` and paints its track from a custom property set by the script; its own `label` turns
the output on, and inside a `FormField` (whose label already names it) `showValue: true` shows the value without a
second label.

`Switch({ labels: { on, off } })` renders both words and CSS shows the one matching the checkbox, so the word is right
at every moment without a script or a re-render. Alone, the word is the switch's label; beside a `label` it is a quiet
echo after it, hidden from assistive tech (which announces checked / unchecked itself).

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

### [NumberInput](./reference/components-number-input.md)

```ts
NumberInput({ id: "seats", name: "seats", value: 5, min: 1, max: 500, step: 1, unit: "seats" });
NumberInput({ id: "budget", name: "budget", value: 125000, step: 500, format: "group" }); // 125,000 while blurred
```

A native `<input type="number">` between − and + steppers (hold to repeat; a stepper disables at `min`/`max`), the
browser's own spin buttons hidden. `format: "group"` shows thousands separators while the field is blurred and submits
the raw number. Without the script the native control stands alone.

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
Editor({
  id: "post",
  name: "body",
  mode: "markdown",
  label: "Post body",
  toolbar: "full", // "full" | "basic" | "minimal"
  previewAction: "/preview",
  uploadAction: "/uploads",
  maxLength: 5000,
});
Editor({ id: "bio", name: "bio", mode: "html", toolbar: "basic", statusBar: false, label: "Bio", value: trustedHtml });
```

Markdown: a textarea with a grouped icon toolbar — a block-style picker (paragraph, H1–H3), bold/italic/strikethrough,
quote, code, link and image through a small popover form (URL + text, Ctrl/Cmd+K; never `prompt()`), bullet, numbered
and task lists, a 3×3 table (Tab hops its cells), a fenced code block with a language, a rule, clear, undo/redo (its own
history, since programmatic edits break the browser's) and fullscreen (Escape leaves). Enter continues a list and an
empty item ends it; Tab/Shift+Tab indent list lines. The Preview view is what the **server** renders: `previewAction`
receives `text` and answers an HTML fragment. HTML: a WYSIWYG surface with the same tools plus underline, align,
indent/outdent, tables with contextual row/column tools and task lists whose checkboxes mirror into the submitted
markup; paste is plain text by default (Ctrl/Cmd+Shift+V keeps formatting through a whitelist that drops scripts,
`style` and `on*`), and the HTML that submits carries no inline styles. Both modes show a status bar with word and
character counts (`maxLength` counts down) and drop or paste an image to `uploadAction` (a multipart `file`, answered
with the URL as text) with a placeholder while it uploads. Sanitise on the server; the initial HTML value is trusted.

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
that field. A required `Select` is reported on its visible field in any form — its native `<select>` is hidden behind
the UI, where a browser alone would block the submit without a word — and a required `Combobox` the same way. Without JS
the browser validates natively, and the server validates regardless — the client layer is feedback, never the gate.

`Form({ error })` renders rAPId's `RapidFormError` as a banner (`FormErrorAlert`), `FormField({ error })` wires
`aria-describedby` and `aria-invalid` through the `control` callback, `FormGrid` is a 12-column field grid,
`FormActions` the button row.

---

### [Transfer](./reference/components-transfer.md), [ColorPicker](./reference/components-color-picker.md), [Rating](./reference/components-rating.md)

```ts
Transfer({
  id: "members",
  name: "members",
  options: [{ value: "ada", label: "Ada" }, { value: "grace", label: "Grace", selected: true }],
  sourceTitle: "Available",
  targetTitle: "In the team",
});
ColorPicker({ id: "brand", name: "brand", label: "Brand colour", value: "#2563eb", presets: ["#2563eb", "#16a34a"] });
ColorPicker({ id: "overlay", name: "overlay", label: "Overlay", alpha: true, format: "rgb" });
Rating({ id: "stars", name: "stars", label: "Your rating", value: 4, clearable: true });
Rating({ id: "avg", label: "Average rating", value: 4.5, readOnly: true, size: "sm" });
```

A transfer list is a native `<select multiple name>` (what a page without the script shows and posts) enhanced into two
listboxes with search, move buttons, Space to mark, Enter or a double-click to move, Ctrl+A, and a `required` that
reports like a Select's; it stacks below 768px. The colour picker is a native `<input type="color">` enhanced with a
saturation square (drag or arrow keys), hue and alpha ranges, a text field in the format you choose and a contrast
readout against the surface; `alpha` or a non-hex `format` submits the formatted value through a hidden input. A rating
is a radio group of stars that works without a script (the DOM order is reversed so CSS can fill "every star up to the
checked one"); `readOnly` renders a half-star display with one accessible label, `clearable` lets a second click on the
chosen star clear it.

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
Avatar({ initials: "JS", status: "online" }); // presence dot: online | away | busy | offline
AvatarGroup({ avatars: [a, b, c] });
Stat({ label: "Revenue", value: "$48.2k", icon: Icon("coin"), tone: "success", trend: { label: "+12.4%", up: true } });
Stat({
  label: "Signups",
  value: "1,284",
  sparkline: [12, 18, 14, 22, 26],
  sparklineLabels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
}); // hover a column for its value
Stat({ label: "Suspended", value: "12", note: "+3 this month", href: "/organisations?status=suspended" });
```

`note` is a line under the value. `href` turns the label into a link whose hit area covers the tile, or the whole card
when the stat is a `Card`'s body. The link's accessible name stays the label.

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

### [DescriptionList](./reference/components-description-list.md), [Calendar](./reference/components-calendar.md)

```ts
DescriptionList({
  layout: "inline",
  items: [{ term: "Billed to", description: "Blue Bottle Co." }, { term: "Due", description: "Sep 15, 2026" }],
});
DescriptionList({ layout: "columns", size: "sm", divided: true, items });
Calendar({
  id: "schedule",
  year: 2026,
  month: 9,
  today: "2026-10-28",
  events: [{ id: "e1", date: "2026-10-30", title: "Invoice run", tone: "accent", time: "09:00" }, {
    id: "e2",
    date: "2026-10-12",
    end: "2026-10-14",
    title: "Offsite",
    tone: "success",
  }],
  buildHref: (y, m) => `/schedule?month=${y}-${m + 1}`,
  target: "#schedule",
});
```

A description list is a real `<dl>`: `stacked`, `inline` (term in a fixed column) or `columns` (a responsive grid of
pairs). The calendar is a month grid with event chips (multi-day spans fill each day, `+N more` folds the overflow,
today is ringed), prev/next as links — or swaps with `target` — and it becomes a list of the days that have events below
768px.

### [CodeBlock](./reference/components-code.md), [DiffView](./reference/components-diff.md)

```ts
CodeBlock({ code: "deno add jsr:@tundralibs/ui", language: "bash", title: "Install", lineNumbers: true });
CodeBlock({ highlighted: codeHtml(shikiOutput), language: "ts", highlightLines: [3, 4], maxHeight: "md" });
DiffView({ title: "deno.json", view: "split", lines: diffLines(before, after) });
```

A code block renders every line as a `.code__line`, so line numbers (CSS counters) and highlighted rows never reach the
clipboard, with a header (title, language chip, copy button) and `wrap` or a `maxHeight` that scrolls. Pass `code`
(escaped) or `highlighted` (server-tokenised markup wrapped with `codeHtml()`): the stylesheet colours the kit's own
`.tok-*` classes and maps Prism's `.token.*` and highlight.js's `.hljs-*` names onto the same tokens, so either
library's server output is themed by the same custom properties. On a plain page `code.js` runs a small regex tokeniser
(json, bash, css, html, js/ts) over `<code data-highlight>` blocks that carry no token markup. The diff view takes
`DiffLine` rows (`add`, `remove`, `context`, `meta`) — `diffLines(before, after)` computes them for short texts — as a
unified or split table with number gutters, markers drawn by CSS and `+N −M` stats.

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
Grid({ gap: "sm", items: tiles.map((tile) => GridCol({ span: { xs: 6, md: 4, xl: 3 }, content: tile })) }); // per breakpoint
PageHeader({
  title: "Projects",
  subtitle: "All of them.",
  breadcrumb: Breadcrumb({ items }),
  actions: Button({ label: "New" }),
});
Toolbar({ start: html`${searchInput}${statusSelect}`, end: html`${exportButton}${newButton}` });
```

A number span applies from 768px (`col-N`); an object is mobile first — `xs` at every width, `sm` from 576px, `md` from
768px, `lg` from 992px, `xl` from 1400px (`col-xs-6 col-md-4 col-xl-3`). `gap` is `sm`, `md` or `lg`. For the layout
classes that go with it (`d-flex`, `gap-3`, `mt-4`, `text-truncate`, `hide-md` …) see the utilities layer in
[Getting Started](./UI-Getting-Started.md#the-grid-and-the-utilities).

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
sidebar link does not paint a focus ring). A collapsible row is a native `<details>` whose `<summary>` is the trigger,
so it opens and closes with no script at all; an accordion's rows share a `name` (the accordion's id), which browsers
that support it make exclusive natively. The script adds the height animation, animated exclusivity and deep links. The
`<h3>` inside the summary is for heading navigation only: the row reads in the surrounding text's type (an FAQ row, not
a heading), so set the size on the container if a row should be larger. A row's `id` is on its root, so `/faq#plans`
lands on it (and Chromium opens a closed row for a fragment inside it, even without the script); with the script, a hash
naming a row (or anything inside one) opens it on arrival — before first paint, with no transition — and on hashchange,
closing the rest of its accordion.

### [Prose](./reference/components-prose.md)

```ts
Prose({ content: proseHtml(renderedMarkdown), size: "md", measure: true });
```

Styles for rendered Markdown — headings with rhythm, lists, quotes, code, tables, figures, `kbd` — on the library's
tokens. `proseHtml()` wraps an HTML string the **server has already sanitised**; never hand it user input.

---

### [ScrollArea](./reference/components-scroll-area.md), [SplitPane](./reference/components-split-pane.md)

```ts
ScrollArea({ content: changelog, maxHeight: "md", label: "Changelog" });
SplitPane({ id: "editor", start: source, end: preview, initial: 40, min: 25, storageKey: "editor-split" });
```

A scroll area is a scroll box with themed thin scrollbars and edge fades; `label` makes it a focusable region so the
keyboard can scroll content with no focusable children. A split pane is two panes and a `role="separator"` grip: pointer
drag, arrow keys (Shift for bigger steps), Home/End, double-click or Enter to reset, the share remembered per
`storageKey`; it stacks below 768px unless `keep`.

### [Separator](./reference/components-separator.md), [Ratio](./reference/components-ratio.md), [Figure](./reference/components-figure.md), [Kbd](./reference/components-kbd.md)

```ts
Separator({ label: "or" });
Separator({ orientation: "vertical" }); // in a toolbar
Ratio({ ratio: "16x9", content: html`<iframe src="…" title="Talk"></iframe>` });
Figure({ media: html`<img src="…" alt="" />`, caption: "The old pier at dawn.", align: "wide" });
Kbd({ keys: ["⌘", "K"] });
```

A separator is a rule with an optional centred label (`role="separator"`, or decorative); a ratio box keeps an
`<iframe>`, `<video>` or image at `16x9`, `4x3`, `1x1`, `21x9`, `3x4` or `9x16`; a figure is media with a caption at
`start`, `center`, `end` or `wide` (bleeds to the container) in three size steps; `Kbd` renders keycaps for a shortcut.

## Navigation

### [Navbar](./reference/components-navbar.md), [Sidebar](./reference/components-sidebar.md), [Menu](./reference/components-menu.md), [Breadcrumb](./reference/components-breadcrumb.md)

```ts
Navbar({
  id: "top",
  brand: "Acme",
  links: [{ href: "/", label: "Home", active: true }],
  actions: html`${Button({ label: "Theme", variant: "ghost", attrs: { "data-theme-toggle": "", class: "hide-md" } })}${
    Button({ label: "Sign in", size: "sm" })
  }`,
  // Below 768px the bar has no room: this goes into the phone menu, after the links.
  menuActions: Button({ label: "Theme", variant: "ghost", attrs: { "data-theme-toggle": "" } }),
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

The navbar collapses to a toggle on phones, and links stay on one line (`white-space: nowrap`) while the bar is
horizontal. `actions` never wrap or shrink, so a long set overflows a phone: move the extras into `menuActions` (shown
inside the phone menu, hidden from 768px) and mark their twins in `actions` `hide-md` (hidden below 768px; `hide-sm`
hides below 576px). The sidebar is the drawer / collapsible rail the `SidebarLayout` manages;
`SidebarToggle({ targetId })` is the button it renders. Beyond `brand` and `items` a sidebar takes `head` (below the
brand: an action, an organisation switcher — wrap a control's text in `<span class="sidebar__label">` and it folds to
its icon on the rail, the text becoming its `title`; a dropdown there floats free of the sidebar's scroll box),
`sections` (labelled groups after `items`, `{ label?, items }`, a rule between them on the rail), `foot` (pinned to the
bottom above the toggle — a usage card; hidden on the rail) and `navLabel` (the nav's accessible name, default "Main";
give each nav on a page its own). `collapsible: { position: "edge" }` puts the collapse toggle on the sidebar's end
border at the top, a small round button, and makes the nav scroll between a fixed head and foot; `true` keeps it at the
foot. Menus nest to any depth; the script marks the link matching the full URL (path + hash) current and opens its
parents.

### [Tree](./reference/components-tree.md)

```ts
Tree({
  id: "files",
  label: "Project files",
  items: [{
    label: "src",
    icon: Icon("folder", { size: 16 }),
    expanded: true,
    children: [{ label: "app.ts", href: "/files/src/app.ts", selected: true }, {
      label: "mod.ts",
      href: "/files/src/mod.ts",
    }],
  }, { label: "README.md", href: "/files/README.md" }],
});
```

A WAI-ARIA tree: roving tabindex, arrow keys open, close and walk the levels, Home/End, Enter follows the link,
type-ahead. Groups render open and the script folds the ones not `expanded`, so a page without it shows everything.

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

### [ListGroup](./reference/components-list-group.md), [ScrollSpy](./reference/components-scrollspy.md), [BackToTop](./reference/components-back-to-top.md), [Menubar](./reference/components-menubar.md)

```ts
ListGroup({
  items: [
    { label: "Inbox", href: "/inbox", icon: Icon("mail"), badge: Badge({ label: "12" }), active: true },
    { label: "Archive", href: "/archive", text: "Older than 30 days" },
  ],
});
ListGroup({ variant: "flush", numbered: true, items: steps }); // inside a card
ScrollSpy({ id: "toc", items: [{ label: "Install", href: "#install" }, { label: "Usage", href: "#usage" }] });
BackToTop({ threshold: 800 });
Menubar({
  id: "app-menu",
  label: "Application",
  items: [{ label: "File", items: [{ label: "New", href: "/new" }] }, {
    label: "Edit",
    items: [{ label: "Undo", href: "#" }],
  }],
});
```

A list group is a real list of links, buttons or text rows with an active row, secondary text, icons, badges and
right-aligned meta. A scroll spy is a nav of hash links that lights up (`aria-current`, a parent opens for its child) as
the page scrolls past the sections — any element with `data-scrollspy` gets the behaviour, and the DocsLayout's TOC
carries it. Back-to-top appears past `threshold` pixels, scrolls up and moves focus to the main content. A menubar is
desktop-app chrome: `role="menubar"` buttons whose panels are `Menu`s, with hover switching while one is open,
Left/Right between menus, Down to open, Escape to close.

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
  side: "bottom",
});
```

Dropdowns close on pick, Escape and outside click, and switch to fixed positioning inside a scrolling table. They are
**searchable by default**: a search box above the content filters a `Menu`'s items (a parent stays, its sublist opened,
while a child matches) or any `[data-dropdown-item]`s; ↓ moves into the items, Enter takes the first match, and closing
clears it. A panel with nothing to filter (a notifications feed) hides the box — or pass `searchable: false`. The panel
caps at `--dropdown-max-height` and scrolls under the box. Popovers restore focus and only claim Escape when open;
`loadFrom` fetches content lazily; a popover that would run off the viewport is shifted back in and flips above its
trigger when there is no room below. Tooltips show after `delay` (150ms) on hover and at once on focus, wrap at a
readable measure, flip when there is no room on their `side`, and fall back to a CSS-only bubble without the script.

---

### [Toggle, ToggleGroup](./reference/components-toggle.md), [Fab](./reference/components-fab.md), [ContextMenu](./reference/components-context-menu.md)

```ts
ToggleGroup({
  id: "view",
  label: "View",
  exclusive: true,
  items: [
    { label: "Grid", icon: Icon("dashboard"), iconOnly: true, name: "view", value: "grid", pressed: true },
    { label: "List", icon: Icon("list"), iconOnly: true, name: "view", value: "list" },
  ],
});
Toggle({ label: "Bold", icon: Icon("bold"), iconOnly: true, variant: "outline" });
Fab({ icon: Icon("plus"), label: "New message", href: "/compose", hideOnScroll: true });
Fab({ icon: Icon("plus"), label: "Compose", extended: true, variant: "accent" });
ContextMenu({ id: "row-menu", content: Menu({ items: [{ label: "Rename", href: "#" }] }) });
html`<tr data-context-menu="#row-menu">…</tr>`;
```

A toggle is a `<button aria-pressed>`; with `name` and `value` a hidden mirror input submits it only while pressed. An
`exclusive` group behaves like radios (arrow keys move within the group) and fires `toggle:change`. The FAB is a fixed
round action in a corner (`position`, `extended` for a pill with its label, `hideOnScroll` tucks it away while scrolling
down). A context menu opens on right-click, Shift+F10 or a long press on any element pointing at it, placed at the
pointer and flipped to stay on screen, with arrow keys over its items and focus returned on close.

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
ToastRegion({ max: 3, position: "top-end" }); // the core template renders one per page as #toast-region
Button({ label: "Delete", attrs: { "data-modal-open": "#confirm" } });
Modal({
  id: "confirm",
  title: "Delete workspace?",
  body,
  footer: html`${Button({ label: "Cancel", variant: "ghost" })}${Button({ label: "Delete", variant: "danger" })}`,
});
```

Toasts append into the region (`data-swap="append"` from the server, or `[data-toast-open="#template"]` client-side) and
auto-dismiss; the region sits at any of six positions (`bottom-end` by default; `createCoreTemplate({ toastPosition })`
in a rAPId app) and, where the Popover API exists, shows as a manual popover so a toast paints above an open modal.
Modals are native `<dialog>`s: centred, backdrop click closes, Escape closes, focus returns.

### [Sheet](./reference/components-sheet.md), [Banner](./reference/components-banner.md)

```ts
Button({ label: "Edit customer", attrs: { "data-sheet-open": "#customer" } });
Sheet({
  id: "customer",
  title: "Edit customer",
  side: "end",
  size: "md",
  body: Form({ content: fields }),
  footer: html`${Button({ label: "Cancel", variant: "ghost", attrs: { "data-sheet-close": "" } })}${
    Button({ label: "Save", type: "submit" })
  }`,
});
Banner({ variant: "info", body: "Markets close early on Friday.", action: { label: "Details", href: "/notices/1" } });
Banner({
  variant: "warning",
  body: "Billing fails over to the backup provider tonight.",
  dismissible: true,
  storageKey: "failover-2026-10",
});
```

A sheet is a native `<dialog>` that slides in from the side you name (`end`, `start`, `bottom`) — and from the bottom on
every phone, where it becomes a bottom sheet with a drag handle. Backdrop click, Escape and `[data-sheet-close]` slide
it out before it closes; `open` opens it on load and after a swap, the way a modal does. A banner is the page-level
strip an alert is not: full width, centred text, one action, an optional close that `storageKey` remembers across
visits; `sticky` keeps it at the top.

### [Tour](./reference/components-tour.md)

```ts
Tour({
  id: "welcome",
  storageKey: "tour-v1",
  steps: [
    { target: "#search", title: "Search", body: "Press ⌘K from anywhere.", placement: "bottom" },
    { target: "#new-project", title: "Start here", body: "Your first project." },
  ],
});
Button({ label: "Take the tour", attrs: { "data-tour-start": "#welcome" } });
```

A spotlight walkthrough: a scrim with a cut-out sized to each step's target and a card placed beside it (`placement`
flips when there is no room; a step without a target centres its card), Back/Next/Done/Skip, arrow keys, Escape, focus
trapped in the card and returned to the starter, `tour:step` and `tour:done` events. `storageKey` remembers completion
and `startOn: "load"` runs it once for a new visitor.

### [ConsentBanner](./reference/components-consent.md)

```ts
ConsentBanner({
  title: "Cookies for analytics?",
  body:
    html`We would use Google Analytics and Microsoft Clarity to see which pages help. <a href="/privacy">Privacy</a>`,
  loaders: [
    { src: "https://www.googletagmanager.com/gtag/js?id=G-XXXX", async: true },
    { src: "/public/ga.js", attrs: { "data-id": "G-XXXX" } },
    { src: "/public/clarity.js", attrs: { "data-id": "abcd" } },
  ],
  storageKey: "acme-consent",
});
html`<a href="#" data-consent-open>Cookie settings</a>`; // anywhere: shows it again
```

Asks once, and runs analytics only after a yes. The banner renders `hidden`; consent.js shows it to a visitor with no
stored choice, appends the `loaders` as script elements (in order, `async` opting out) on Accept and on every later
visit while the choice stands, and on Reject calls `gtag("consent", "update", { analytics_storage: "denied" })` and
`clarity("consent", false)` when present and expires the trackers' cookies (`cookies`, default `_ga*`, `_gid`, `_gat*`,
`_clck`, `_clsk`) on the host and its parent domains. Accept and Reject are the same button, nothing is pre-ticked, the
choice lives in the browser (`storageKey`, `granted` | `denied`) so cached pages stay identical for everyone, and every
choice fires `consent:change` (`detail: { state, key }`). Without a script nothing loads and nothing is asked. No inline
script anywhere: under a strict CSP add the trackers' origins to `script-src` (a nonce on the bundle's own `<script>` is
copied onto the loaders). In a rAPId app pass the props to `createCoreTemplate({ consent })` and every page carries it.

---

## Marketing & media

The landing-page partials. Each is a bare section that sits inside a `StackedLayout` (`width: "bleed"` for full-width
bands) and is composed from the same tokens as the app components, so a marketing page and the product behind it read as
one thing.

### [Hero](./reference/components-hero.md), [FeatureGrid](./reference/components-feature-grid.md), [PricingTable](./reference/components-pricing.md)

```ts
Hero({
  eyebrow: "Invoicing",
  title: "Invoices your customers pay on time",
  text: "Send, chase and collect from one place.",
  actions: html`${Button({ label: "Start free", size: "lg" })}${Button({ label: "See pricing", variant: "outline", size: "lg", href: "#pricing" })}`,
  media: html`<img src="/img/app.png" width="1200" height="800" alt="The invoices screen">`,
  layout: "split",
  size: "lg",
  parallax: true,
});
FeatureGrid({
  title: "Everything the finance team asked for",
  columns: "3",
  variant: "cards",
  items: [{ icon: Icon("invoice"), title: "Recurring invoices", text: "Set it once." }, …],
});
PricingTable({
  toggle: { monthly: "Monthly", yearly: "Yearly", note: "Two months free" },
  plans: [{
    name: "Team",
    price: "$49",
    priceYearly: "$490",
    period: "/mo",
    features: ["10 seats", { label: "Audit log", included: false }],
    action: Button({ label: "Choose Team", block: true }),
    featured: true,
    badge: "Popular",
  }, …],
});
```

The hero's `tone` paints it on the surface, inverse (ink) or an accent wash; `parallax` lets the media drift on scroll.
The pricing toggle is a real radio group that `pricing.js` mirrors onto `data-billing`; without the script both prices
show.

### [Testimonial](./reference/components-testimonial.md), [SiteFooter](./reference/components-site-footer.md)

```ts
TestimonialGrid({
  columns: "3",
  items: [{ quote: "We got paid 11 days faster.", name: "Priya N.", role: "CFO, Northwind", rating: 5, avatar: Avatar({ initials: "PN" }) }, …],
});
SiteFooter({
  brand: html`<span class="sidebar__brand-mark">A</span> Acme`,
  tagline: "Invoicing for teams.",
  columns: [{ title: "Product", links: [{ label: "Pricing", href: "/pricing" }] }, { title: "Company", links }],
  social: [{ label: "GitHub", href: "https://github.com/acme", icon: Icon("externalLink") }],
  bottom: html`© 2026 Acme`,
});
```

### [Carousel](./reference/components-carousel.md), [Lightbox](./reference/components-lightbox.md)

```ts
Carousel({
  id: "stories",
  label: "Customer stories",
  items: cards,
  perView: "3",
  gap: "md",
  peek: true,
  autoplay: 6000,
});
Lightbox({ id: "office", items: photos.map((p) => ({ src: p.src, alt: p.alt, caption: p.caption })) });
photos.map((p, i) =>
  LightboxLink({ controls: "office", index: i, href: p.src, content: html`<img src="${p.thumb}" alt="${p.alt}">` })
);
```

The carousel is a scroll-snap track: it scrolls by hand with nothing loaded, and the script adds prev/next, dots, arrow
keys, the active slide and autoplay that pauses on hover, focus and off-screen. The lightbox is a `<dialog>` opened by
any `LightboxLink` (a plain link to the full image without the script): keys, swipe, counter, caption, backdrop click,
and focus back on the thumbnail.

### [Reveal, RevealGroup, Parallax, LazySection](./reference/components-reveal.md)

```ts
Reveal({ content: html`<h2>Why teams switch</h2>`, effect: "rise", tag: "section" });
RevealGroup({ items: cards, stagger: true }); // one after another
Parallax({ content: html`<img src="/img/texture.png" alt="">`, speed: "slow" });
LazySection({ id: "customers", action: "/fragments/customers", placeholder: SkeletonCard() });
```

Scroll effects that cost nothing when they cannot run: a revealed block is hidden only under `html.js` and shown by an
IntersectionObserver (already-visible blocks reveal on load; `once: false` replays); the stagger is a `--reveal-index`
set through the CSSOM; parallax is a rAF-throttled transform, off under reduced motion and on coarse pointers. A lazy
section calls `window.rapid.swap()` as it nears the viewport when the runtime is present — on a plain page it simply
shows what it carries.

### [ScrollProgress, CountUp, ScrollSteps](./reference/components-reveal.md)

```ts
ScrollProgress({ position: "top" });
CountUp({ value: 48200, format: "currency:USD" });
ScrollSteps({ id: "story", steps: [{ content: step1, media: shot1 }, { content: step2, media: shot2 }] });
```

A reading-progress bar driven by `--scroll-progress` (pure CSS where scroll-driven animations exist, a rAF script
elsewhere). A count-up renders its final `Intl`-formatted value in the markup and animates from `from` once, when it
first enters the viewport, ending on the exact server text — never a 0 at rest. Scroll steps pin a stage while the page
scrolls through the steps' text, cross-fading each step's media and marking the current one `aria-current`; on a phone
the stage unpins and every step shows its media in order.

---

## Charts

See [Charts](./UI-Charts.md) — `Chart({ type, series, … })` for all 28 ApexCharts types on the library's tokens.
