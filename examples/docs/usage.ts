/**
 * Usage examples for every component and layout, rendered into the
 * generated reference (`deno task docs` → docs/reference/*.md). Each
 * example is real code: the reference shows the `render` function's own
 * source as the TypeScript snippet and what it returns as the HTML, so the
 * two can never drift. The generator fails when a module has no entry.
 *
 * Keys are `components/<dir>` and `layouts/<dir>`. Keep examples the size
 * of a real call site — a sign-in field, an invoice row — not a demo of
 * every prop (the catalogue does that).
 */
import { type Html, html } from "@tundralibs/rapid/ui";
import { Alert, FormErrorAlert } from "../../components/alert/alert.ts";
import { Avatar, AvatarGroup } from "../../components/avatar/avatar.ts";
import { Badge, Chip } from "../../components/badge/badge.ts";
import { Breadcrumb } from "../../components/breadcrumb/breadcrumb.ts";
import { Button, ButtonGroup } from "../../components/button/button.ts";
import { Card } from "../../components/card/card.ts";
import { Chart, ChartScript } from "../../components/chart/chart.ts";
import { Checkbox, ChoiceGroup, Radio } from "../../components/choice/choice.ts";
import { Accordion, Collapsible } from "../../components/collapsible/collapsible.ts";
import { Combobox, ComboboxList } from "../../components/combobox/combobox.ts";
import { Command, CommandList } from "../../components/command/command.ts";
import { DataTable, RowActions } from "../../components/data-table/data-table.ts";
import { DatePicker } from "../../components/datepicker/datepicker.ts";
import { Dropdown } from "../../components/dropdown/dropdown.ts";
import { Dropzone } from "../../components/dropzone/dropzone.ts";
import { Editor } from "../../components/editor/editor.ts";
import { Empty } from "../../components/empty/empty.ts";
import { Form } from "../../components/form/form.ts";
import { FormActions, FormField, FormGrid } from "../../components/form-field/form-field.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { FloatingInput, Input, InputGroup, InputIcon } from "../../components/input/input.ts";
import { Menu } from "../../components/menu/menu.ts";
import { Modal } from "../../components/modal/modal.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { Otp } from "../../components/otp/otp.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Pagination } from "../../components/pagination/pagination.ts";
import { PasswordInput } from "../../components/password/password.ts";
import { Popover, PopoverTrigger } from "../../components/popover/popover.ts";
import { Progress, Spinner } from "../../components/progress/progress.ts";
import { Segmented } from "../../components/segmented/segmented.ts";
import { Select } from "../../components/select/select.ts";
import { Sidebar, SidebarToggle } from "../../components/sidebar/sidebar.ts";
import { SkeletonCard, SkeletonTable } from "../../components/skeleton/skeleton.ts";
import { Slider } from "../../components/slider/slider.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Switch } from "../../components/switch/switch.ts";
import { Tabs } from "../../components/tabs/tabs.ts";
import { Textarea } from "../../components/textarea/textarea.ts";
import { Timeline } from "../../components/timeline/timeline.ts";
import { Toast, ToastRegion } from "../../components/toast/toast.ts";
import { Toolbar } from "../../components/toolbar/toolbar.ts";
import { Tooltip } from "../../components/tooltip/tooltip.ts";
import { Wizard } from "../../components/wizard/wizard.ts";
import { ArticleLayout } from "../../layouts/article/article.ts";
import { AuthLayout } from "../../layouts/auth/auth.ts";
import { DocsLayout } from "../../layouts/docs/docs.ts";
import { FocusLayout } from "../../layouts/focus/focus.ts";
import { RailLayout } from "../../layouts/rail/rail.ts";
import { SidebarLayout } from "../../layouts/sidebar/sidebar.ts";
import { SplitLayout } from "../../layouts/split/split.ts";
import { StackedLayout } from "../../layouts/stacked/stacked.ts";
import { Icon } from "../../shared/icons.ts";

export type UsageExample = {
  title: string;
  /** One sentence of context, shown above the snippet. */
  note?: string;
  render: () => Html;
};

type Invoice = { id: string; client: string; total: string };
const invoices: Invoice[] = [
  { id: "INV-2048", client: "Northwind Traders", total: "$12,400.00" },
  { id: "INV-2047", client: "Contoso Ltd", total: "$3,120.00" },
];

export const usage: Record<string, UsageExample[]> = {
  /* ------------------------------------------------------- components */
  "components/alert": [
    {
      title: "A status message",
      render: () =>
        Alert({ variant: "success", title: "Invoice sent", body: "Contoso Ltd will get it within a minute." }),
    },
    {
      title: "The banner a failed form shows",
      note: "`FormErrorAlert` takes rAPId's `RapidFormError` directly; `Form({ error })` renders it for you.",
      render: () =>
        FormErrorAlert({
          message: "Check the highlighted fields.",
          fields: { email: "Enter a valid address.", password: "At least 12 characters." },
        }),
    },
  ],
  "components/avatar": [
    {
      title: "A person, by photo or initials",
      render: () => Avatar({ src: "/photos/ada.jpg", alt: "Ada Lovelace", size: "md" }),
    },
    {
      title: "Who is on the project",
      render: () =>
        AvatarGroup({ avatars: [Avatar({ initials: "AL" }), Avatar({ initials: "GH" }), Avatar({ initials: "+3" })] }),
    },
  ],
  "components/badge": [
    { title: "A status with a dot", render: () => Badge({ label: "Overdue", variant: "danger", dot: true }) },
    { title: "A removable filter chip", render: () => Chip({ label: "Status: Open", removable: true }) },
  ],
  "components/breadcrumb": [
    {
      title: "Where the page sits",
      render: () => Breadcrumb({ items: [{ label: "Invoices", href: "/invoices" }, { label: "INV-2048" }] }),
    },
  ],
  "components/button": [
    { title: "The primary action", render: () => Button({ label: "Save changes", type: "submit" }) },
    {
      title: "An icon button with an accessible name",
      render: () =>
        Button({
          iconOnly: true,
          variant: "ghost",
          iconStart: Icon("x", { size: 16 }),
          attrs: { "aria-label": "Close" },
        }),
    },
    {
      title: "A split button",
      render: () =>
        ButtonGroup({
          buttons: [
            Button({ label: "Export", variant: "outline" }),
            Dropdown({
              id: "export-more",
              align: "end",
              trigger: html`${Icon("chevronDown", { size: 14 })}<span class="sr-only">More export options</span>`,
              triggerClass: "btn btn--outline btn--icon",
              content: Menu({ items: [{ label: "CSV", href: "/export.csv" }, { label: "PDF", href: "/export.pdf" }] }),
            }),
          ],
        }),
    },
  ],
  "components/card": [
    {
      title: "A linked summary card",
      note: "`href` makes the title a stretched link, so the whole card is clickable without wrapping it in an `<a>`.",
      render: () =>
        Card({
          title: "Northwind Traders",
          subtitle: "12 open invoices",
          href: "/clients/northwind",
          body: html`<p>Last payment received 2 days ago.</p>`,
          footer: Badge({ label: "Active", variant: "success", dot: true }),
        }),
    },
  ],
  "components/chart": [
    {
      title: "A revenue area chart",
      note:
        "Add `ChartScript()` once per page (or pass `APEXCHARTS` to `createCoreTemplate({ scripts })`); the engine draws on the library's tokens and follows dark mode.",
      render: () =>
        html`${ChartScript()}${
          Chart({
            id: "revenue",
            type: "area",
            series: [{ name: "Revenue", data: [12, 19, 14, 22, 28] }],
            categories: ["May", "Jun", "Jul", "Aug", "Sep"],
          })
        }`,
    },
  ],
  "components/choice": [
    {
      title: "Checkboxes in a row",
      render: () =>
        ChoiceGroup({
          inline: true,
          items: [
            Checkbox({ name: "notify", value: "email", label: "Email", checked: true }),
            Checkbox({ name: "notify", value: "sms", label: "SMS" }),
          ],
        }),
    },
    {
      title: "A radio set",
      render: () =>
        ChoiceGroup({
          items: [
            Radio({ name: "plan", value: "monthly", label: "Monthly", checked: true }),
            Radio({ name: "plan", value: "yearly", label: "Yearly — two months free" }),
          ],
        }),
    },
  ],
  "components/collapsible": [
    {
      title: "A details section",
      render: () =>
        Collapsible({ id: "terms", title: "Terms and conditions", content: html`<p>Net 30, 2% late fee.</p>` }),
    },
    {
      title: "An FAQ accordion",
      render: () =>
        Accordion({
          id: "faq",
          items: [
            { title: "How do refunds work?", content: html`<p>Within 14 days, in full.</p>`, defaultOpen: true },
            { title: "Can I change plans?", content: html`<p>Any time; the difference is prorated.</p>` },
          ],
        }),
    },
  ],
  "components/combobox": [
    {
      title: "Pick a reviewer, filtered by the server",
      note:
        "Each keystroke fetches `action?q=…` and swaps the reply into `#reviewer-list`; without `action` the rendered options are filtered on the client.",
      render: () =>
        Combobox({
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
        }),
    },
    {
      title: "The fragment the route returns",
      render: () =>
        ComboboxList({
          id: "reviewer",
          query: "gr",
          options: [{ value: "grace", label: "Grace Hopper", meta: "Ops" }],
        }),
    },
  ],
  "components/command": [
    {
      title: "A ⌘K palette",
      note: '`⌘K` or any `[data-command-open="#palette"]` opens it; `action` makes the results server-side.',
      render: () =>
        html`${
          Button({ label: "Search", variant: "outline", size: "sm", attrs: { "data-command-open": "#palette" } })
        }${
          Command({
            id: "palette",
            action: "/fragments/commands",
            placeholder: "Jump to…",
            items: [
              { label: "New invoice", group: "Actions", icon: "plus", shortcut: "N" },
              { label: "Contoso Ltd", group: "Clients", badge: "CL", href: "/clients/contoso" },
            ],
          })
        }`,
    },
    {
      title: "The fragment the route returns",
      render: () =>
        CommandList({
          id: "palette",
          query: "con",
          items: [{ label: "Contoso Ltd", badge: "CL", href: "/clients/contoso" }],
        }),
    },
  ],
  "components/data-table": [
    {
      title: "Invoices: sortable, selectable, with bulk and row actions",
      note:
        "Sort links swap the table in place and push history; bulk buttons post `op` plus one `selected` per checked row through the table's own form; the kebab opens a row action strip.",
      render: () =>
        DataTable<Invoice>({
          id: "invoices",
          title: "Invoices",
          selectable: true,
          sort: { key: "id", dir: "desc" },
          buildSortHref: (key, dir) => `/invoices?sort=${key}&dir=${dir}`,
          bulkAction: "/invoices/bulk",
          columns: [
            { key: "id", label: "Invoice", pinned: true, mono: true, sortable: true },
            { key: "client", label: "Client", sortable: true },
            { key: "total", label: "Total", numeric: true },
          ],
          rows: invoices,
          rowKey: (r) => r.id,
          bulkActions: html`${
            Button({ label: "Archive", size: "sm", type: "submit", attrs: { name: "op", value: "archive" } })
          }${Button({ label: "Clear", size: "sm", attrs: { "data-bulk-clear": "" } })}`,
          rowActions: (r) =>
            RowActions({
              id: `inv-${r.id}`,
              label: `Actions for ${r.id}`,
              items: [{ label: "View", href: `/invoices/${r.id}` }, {
                label: "Archive",
                danger: true,
                attrs: {
                  "data-action": `/invoices/${r.id}/archive`,
                  "data-method": "post",
                  "data-target": "#invoices",
                  "data-swap": "outer",
                },
              }],
            }),
          footer: Pagination({ page: 1, totalPages: 4, buildHref: (p) => `/invoices?page=${p}`, target: "#invoices" }),
        }),
    },
    {
      title: "Nothing to show",
      render: () =>
        DataTable<Invoice>({
          id: "invoices",
          columns: [{ key: "id", label: "Invoice" }, { key: "client", label: "Client" }],
          rows: [],
          rowKey: (r) => r.id,
          empty: Empty({ variant: "inline", title: "No invoices yet", icon: "invoice" }),
        }),
    },
  ],
  "components/datepicker": [
    {
      title: "A due date",
      note:
        'Without `buildMonthHref`/`buildDayHref` the picker runs on the client; the hidden input carries the ISO value under `name`. `Input({ type: "date" })` renders this.',
      render: () => DatePicker({ id: "due", name: "due", start: "2026-10-15", min: "2026-09-18", today: "2026-09-18" }),
    },
    {
      title: "A reporting range with presets",
      render: () =>
        DatePicker({
          id: "period",
          name: "period",
          range: true,
          start: "2026-09-01",
          end: "2026-09-30",
          today: "2026-09-18",
          align: "end",
          presets: [{ label: "Last 7 days", href: "/reports?preset=7d" }, {
            label: "This quarter",
            href: "/reports?preset=q",
          }],
        }),
    },
  ],
  "components/dropdown": [
    {
      title: "A user menu",
      render: () =>
        Dropdown({
          id: "user-menu",
          align: "end",
          trigger: "Ada",
          content: Menu({
            items: [{ label: "Profile", href: "/me" }, { label: "Settings", href: "/settings" }, {
              label: "Sign out",
              href: "/signout",
            }],
          }),
        }),
    },
  ],
  "components/dropzone": [
    {
      title: "Attachments, with one already stored",
      note:
        'Put it in a `Form` with `data-action`/`data-target="#attachments"`/`data-swap="outer"`: the upload is a swap, pending rows show progress, and the reply is this again with your rows.',
      render: () =>
        Dropzone({
          id: "attachments",
          name: "files",
          multiple: true,
          accept: ".pdf,.png",
          hint: "PDF or PNG, up to 10 MB",
          files: [{
            name: "contract.pdf",
            kind: "pdf",
            size: "2.4 MB",
            removeHref: "/invoices/INV-2048/attachments/1/delete",
          }],
        }),
    },
  ],
  "components/editor": [
    {
      title: "Release notes in Markdown, previewed by the server",
      note: "`previewAction` receives `text` (urlencoded POST) and answers with the rendered HTML fragment.",
      render: () =>
        Editor({
          id: "notes",
          name: "notes",
          mode: "markdown",
          previewAction: "/fragments/preview",
          placeholder: "Write in Markdown…",
        }),
    },
  ],
  "components/empty": [
    {
      title: "An empty list with a way forward",
      render: () =>
        Empty({
          title: "No invoices yet",
          text: "Create the first one and it will show up here.",
          icon: "invoice",
          actions: Button({ label: "New invoice", href: "/invoices/new" }),
        }),
    },
    {
      title: "A failed load, with the request id",
      render: () => Empty({ variant: "inline", tone: "error", title: "Could not load invoices", code: "req_01J8ZK3Q" }),
    },
  ],
  "components/form": [
    {
      title: "Client-side validation, inline",
      note:
        "`validate: true` shows each field's constraint failure in its error slot on blur and on submit (the browser bubble is replaced), blocks the submit and focuses the first invalid field. The constraints are the native attributes, so a page without JS still validates, and the server validates regardless.",
      render: () =>
        Form({
          id: "invite",
          action: "/team/invite",
          validate: true,
          attrs: { "data-action": "/team/invite", "data-target": "#invite", "data-swap": "outer" },
          content: html`${
            FormGrid({
              fields: [
                FormField({
                  id: "invite-email",
                  label: "Email",
                  required: true,
                  control: (a) =>
                    Input({
                      id: a.id,
                      name: "email",
                      type: "email",
                      required: true,
                      messages: {
                        required: "An email address is required.",
                        type: "That does not look like an email address.",
                      },
                    }),
                }),
                FormField({
                  id: "invite-handle",
                  label: "Handle",
                  help: "3–20 letters, digits or dashes.",
                  control: (a) =>
                    Input({
                      id: a.id,
                      name: "handle",
                      minLength: 3,
                      maxLength: 20,
                      pattern: "[a-z0-9\\-]+",
                      messages: { pattern: "Lowercase letters, digits and dashes only." },
                      attrs: { "aria-describedby": a.describedBy },
                    }),
                }),
              ],
            })
          }${FormActions({ content: Button({ label: "Send invite", type: "submit" }) })}`,
        }),
    },
    {
      title: "A form that swaps itself on submit",
      note:
        "The `id` is the swap target; `error` (rAPId's `RapidFormError`) renders the banner. Field errors go on each `FormField`.",
      render: () =>
        Form({
          id: "profile",
          action: "/profile",
          attrs: { "data-action": "/profile", "data-target": "#profile", "data-swap": "outer" },
          content: html`${
            FormGrid({
              fields: [
                FormField({
                  id: "name",
                  label: "Name",
                  required: true,
                  control: (a) => Input({ id: a.id, name: "name", value: "Ada Lovelace" }),
                }),
              ],
            })
          }${FormActions({ content: Button({ label: "Save", type: "submit" }) })}`,
        }),
    },
  ],
  "components/password": [
    {
      title: "Sign-in: current password with Show/Hide",
      render: () =>
        PasswordInput({ id: "current", name: "password", required: true, autocomplete: "current-password" }),
    },
    {
      title: "Sign-up: a new password with the strength bar, and its confirm field",
      note:
        "`strengthMin` makes anything below Good invalid; `match` on the confirm field checks equality. Both need `Form({ validate: true })` to show inline; the server still validates.",
      render: () =>
        html`${
          FormField({
            id: "new-password",
            label: "Password",
            required: true,
            help: "At least 12 characters, mixed case, a number.",
            control: (a) =>
              PasswordInput({
                id: a.id,
                name: "password",
                required: true,
                minLength: 12,
                autocomplete: "new-password",
                strength: true,
                strengthMin: 3,
                messages: { minLength: "Use at least 12 characters.", strength: "Choose a stronger password." },
              }),
          })
        }${
          FormField({
            id: "confirm",
            label: "Confirm password",
            required: true,
            control: (a) =>
              PasswordInput({
                id: a.id,
                name: "confirm",
                required: true,
                autocomplete: "new-password",
                match: "#new-password",
                messages: { match: "The passwords do not match." },
              }),
          })
        }`,
    },
  ],
  "components/form-field": [
    {
      title: "A field with help text",
      note: "Pass `control` as a function to receive the id and `aria-describedby` the field expects.",
      render: () =>
        FormField({
          id: "email",
          label: "Email",
          required: true,
          help: "We only use it to send receipts.",
          control: (a) =>
            Input({ id: a.id, name: "email", type: "email", attrs: { "aria-describedby": a.describedBy } }),
        }),
    },
    {
      title: "The same field after a validation error",
      render: () =>
        FormField({
          id: "email",
          label: "Email",
          required: true,
          error: "Enter a valid address.",
          control: (a) =>
            Input({
              id: a.id,
              name: "email",
              type: "email",
              value: "ada@",
              invalid: a.invalid,
              attrs: { "aria-describedby": a.describedBy },
            }),
        }),
    },
    {
      title: "Two fields side by side, then the actions",
      render: () =>
        html`${
          FormGrid({
            fields: [
              FormField({
                id: "first",
                label: "First name",
                span: 6,
                control: (a) => Input({ id: a.id, name: "first" }),
              }),
              FormField({
                id: "last",
                label: "Last name",
                span: 6,
                control: (a) => Input({ id: a.id, name: "last" }),
              }),
            ],
          })
        }${
          FormActions({
            content: html`${Button({ label: "Cancel", variant: "ghost" })}${Button({ label: "Save", type: "submit" })}`,
          })
        }`,
    },
  ],
  "components/grid": [
    {
      title: "Three stat tiles in a row",
      note: "12 columns; every column collapses to full width below `md`.",
      render: () =>
        Grid({
          items: [
            GridCol({ span: 4, content: Stat({ label: "Revenue", value: "$48,200" }) }),
            GridCol({ span: 4, content: Stat({ label: "Open", value: "12" }) }),
            GridCol({ span: 4, content: Stat({ label: "Overdue", value: "3", tone: "danger" }) }),
          ],
        }),
    },
  ],
  "components/input": [
    {
      title: "A required email field",
      render: () => Input({ id: "email", name: "email", type: "email", placeholder: "you@acme.com", required: true }),
    },
    {
      title: "Constraints the browser enforces",
      note:
        "Typed props for the native attributes; with `Form({ validate: true })` the failures show inline, `messages` replaces the browser's wording per rule.",
      render: () =>
        Input({
          id: "seats",
          name: "seats",
          type: "number",
          min: 1,
          max: 500,
          step: 1,
          required: true,
          messages: { min: "At least one seat.", max: "Contact sales above 500 seats." },
        }),
    },
    {
      title: "A search box with an icon",
      render: () =>
        InputIcon({
          icon: Icon("search", { size: 16 }),
          control: Input({ type: "search", placeholder: "Search invoices" }),
        }),
    },
    {
      title: "An amount with a currency prefix",
      render: () =>
        InputGroup({
          start: "$",
          control: Input({ name: "amount", extraClass: "input-group__control", placeholder: "0.00" }),
        }),
    },
    { title: "A floating label", render: () => FloatingInput({ id: "company", name: "company", label: "Company" }) },
  ],
  "components/menu": [
    {
      title: "A navigation menu with a section",
      note: "Give it an `id` when a page has more than one menu with submenus — sublist ids derive from it.",
      render: () =>
        Menu({
          id: "settings-nav",
          items: [
            { label: "General", href: "/settings", active: true },
            { label: "Billing", href: "/settings/billing" },
            {
              label: "Team",
              expanded: true,
              children: [{ label: "Members", href: "/settings/team" }, { label: "Roles", href: "/settings/roles" }],
            },
          ],
        }),
    },
  ],
  "components/modal": [
    {
      title: "A confirmation dialog",
      note: 'A native `<dialog>`; any `[data-modal-open="#id"]` opens it, Escape and the backdrop close it.',
      render: () =>
        html`${
          Button({ label: "Delete invoice", variant: "danger", attrs: { "data-modal-open": "#confirm-delete" } })
        }${
          Modal({
            id: "confirm-delete",
            title: "Delete INV-2048?",
            body: html`<p>This cannot be undone.</p>`,
            footer: html`${Button({ label: "Cancel", variant: "ghost", attrs: { "data-dismiss": "" } })}${
              Button({
                label: "Delete",
                variant: "danger",
                attrs: {
                  "data-action": "/invoices/INV-2048/delete",
                  "data-method": "post",
                  "data-target": "#invoices",
                  "data-swap": "outer",
                },
              })
            }`,
          })
        }`,
    },
  ],
  "components/navbar": [
    {
      title: "The top bar of a marketing or docs site",
      render: () =>
        Navbar({
          brand: "Acme",
          links: [{ href: "/", label: "Home", active: true }, { href: "/docs", label: "Docs" }, {
            href: "/pricing",
            label: "Pricing",
          }],
          actions: Button({ label: "Sign in", size: "sm", href: "/signin" }),
        }),
    },
  ],
  "components/otp": [
    {
      title: "A six-digit SMS code",
      note:
        'One `autocomplete="one-time-code"` input submits under `name`; the cells are an enhancement. `autoSubmit` submits the form when the last cell fills.',
      render: () =>
        Otp({ id: "sms-code", name: "code", label: "Enter the code we texted you", groups: 3, autoSubmit: true }),
    },
  ],
  "components/page-header": [
    {
      title: "A page title with breadcrumb and actions",
      render: () =>
        PageHeader({
          title: "INV-2048",
          subtitle: "Northwind Traders · due 15 Oct",
          breadcrumb: Breadcrumb({ items: [{ label: "Invoices", href: "/invoices" }, { label: "INV-2048" }] }),
          actions: html`${Button({ label: "Send reminder", variant: "outline" })}${
            Button({ label: "Record payment" })
          }`,
        }),
    },
  ],
  "components/pagination": [
    {
      title: "Pages of a table, swapped in place",
      note: "`target` makes every link a rAPId swap of that region with history push; leave it out for plain links.",
      render: () =>
        Pagination({ page: 3, totalPages: 12, buildHref: (p) => `/invoices?page=${p}`, target: "#invoices" }),
    },
  ],
  "components/popover": [
    {
      title: "A profile card on a name",
      render: () =>
        Popover({
          id: "ada-card",
          trigger: PopoverTrigger({ controls: "ada-card", label: "Ada Lovelace" }),
          content: html`
            <div class="popover__header"><span class="popover__title">Ada Lovelace</span></div>
            <p>Finance · joined 2024</p>
          `,
        }),
    },
    {
      title: "Loaded on first open",
      render: () =>
        Popover({
          id: "ada-card",
          trigger: PopoverTrigger({ controls: "ada-card", label: "Ada Lovelace" }),
          loadFrom: "/fragments/people/ada",
        }),
    },
  ],
  "components/progress": [
    {
      title: "Storage used",
      render: () => Progress({ value: 7.2, max: 10, attrs: { "aria-label": "Storage used, 7.2 of 10 GB" } }),
    },
    { title: "Something is loading", render: () => Spinner({ label: "Loading invoices" }) },
  ],
  "components/segmented": [
    {
      title: "A status filter",
      note:
        'A real radio group that submits under `name`; `inputAttrs: { "data-table-filter": "" }` wires it to the client-side filter.',
      render: () =>
        Segmented({
          id: "status",
          name: "status",
          legend: "Status",
          value: "",
          options: [{ value: "", label: "All" }, { value: "open", label: "Open" }, { value: "paid", label: "Paid" }],
          inputAttrs: { "data-table-filter": "" },
        }),
    },
  ],
  "components/select": [
    {
      title: "A plan picker",
      note: "Looks like the combobox; a native `<select>` carries `name` and is what submits.",
      render: () =>
        Select({
          id: "plan",
          name: "plan",
          value: "team",
          options: [{ value: "free", label: "Free" }, { value: "team", label: "Team" }, {
            value: "enterprise",
            label: "Enterprise",
          }],
        }),
    },
  ],
  "components/sidebar": [
    {
      title: "App navigation, collapsible to icons",
      render: () =>
        Sidebar({
          id: "nav",
          brand: "Acme",
          collapsible: true,
          items: [
            { label: "Dashboard", href: "/", icon: Icon("dashboard", { size: 18 }), active: true },
            { label: "Invoices", href: "/invoices", icon: Icon("invoice", { size: 18 }) },
          ],
        }),
    },
    {
      title: "The drawer toggle for a header",
      note: "`SidebarLayout` renders one for you; use this when the header carries its own.",
      render: () => SidebarToggle({ targetId: "nav", label: "Menu" }),
    },
  ],
  "components/skeleton": [
    {
      title: "A table region while it loads",
      note: "Render it as the initial content of a `data-load` region; the server's fragment replaces it.",
      render: () =>
        html`<div id="orders" data-load data-action="/fragments/orders">${
          SkeletonTable({ rows: 3, columns: [["lg", "sm", "xs"], ["lg", "sm", "xs"]] })
        }</div>`,
    },
    { title: "A card placeholder", render: () => SkeletonCard() },
  ],
  "components/slider": [
    {
      title: "Worker count with a live value",
      render: () =>
        Slider({
          id: "workers",
          name: "workers",
          label: "Concurrency",
          min: 1,
          max: 32,
          value: 8,
          unit: "workers",
          unitOne: "worker",
        }),
    },
  ],
  "components/stat": [
    {
      title: "A KPI with its trend",
      render: () => Stat({ label: "Revenue (30d)", value: "$48,200", trend: { label: "+12.4%", up: true } }),
    },
  ],
  "components/switch": [
    {
      title: "A setting with its consequence",
      render: () =>
        Switch({
          name: "two_factor",
          label: "Two-factor authentication",
          hint: "Required for admins from 1 Oct.",
          checked: true,
        }),
    },
  ],
  "components/tabs": [
    {
      title: "Settings sections",
      note: "A `#tab-<id>` link deep-links to a tab, so a sidebar can point at `settings#tab-billing`.",
      render: () =>
        Tabs({
          id: "settings",
          items: [
            { id: "general", label: "General", content: html`<p>Company name, timezone.</p>` },
            { id: "billing", label: "Billing", content: html`<p>Plan and invoices.</p>` },
          ],
        }),
    },
  ],
  "components/textarea": [
    {
      title: "A note",
      render: () => Textarea({ id: "note", name: "note", rows: 4, placeholder: "Anything the customer should know…" }),
    },
  ],
  "components/timeline": [
    {
      title: "An invoice's history",
      render: () =>
        Timeline({
          items: [
            { title: "Sent", meta: "1 Sep", status: "done" },
            { title: "Reminder sent", meta: "15 Sep", status: "done" },
            { title: "Payment due", meta: "1 Oct", status: "current" },
          ],
        }),
    },
  ],
  "components/toast": [
    {
      title: "A success toast with an action",
      note:
        'Return this from a route the trigger appends into `#toast-region` (`data-target="#toast-region" data-swap="append"`).',
      render: () =>
        Toast({
          variant: "success",
          body: "Reminder sent to Contoso Ltd",
          action: {
            label: "Undo",
            attrs: {
              "data-action": "/invoices/INV-2047/remind/undo",
              "data-method": "post",
              "data-target": "#toast-region",
              "data-swap": "append",
            },
          },
          dismissible: true,
          autoDismissMs: 6000,
        }),
    },
    { title: "The region the shell renders once", render: () => ToastRegion() },
  ],
  "components/toolbar": [
    {
      title: "Search and filters, with the primary action at the end",
      render: () =>
        Toolbar({
          start: html`${
            Input({ type: "search", size: "sm", placeholder: "Search invoices", attrs: { "data-table-search": "" } })
          }${
            Select({
              placeholder: "All statuses",
              options: [{ value: "open", label: "Open" }, { value: "paid", label: "Paid" }],
            })
          }`,
          end: Button({ label: "New invoice", size: "sm" }),
        }),
    },
  ],
  "components/tooltip": [
    {
      title: "A hint on an icon button",
      note: "CSS-only. Point the trigger's `aria-describedby` at the tooltip's id.",
      render: () =>
        Tooltip({
          id: "archive-tip",
          trigger: Button({
            iconOnly: true,
            variant: "ghost",
            iconStart: Icon("folder", { size: 16 }),
            attrs: { "aria-label": "Archive", "aria-describedby": "archive-tip" },
          }),
          content: "Archive this invoice",
        }),
    },
  ],
  "components/wizard": [
    {
      title: "A three-step checkout",
      render: () =>
        Wizard({
          id: "checkout",
          steps: [{ label: "Cart", status: "done" }, { label: "Payment", status: "active" }, { label: "Review" }],
          content: html`<p>Card details go here.</p>`,
        }),
    },
  ],

  /* ---------------------------------------------------------- layouts */
  "layouts/article": [
    {
      title: "A blog post with a table of contents",
      render: () =>
        ArticleLayout({
          header: Navbar({ brand: "Acme", links: [{ href: "/blog", label: "Blog", active: true }] }),
          content: html`
            <article>
              <h1>Why we moved to invoices-as-code</h1>
              <p>…</p>
            </article>
          `,
          aside: Menu({ items: [{ label: "Background", href: "#background" }, { label: "The move", href: "#move" }] }),
        }),
    },
  ],
  "layouts/auth": [
    {
      title: "A sign-in page",
      render: () =>
        AuthLayout({
          brand: "Acme",
          split: true,
          narrative: html`
            <h2>Welcome back</h2>
            <p>Invoices, payments and reports in one place.</p>
          `,
          content: Form({
            id: "signin",
            action: "/signin",
            content: html`${
              FormField({
                id: "email",
                label: "Email",
                control: (a) => Input({ id: a.id, name: "email", type: "email" }),
              })
            }${FormActions({ content: Button({ label: "Sign in", type: "submit", block: true }) })}`,
          }),
        }),
    },
  ],
  "layouts/docs": [
    {
      title: "Documentation with side navigation and an on-this-page list",
      render: () =>
        DocsLayout({
          header: Navbar({ brand: "Acme Docs" }),
          navId: "docs-nav",
          nav: Sidebar({
            id: "docs-nav",
            items: [{ label: "Getting started", href: "/docs", active: true }, { label: "API", href: "/docs/api" }],
          }),
          content: html`
            <h1>Getting started</h1>
            <p>…</p>
          `,
          toc: Menu({ items: [{ label: "Install", href: "#install" }, { label: "First page", href: "#first-page" }] }),
        }),
    },
  ],
  "layouts/focus": [
    {
      title: "A checkout with no distractions",
      render: () =>
        FocusLayout({
          header: html`<a class="navbar__brand" href="/">Acme</a>`,
          content: Wizard({
            id: "checkout",
            steps: [{ label: "Cart", status: "done" }, { label: "Payment", status: "active" }],
            content: html`<p>…</p>`,
          }),
        }),
    },
  ],
  "layouts/rail": [
    {
      title: "An icon rail that becomes a tab bar on phones",
      render: () =>
        RailLayout({
          brand: "A",
          items: [
            { href: "/", label: "Home", icon: Icon("dashboard", { size: 20 }), active: true },
            { href: "/invoices", label: "Invoices", icon: Icon("invoice", { size: 20 }) },
            { href: "/settings", label: "Settings", icon: Icon("settings", { size: 20 }) },
          ],
          end: Avatar({ initials: "AL", size: "sm" }),
          content: html`<h1>Home</h1>`,
        }),
    },
  ],
  "layouts/sidebar": [
    {
      title: "The admin frame",
      note: "The layout renders the drawer toggle for phones; the sidebar's `id` must equal `sidebarId`.",
      render: () =>
        SidebarLayout({
          sidebarId: "nav",
          header: Navbar({
            brand: "Acme",
            actions: Button({ label: "Dark", size: "sm", variant: "outline", attrs: { "data-theme-toggle": "" } }),
          }),
          sidebar: Sidebar({
            id: "nav",
            collapsible: true,
            items: [{ label: "Dashboard", href: "/", active: true }, { label: "Invoices", href: "/invoices" }],
          }),
          content: html`${PageHeader({ title: "Dashboard" })}<p>…</p>`,
        }),
    },
  ],
  "layouts/split": [
    {
      title: "An inbox: list beside detail",
      note:
        "`mobileView` decides which pane a phone shows — make it a route decision (`/inbox` → pane, `/inbox/:id:` → detail).",
      render: () =>
        SplitLayout({
          header: Navbar({ brand: "Acme" }),
          pane: Menu({
            items: [{ label: "Contoso Ltd — INV-2047", href: "/inbox/INV-2047", active: true }, {
              label: "Northwind — INV-2048",
              href: "/inbox/INV-2048",
            }],
          }),
          content: html`
            <h1>INV-2047</h1>
            <p>…</p>
          `,
          mobileView: "detail",
        }),
    },
  ],
  "layouts/stacked": [
    {
      title: "A boxed marketing page",
      render: () =>
        StackedLayout({
          width: "boxed",
          header: Navbar({
            brand: "Acme",
            links: [{ href: "/", label: "Home", active: true }, { href: "/pricing", label: "Pricing" }],
          }),
          content: html`<h1>Invoices your customers pay on time</h1>`,
          footer: html`<p>© Acme</p>`,
        }),
    },
  ],
};
