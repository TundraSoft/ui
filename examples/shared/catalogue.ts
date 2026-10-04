/**
 * The catalogue: every exported component template, in every variant,
 * size, tone, status and state it declares — generated, not curated. The
 * hand-composed galleries show components in context; this page is the
 * exhaustive inventory a user builds locally to see what ships.
 * `examples/tests/test-catalogue.ts` fails when a component's exported
 * function or a declared union value is missing from this file, so the
 * catalogue cannot silently fall behind the components.
 */
import { type Html, html } from "@tundralibs/rapid/ui";
import { Alert, FormErrorAlert } from "../../components/alert/alert.ts";
import { Avatar, AvatarGroup } from "../../components/avatar/avatar.ts";
import { Badge, Chip } from "../../components/badge/badge.ts";
import { Breadcrumb } from "../../components/breadcrumb/breadcrumb.ts";
import { Button, ButtonGroup, CopyButton } from "../../components/button/button.ts";
import { Card, CardBody, CardFooter, CardHeader, CardMedia } from "../../components/card/card.ts";
import { Chart, chartTypes } from "../../components/chart/chart.ts";
import { Checkbox, Choice, ChoiceGroup, Radio } from "../../components/choice/choice.ts";
import { Accordion, Collapsible } from "../../components/collapsible/collapsible.ts";
import { Combobox, ComboboxList } from "../../components/combobox/combobox.ts";
import { Command, CommandList } from "../../components/command/command.ts";
import { CardFields } from "../../components/card-fields/card-fields.ts";
import { DataTable, RowActions } from "../../components/data-table/data-table.ts";
import { DatePicker, DatePickerPanel } from "../../components/datepicker/datepicker.ts";
import { DateTimePicker, dateTimePresets } from "../../components/datetimepicker/datetimepicker.ts";
import { Dropdown } from "../../components/dropdown/dropdown.ts";
import { Dropzone } from "../../components/dropzone/dropzone.ts";
import { Editor } from "../../components/editor/editor.ts";
import { Empty } from "../../components/empty/empty.ts";
import { FormActions, FormField, FormGrid } from "../../components/form-field/form-field.ts";
import { CsrfField, Form } from "../../components/form/form.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { Counter, FloatingInput, Input, InputGroup, InputIcon } from "../../components/input/input.ts";
import { flags, sampleCountries } from "./flags.ts";
import { Menu } from "../../components/menu/menu.ts";
import { ConfirmModal, Modal } from "../../components/modal/modal.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { Otp } from "../../components/otp/otp.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Pagination } from "../../components/pagination/pagination.ts";
import { Popover, PopoverTrigger } from "../../components/popover/popover.ts";
import { Progress, Spinner } from "../../components/progress/progress.ts";
import { Segmented } from "../../components/segmented/segmented.ts";
import { Select } from "../../components/select/select.ts";
import { Sidebar, SidebarToggle } from "../../components/sidebar/sidebar.ts";
import { Skeleton, SkeletonCard, SkeletonTable } from "../../components/skeleton/skeleton.ts";
import { Slider } from "../../components/slider/slider.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Switch } from "../../components/switch/switch.ts";
import { TabLinks, Tabs } from "../../components/tabs/tabs.ts";
import { Textarea } from "../../components/textarea/textarea.ts";
import { Timeline } from "../../components/timeline/timeline.ts";
import { TimePicker } from "../../components/timepicker/timepicker.ts";
import { Toast, ToastRegion } from "../../components/toast/toast.ts";
import { Toolbar } from "../../components/toolbar/toolbar.ts";
import { Tooltip } from "../../components/tooltip/tooltip.ts";
import { Wizard } from "../../components/wizard/wizard.ts";
import { Icon } from "../../shared/icons.ts";
import { chartSamples } from "./charts.ts";
import {
  commandItems,
  type DemoRoutes,
  type Dir,
  inviteForm,
  type InvoiceEdits,
  invoicesTable,
  matches,
  periodPicker,
  type PeriodState,
  type ProjectsState,
  projectsTable,
  reviewerOptions,
  staticRoutes,
} from "./data.ts";

/** Server-side state of the server-driven cases (the app threads the URL's through). */
export type CatalogueState = {
  projects?: ProjectsState;
  invoices?: { key: string; dir: Dir };
  /** What the app's bulk form has done to the invoices so far. */
  invoiceEdits?: InvoiceEdits;
  period?: PeriodState;
};

export type CatalogueCase = { label: string; html: Html };
export type CatalogueGroup = "forms" | "data" | "charts" | "cards" | "navigation" | "actions" | "feedback";
export type CatalogueEntry = {
  /** Component directory name under components/. */
  name: string;
  /** The page it is catalogued on. */
  group: CatalogueGroup;
  cases: CatalogueCase[];
};

/** One page per group — the "basis types" a user browses. */
export const catalogueGroups: readonly { id: CatalogueGroup; title: string; blurb: string }[] = [
  {
    id: "forms",
    title: "Forms",
    blurb: "Inputs, selects, combobox, date picker, OTP, switches, sliders, upload, field layout.",
  },
  {
    id: "data",
    title: "Data",
    blurb:
      "Data tables (sorted and paged by the server), pagination, badges, avatars, stats, timelines, empty and loading states.",
  },
  { id: "charts", title: "Charts", blurb: "Every chart type ApexCharts renders, on the library's tokens." },
  {
    id: "cards",
    title: "Cards & structure",
    blurb: "Cards, the grid, page headers, toolbars, tabs, collapsibles, wizards.",
  },
  { id: "navigation", title: "Navigation", blurb: "Navbar, sidebar, menus, breadcrumbs, the command palette." },
  { id: "actions", title: "Actions", blurb: "Buttons, dropdowns, popovers, tooltips." },
  { id: "feedback", title: "Feedback", blurb: "Alerts, toasts (including one from the server), modals." },
];

const GROUP_OF: Record<string, CatalogueGroup> = {
  input: "forms",
  textarea: "forms",
  select: "forms",
  choice: "forms",
  switch: "forms",
  slider: "forms",
  segmented: "forms",
  combobox: "forms",
  datepicker: "forms",
  timepicker: "forms",
  datetimepicker: "forms",
  otp: "forms",
  "card-fields": "forms",
  dropzone: "forms",
  "form-field": "forms",
  form: "forms",
  editor: "forms",
  "data-table": "data",
  pagination: "data",
  badge: "data",
  avatar: "data",
  stat: "data",
  timeline: "data",
  empty: "data",
  skeleton: "data",
  progress: "data",
  chart: "charts",
  card: "cards",
  grid: "cards",
  "page-header": "cards",
  toolbar: "cards",
  collapsible: "cards",
  tabs: "cards",
  wizard: "cards",
  navbar: "navigation",
  sidebar: "navigation",
  menu: "navigation",
  breadcrumb: "navigation",
  command: "navigation",
  button: "actions",
  dropdown: "actions",
  popover: "actions",
  tooltip: "actions",
  alert: "feedback",
  toast: "feedback",
  modal: "feedback",
};

const c = (label: string, html: Html): CatalogueCase => ({ label, html });
const row = (...items: Html[]) => html`<div class="cat-row">${items}</div>`;
const lorem = html`<p>Body copy for the case, long enough to wrap onto a second line inside a card-sized box.</p>`;
const img = (seed: number, w = 600, h = 338) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const alertVariants = ["neutral", "success", "warning", "danger", "info"] as const;
const avatarSizes = ["sm", "md", "lg"] as const;
const badgeVariants = ["neutral", "primary", "accent", "success", "warning", "danger", "info", "code"] as const;
const buttonVariants = ["primary", "secondary", "outline", "subtle", "ghost", "accent", "danger"] as const;
const buttonSizes = ["sm", "md", "lg"] as const;
const cardVariants = ["outlined", "elevated", "flat", "danger"] as const;
const cardOrientations = ["vertical", "horizontal"] as const;
const cardTags = ["div", "a", "button"] as const;
const cardMediaRatios = ["wide", "square", "tall", "banner"] as const;
const choiceTypes = ["checkbox", "radio"] as const;
const emptyVariants = ["card", "inline", "page"] as const;
const emptyTones = ["default", "error"] as const;
const inputSizes = ["sm", "md", "lg"] as const;
const skeletonVariants = ["text", "title", "block", "avatar", "circle"] as const;
const skeletonWidths = ["xs", "sm", "md", "lg", "xl", "half", "full"] as const;
const statTones = ["neutral", "primary", "success", "warning", "danger", "info"] as const;
const toastVariants = ["neutral", "success", "warning", "danger", "info", "ink"] as const;
const timelineStatuses = ["done", "current", "pending"] as const;
const timelineTones = ["neutral", "success", "warning", "danger", "info", "accent"] as const;
const wizardStatuses = ["pending", "active", "done"] as const;
const popoverAligns = ["center", "start", "end"] as const;
const dropdownAligns = ["start", "end"] as const;
const segmentedSizes = ["sm", "md"] as const;
const otpModes = ["numeric", "alphanumeric"] as const;
const gridSpans = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

type Row = Record<string, unknown> & { id: string; name: string; status: string; amount: string };
const rows: Row[] = [
  { id: "1", name: "Northwind", status: "Active", amount: "$1,200" },
  { id: "2", name: "Contoso", status: "Paused", amount: "$840" },
  { id: "3", name: "Fabrikam", status: "Active", amount: "$3,050" },
];
const menuItems = [
  { label: "Overview", href: "#", icon: Icon("dashboard", { size: 16 }), active: true },
  { label: "Projects", href: "#", icon: Icon("folder", { size: 16 }) },
  {
    label: "Settings",
    icon: Icon("settings", { size: 16 }),
    expanded: true,
    children: [{ label: "General", href: "#" }, { label: "Billing", href: "#" }, {
      label: "Deep",
      children: [{ label: "Nested", href: "#" }],
    }],
  },
];
const formError = {
  message: "Please fix the highlighted fields.",
  fields: { email: "Enter a valid email address", name: "Required" },
};

function entries(routes: DemoRoutes, state: CatalogueState): Omit<CatalogueEntry, "group">[] {
  return [
    {
      name: "alert",
      cases: [
        ...alertVariants.map((variant) =>
          c(`variant ${variant}`, Alert({ variant, title: `${variant} alert`, body: "With a body line." }))
        ),
        c("items list", Alert({ variant: "warning", title: "Three things", items: ["First", "Second", "Third"] })),
        c(
          "fields + dismissible",
          Alert({ variant: "danger", title: "Validation failed", fields: formError.fields, dismissible: true }),
        ),
        c(
          "custom icon / no icon",
          row(
            Alert({ variant: "info", icon: Icon("bell", { size: 17 }), body: "Custom icon" }),
            Alert({ variant: "info", icon: false, body: "No icon" }),
          ),
        ),
        c("FormErrorAlert (RapidFormError)", FormErrorAlert(formError)),
        c(
          "actions",
          Alert({
            variant: "warning",
            title: "This link is flagged",
            body: "Visitors see a warning instead of the destination.",
            actions: html`${Button({ label: "Change destination", size: "sm" })}${
              Button({ label: "Ask for a review", size: "sm", variant: "outline" })
            }`,
          }),
        ),
      ],
    },
    {
      name: "avatar",
      cases: [
        ...avatarSizes.map((size) =>
          c(`size ${size}`, row(Avatar({ initials: "AB", size }), Avatar({ src: img(7, 96, 96), alt: "Photo", size })))
        ),
        c(
          "AvatarGroup",
          AvatarGroup({
            avatars: [
              Avatar({ initials: "AB" }),
              Avatar({ initials: "CD" }),
              Avatar({ initials: "EF" }),
              Avatar({ initials: "+3" }),
            ],
          }),
        ),
      ],
    },
    {
      name: "badge",
      cases: [
        c("Badge variants", row(...badgeVariants.map((variant) => Badge({ label: variant, variant })))),
        c("Badge dot", row(...badgeVariants.map((variant) => Badge({ label: variant, variant, dot: true })))),
        c(
          "Chip",
          row(
            Chip({ label: "Plain" }),
            Chip({ label: "Removable", removable: true }),
            Chip({ label: "Static", static: true }),
          ),
        ),
      ],
    },
    {
      name: "breadcrumb",
      cases: [
        c(
          "three levels",
          Breadcrumb({ items: [{ label: "Home", href: "#" }, { label: "Settings", href: "#" }, { label: "Profile" }] }),
        ),
        c("single", Breadcrumb({ items: [{ label: "Home" }] })),
        c(
          "collapse — the middle folds into … when the trail does not fit (#cat-bc-fold)",
          html`<div class="cat-narrow" id="cat-bc-fold">${
            Breadcrumb({
              collapse: true,
              items: [
                { label: "Northwind Traders", href: "#" },
                { label: "Settings", href: "#" },
                { label: "Groups & permissions", href: "#" },
                { label: "Billing administrators" },
              ],
            })
          }</div>`,
        ),
      ],
    },
    {
      name: "button",
      cases: [
        c("Button variants", row(...buttonVariants.map((variant) => Button({ label: variant, variant })))),
        c("Button sizes", row(...buttonSizes.map((size) => Button({ label: size, size })))),
        c(
          "states",
          row(
            Button({ label: "Disabled", disabled: true }),
            Button({ label: "Loading", loading: true }),
            Button({ label: "Link", href: "#" }),
            Button({ label: "Submit", type: "submit" }),
            Button({ label: "Reset", type: "reset" }),
          ),
        ),
        c(
          "icons",
          row(
            Button({ label: "Start", iconStart: Icon("plus", { size: 15 }) }),
            Button({ label: "End", iconEnd: Icon("chevronDown", { size: 15 }) }),
            Button({ iconOnly: true, iconStart: Icon("search", { size: 16 }), attrs: { "aria-label": "Search" } }),
          ),
        ),
        c("block", Button({ label: "Block", block: true })),
        c(
          "CopyButton (#cat-copy)",
          row(
            CopyButton({ id: "cat-copy", value: "https://go.acme.com/spring" }),
            CopyButton({ value: "brv_ak_7f2c", label: "Copy key", icon: false, variant: "ghost" }),
            CopyButton({ id: "cat-copy-icon", value: "brv_ak_7f2c", label: false, ariaLabel: "Copy key id" }),
          ),
        ),
        c(
          "ButtonGroup (see dropdown for the split-button caret)",
          ButtonGroup({
            buttons: [
              Button({ label: "Day", variant: "outline" }),
              Button({ label: "Week", variant: "outline" }),
              Button({ label: "Month", variant: "outline" }),
            ],
          }),
        ),
      ],
    },
    {
      name: "card",
      cases: [
        ...cardVariants.map((variant) =>
          c(
            `variant ${variant}`,
            Card({
              variant,
              title: `${variant} card`,
              subtitle: "Subtitle",
              body: lorem,
              footer: Button({ label: "Action", size: "sm" }),
            }),
          )
        ),
        ...cardOrientations.map((orientation) =>
          c(
            `orientation ${orientation}`,
            Card({ orientation, media: { src: img(11), alt: "" }, title: orientation, body: lorem }),
          )
        ),
        ...cardTags.map((as) =>
          c(
            `as ${as}`,
            Card({ as, href: as === "a" ? "#" : undefined, interactive: true, title: `<${as}> card`, body: lorem }),
          )
        ),
        ...cardMediaRatios.map((ratio) =>
          c(
            `CardMedia ratio ${ratio}`,
            Card({
              media: {
                src: img(20 + cardMediaRatios.indexOf(ratio)),
                alt: "",
                ratio,
                loading: "eager",
                overlay: ratio,
              },
              title: ratio,
            }),
          )
        ),
        c(
          "selected + footerSplit + avatar + actions",
          Card({
            selected: true,
            interactive: true,
            avatar: Avatar({ initials: "GH", size: "sm" }),
            title: "Grace Hopper",
            subtitle: "Admin",
            actions: Button({ label: "Edit", size: "sm", variant: "ghost" }),
            body: lorem,
            footer: html`<span>Left</span><span>Right</span>`,
            footerSplit: true,
          }),
        ),
        c(
          "parts: CardHeader / CardBody / CardFooter / CardMedia",
          html`<div class="card">${CardMedia({ src: img(30), alt: "" })}${
            CardHeader({ title: "Assembled", subtitle: "from parts" }, { titleHref: "#" })
          }${CardBody(lorem)}${CardFooter({ content: Button({ label: "Done", size: "sm" }), split: true })}</div>`,
        ),
      ],
    },
    {
      name: "chart",
      cases: chartTypes.map((type) =>
        c(`type ${type}`, Chart({ type, id: `cat-chart-${type}`, height: 200, ...chartSamples[type] }))
      ).concat([
        c(
          "sparkline + title + stacked + toolbar",
          row(
            Chart({ type: "area", sparkline: true, height: 60, series: [{ data: [3, 5, 4, 8, 6, 9] }] }),
            Chart({
              type: "bar",
              stacked: true,
              toolbar: true,
              title: "Stacked",
              height: 200,
              series: [{ name: "A", data: [1, 2, 3] }, { name: "B", data: [2, 1, 2] }],
              categories: ["x", "y", "z"],
            }),
          ),
        ),
      ]),
    },
    {
      name: "choice",
      cases: [
        ...choiceTypes.map((type) =>
          c(
            `Choice ${type}`,
            row(
              Choice({ type, label: "Unchecked", name: `cat-${type}` }),
              Choice({ type, label: "Checked", checked: true, name: `cat-${type}` }),
              Choice({ type, label: "Disabled", disabled: true, name: `cat-${type}-d` }),
            ),
          )
        ),
        c("Checkbox / Radio", row(Checkbox({ label: "Checkbox" }), Radio({ label: "Radio", name: "cat-r" }))),
        c(
          "ChoiceGroup inline / stacked",
          row(
            ChoiceGroup({ inline: true, items: [Checkbox({ label: "A" }), Checkbox({ label: "B" })] }),
            ChoiceGroup({ items: [Radio({ name: "cat-g", label: "One" }), Radio({ name: "cat-g", label: "Two" })] }),
          ),
        ),
      ],
    },
    {
      name: "collapsible",
      cases: [
        c(
          "Collapsible closed / defaultOpen",
          html`<div class="stack stack--sm">${Collapsible({ id: "cat-col-1", title: "Closed", content: lorem })}${
            Collapsible({ id: "cat-col-2", title: "Open", content: lorem, defaultOpen: true })
          }</div>`,
        ),
        c(
          "Accordion",
          Accordion({
            id: "cat-acc",
            items: [{ title: "First", content: lorem, defaultOpen: true }, { title: "Second", content: lorem }, {
              title: "Third",
              content: lorem,
            }],
          }),
        ),
      ],
    },
    {
      name: "combobox",
      cases: [
        c(
          "hints: false — reads as a dropdown (#cat-cb-nohints)",
          Combobox({
            id: "cat-cb-nohints",
            name: "owner",
            placeholder: "Owner",
            hints: false,
            options: [{ value: "ada", label: "Ada Lovelace" }, { value: "alan", label: "Alan Turing" }],
          }),
        ),
        c(
          "server-driven — action answers ?q= with a ComboboxList (#reviewer)",
          Combobox({
            id: "reviewer",
            name: "reviewer",
            label: "Assign reviewer",
            query: "gra",
            open: true,
            action: routes.reviewers,
            options: reviewerOptions.filter((o) => matches(o.label, "gra")),
            selected: "gh",
          }),
        ),
        c(
          "single, closed",
          Combobox({
            id: "cat-cb-1",
            name: "one",
            label: "Reviewer",
            placeholder: "Search…",
            options: [{ value: "a", label: "Ada" }, { value: "g", label: "Grace", meta: "Admin" }],
            hint: "Type to filter",
          }),
        ),
        c(
          "single, open with query + groups + lead",
          Combobox({
            id: "cat-cb-2",
            name: "two",
            label: "Open",
            query: "a",
            open: true,
            selected: "a",
            options: [{ value: "a", label: "Ada", group: "Team", lead: Avatar({ initials: "A", size: "sm" }) }, {
              value: "g",
              label: "Grace",
              group: "Elsewhere",
            }],
          }),
        ),
        c(
          "multi with tokens",
          Combobox({
            id: "cat-cb-3",
            name: "three",
            label: "Multi",
            multi: true,
            selected: ["a", "g"],
            options: [{ value: "a", label: "Ada" }, { value: "g", label: "Grace" }, { value: "k", label: "Katherine" }],
          }),
        ),
        c(
          "empty state",
          Combobox({
            id: "cat-cb-4",
            name: "four",
            label: "Empty",
            open: true,
            query: "zzz",
            options: [],
            emptyText: "Nobody matches.",
          }),
        ),
        c(
          "ComboboxList fragment",
          ComboboxList({
            id: "cat-cb-5",
            query: "gr",
            options: [{ value: "g", label: "Grace" }, { value: "gb", label: "Graham" }],
          }),
        ),
      ],
    },
    {
      name: "command",
      cases: [
        c(
          "inline, server-driven — action answers ?q= with a CommandList (#palette)",
          Command({
            id: "palette",
            inline: true,
            query: "inv",
            action: routes.commands,
            items: commandItems.filter((i) => matches(i.label, "inv")),
          }),
        ),
        c(
          "inline with groups, icons, badges, shortcuts",
          Command({
            id: "cat-cmd-1",
            inline: true,
            items: [{ label: "New invoice", group: "Actions", icon: "invoice", shortcut: "⌘N" }, {
              label: "Open table",
              group: "Actions",
              icon: "table",
              href: "#",
            }, { label: "INV-1", group: "Recent", badge: "IN", meta: "$1" }],
          }),
        ),
        c(
          "inline empty + placeholder + label",
          Command({
            id: "cat-cmd-2",
            inline: true,
            query: "zzz",
            items: [],
            emptyText: "Nothing.",
            placeholder: "Type a command",
            label: "Commands",
          }),
        ),
        c("floating (closed; ⌘K opens)", Command({ id: "cat-cmd-3", items: [{ label: "Only in the palette" }] })),
        c(
          "CommandList fragment",
          CommandList({ id: "cat-cmd-4", query: "in", items: [{ label: "Invite", icon: "users" }] }),
        ),
      ],
    },
    {
      name: "data-table",
      cases: [
        c("projects — sorted and paged by the server (#projects)", projectsTable(routes, state.projects)),
        c(
          "invoices — selectable, bulk bar, row action strips (RowActions), sticky header, sorted by the server (#invoices)",
          invoicesTable(routes, state.invoices, state.invoiceEdits),
        ),
        c(
          "selectable, sortable, pinned/mono/numeric, bulk bar, row actions, footer",
          DataTable<Row>({
            id: "cat-dt-1",
            title: "Accounts",
            selectable: true,
            selected: ["2"],
            sort: { key: "name", dir: "asc" },
            buildSortHref: (k, d) => `?sort=${k}&dir=${d}`,
            bulkAction: "?bulk",
            columns: [{ key: "id", label: "ID", pinned: true, mono: true, sortable: true }, {
              key: "name",
              label: "Name",
              sortable: true,
            }, {
              key: "status",
              label: "Status",
              render: (r) =>
                Badge({ label: r.status, variant: r.status === "Active" ? "success" : "neutral", dot: true }),
            }, { key: "amount", label: "Amount", numeric: true }],
            rows,
            rowKey: (r) => r.id,
            bulkActions: Button({
              label: "Archive",
              size: "sm",
              type: "submit",
              attrs: { name: "op", value: "archive" },
            }),
            rowActions: (r) =>
              RowActions({
                id: `cat-dt-row-${r.id}`,
                label: `Actions for ${r.name}`,
                items: [{ label: "Edit", href: "#" }, { label: "Duplicate", href: "#" }, {
                  label: "Remove",
                  href: "#",
                  danger: true,
                }],
              }),
            toolbar: Input({
              type: "search",
              placeholder: "Filter",
              size: "sm",
              attrs: { "data-table-search": "", "aria-label": "Filter accounts" },
            }),
            footer: html`<span>3 rows</span>`,
            attrs: { "data-filter-scope": "" },
          }),
        ),
        ...(["sm", "md", "lg"] as const).map((maxHeight) =>
          c(
            `maxHeight ${maxHeight}`,
            DataTable<Row>({
              id: `cat-dt-${maxHeight}`,
              maxHeight,
              columns: [{ key: "name", label: "Name" }],
              rows,
              rowKey: (r) => r.id,
            }),
          )
        ),
        c(
          "sortable + toolbar + pagination footer (no selection)",
          DataTable<Row>({
            id: "cat-dt-plain",
            sort: { key: "name", dir: "desc" },
            buildSortHref: (k, d) => `?sort=${k}&dir=${d}`,
            columns: [
              { key: "name", label: "Name", sortable: true },
              { key: "status", label: "Status", render: (r) => Badge({ label: r.status }) },
              { key: "amount", label: "Amount", numeric: true, sortable: true },
            ],
            rows,
            rowKey: (r) => r.id,
            toolbar: Input({
              type: "search",
              placeholder: "Search",
              size: "sm",
              attrs: { "data-table-search": "", "aria-label": "Search rows" },
            }),
            footer: Pagination({ page: 1, totalPages: 2, buildHref: (p) => `?p=${p}` }),
            attrs: { "data-filter-scope": "" },
          }),
        ),
        c(
          "cellAttrs / headAttrs, rowSelectable, selectAll, countLabels, POST row actions with confirm (#cat-dt-adv)",
          DataTable<Row>({
            id: "cat-dt-adv",
            selectable: true,
            rowSelectable: (r) => r.status !== "Paused",
            selectAll: { total: 240, fields: { status: "active" } },
            countLabels: { one: "1 account selected", other: "{n} accounts selected" },
            bulkAction: "?bulk",
            bulkActions: Button({
              label: "Archive",
              size: "sm",
              type: "submit",
              attrs: { name: "op", value: "archive", "data-confirm": "Archive the selected accounts?" },
            }),
            columns: [
              {
                key: "name",
                label: "Name",
                headAttrs: { "data-col": "name" },
                cellAttrs: (r) => ({ "data-card": "primary", title: `Account ${r.name}` }),
              },
              { key: "status", label: "Status", cellAttrs: { class: "cat-dt-status", "data-card": "badge" } },
              { key: "amount", label: "Amount", numeric: true },
            ],
            rows,
            rowKey: (r) => r.id,
            rowActions: (r) =>
              RowActions({
                id: `cat-dt-adv-${r.id}`,
                label: `Actions for ${r.name}`,
                csrfToken: "demo-token",
                items: [
                  { label: "Open", href: "#" },
                  { label: "Lock", post: "?lock", fields: { id: r.id }, target: "#cat-dt-adv" },
                  // A confirm passed through attrs, not the prop, must survive.
                  { label: "Archive", post: "?archive", attrs: { "data-confirm": `Archive ${r.name}?` } },
                  {
                    label: "Delete",
                    post: "?delete",
                    fields: { id: r.id },
                    danger: true,
                    confirm: `Delete ${r.name}?`,
                  },
                ],
              }),
          }),
        ),
        c(
          "rowSelectable — no row on the page can be selected: no column, no bar (#cat-dt-none)",
          DataTable<Row>({
            id: "cat-dt-none",
            selectable: true,
            rowSelectable: () => false,
            bulkActions: Button({ label: "Archive", size: "sm" }),
            columns: [{ key: "name", label: "Name" }],
            rows,
            rowKey: (r) => r.id,
          }),
        ),
        c(
          "a Select and a Combobox in the toolbar — their lists open over the sticky header (#cat-dt-tools)",
          DataTable<Row>({
            id: "cat-dt-tools",
            maxHeight: "sm",
            toolbar: html`${
              Select({
                id: "cat-dt-tools-status",
                name: "status",
                options: [
                  { value: "", label: "All statuses" },
                  { value: "active", label: "Active" },
                  {
                    value: "paused",
                    label: "Paused",
                  },
                  { value: "closed", label: "Closed" },
                  { value: "draft", label: "Draft" },
                ],
                attrs: { "aria-label": "Status" },
              })
            }${
              Combobox({
                id: "cat-dt-tools-owner",
                name: "owner",
                placeholder: "Owner",
                hints: false,
                options: rows.map((r) => ({ value: r.id, label: r.name })),
              })
            }`,
            columns: [{ key: "name", label: "Name" }, { key: "status", label: "Status" }, {
              key: "amount",
              label: "Amount",
              numeric: true,
            }],
            rows: [
              ...rows,
              ...rows.map((r) => ({ ...r, id: `${r.id}b` })),
              ...rows.map((r) => ({ ...r, id: `${r.id}c` })),
            ],
            rowKey: (r) => r.id,
          }),
        ),
        c(
          "emptyMessage",
          DataTable<Row>({
            id: "cat-dt-msg",
            columns: [{ key: "name", label: "Name" }],
            rows: [],
            rowKey: (r) => r.id,
            emptyMessage: "Nothing here.",
          }),
        ),
        c(
          "empty",
          DataTable<Row>({
            id: "cat-dt-empty",
            columns: [{ key: "name", label: "Name" }],
            rows: [],
            rowKey: (r) => r.id,
            empty: Empty({ variant: "inline", title: "No rows", icon: "table" }),
          }),
        ),
      ],
    },
    {
      name: "datepicker",
      cases: [
        c(
          "range, inline, server mode — month/day/preset links are swaps (#period)",
          DatePicker(periodPicker(routes, state.period)),
        ),
        c(
          "single, closed (client mode)",
          DatePicker({ id: "cat-dp-1", name: "d1", start: "2026-09-14", today: "2026-09-14" }),
        ),
        c(
          "range, inline, open, min/max",
          DatePicker({
            id: "cat-dp-2",
            name: "d2",
            range: true,
            inline: true,
            open: true,
            start: "2026-09-08",
            end: "2026-09-14",
            today: "2026-09-14",
            min: "2026-09-02",
            max: "2026-09-28",
          }),
        ),
        c(
          "server mode, align end, presets",
          DatePicker({
            id: "cat-dp-3",
            name: "d3",
            align: "end",
            open: true,
            inline: true,
            today: "2026-09-14",
            buildMonthHref: (y, m) => `?m=${y}-${m + 1}`,
            buildDayHref: (iso) => `?d=${iso}`,
            presets: [{ label: "Today", href: "?d=2026-09-14" }],
          }),
        ),
        c(
          "DatePickerPanel fragment",
          DatePickerPanel({ id: "cat-dp-4", name: "d4", year: 2026, month: 8, today: "2026-09-14" }),
        ),
      ],
    },
    {
      name: "timepicker",
      cases: [
        c(
          "typeable segments, 15-minute slots, zone chip (#tp-basic)",
          TimePicker({ id: "tp-basic", name: "at", value: "09:30", zone: "UTC", label: "Start time" }),
        ),
        c(
          "min/max, 30-minute step, empty (#tp-bounds)",
          TimePicker({ id: "tp-bounds", name: "open", min: "09:00", max: "17:30", step: 30 }),
        ),
        c(
          "required, in a validated form (#tp-form)",
          Form({
            id: "tp-form",
            action: "?time",
            validate: true,
            content: html`${
              FormField({
                id: "tp-req",
                label: "Pickup",
                required: true,
                help: "Between 08:00 and 18:00.",
                control: (a) =>
                  TimePicker({
                    id: a.id,
                    name: "pickup",
                    required: true,
                    min: "08:00",
                    max: "18:00",
                    messages: { required: "Pick a pickup time." },
                  }),
              })
            }${FormActions({ content: Button({ label: "Book", type: "submit" }) })}`,
          }),
        ),
        c(
          "invalid (a server error), align end",
          TimePicker({ id: "tp-invalid", name: "late", value: "23:45", invalid: true, align: "end" }),
        ),
        c("disabled", TimePicker({ id: "tp-disabled", name: "off", value: "12:00", disabled: true })),
        c('Input({ type: "time" }) renders it', Input({ id: "tp-input", name: "t", type: "time", step: 1800 })),
      ],
    },
    {
      name: "datetimepicker",
      cases: [
        c(
          "UTC, presets, bounds (#dtp-basic)",
          DateTimePicker({
            id: "dtp-basic",
            name: "go_live",
            value: "2026-09-20T09:00:00Z",
            min: "2026-09-14T08:30:00Z",
            max: "2026-12-31T23:59:00Z",
            today: "2026-09-14",
            presets: dateTimePresets(new Date("2026-09-14T10:12:00Z")),
          }),
        ),
        c(
          "empty, required, in a validated form (#dtp-form)",
          Form({
            id: "dtp-form",
            action: "?expiry",
            validate: true,
            content: html`${
              FormField({
                id: "dtp-req-time",
                label: "Expires",
                required: true,
                control: () =>
                  DateTimePicker({ id: "dtp-req", name: "expires", required: true, today: "2026-09-14", step: 60 }),
              })
            }${FormActions({ content: Button({ label: "Save", type: "submit" }) })}`,
          }),
        ),
        c(
          "clearable — an optional moment (#dtp-clear)",
          DateTimePicker({
            id: "dtp-clear",
            name: "expires_on",
            value: "2026-10-01T18:00:00Z",
            today: "2026-09-14",
            clearable: true,
          }),
        ),
        c(
          "local — edited in the viewer's zone, posted as UTC (#dtp-local)",
          DateTimePicker({
            id: "dtp-local",
            name: "audit_from",
            value: "2026-09-14T23:30:00Z",
            local: true,
            today: "2026-09-14",
          }),
        ),
        c(
          "invalid, disabled",
          row(
            DateTimePicker({
              id: "dtp-invalid",
              name: "i",
              value: "2026-09-14T12:00:00Z",
              invalid: true,
              today: "2026-09-14",
            }),
            DateTimePicker({
              id: "dtp-disabled",
              name: "d",
              value: "2026-09-14T12:00:00Z",
              disabled: true,
              today: "2026-09-14",
            }),
          ),
        ),
      ],
    },
    {
      name: "dropdown",
      cases: dropdownAligns.map((align) =>
        c(
          `align ${align}`,
          Dropdown({
            id: `cat-dd-${align}`,
            trigger: `Options ${align}`,
            align,
            content: Menu({ items: [{ label: "Edit", href: "#" }, { label: "Delete", href: "#" }] }),
          }),
        )
      ).concat([
        c(
          "triggerClass (split button caret)",
          ButtonGroup({
            buttons: [
              Button({ label: "Download" }),
              Dropdown({
                id: "cat-dd-split",
                trigger: Icon("chevronDown", { size: 15 }),
                triggerClass: "btn btn--primary",
                content: Menu({ items: [{ label: "PDF", href: "#" }, { label: "CSV", href: "#" }] }),
              }),
            ],
          }),
        ),
      ]),
    },
    {
      name: "dropzone",
      cases: [
        c(
          "in an upload form (#cat-dz-1) — pick files and Upload: pending rows with progress, then the server's rows",
          Form({
            id: "cat-dz-form",
            action: routes.upload,
            attrs: { "data-action": routes.upload, "data-target": "#cat-dz-1", "data-swap": "outer" },
            content: html`${Dropzone({ id: "cat-dz-1", name: "files", multiple: true, hint: "Anything up to 10 MB" })}${
              FormActions({ content: Button({ label: "Upload", type: "submit" }) })
            }`,
          }),
        ),
        c(
          "multiple with uploading / done / error / removable rows",
          Dropzone({
            id: "cat-dz-2",
            name: "files",
            multiple: true,
            label: "Drop files here",
            files: [{ name: "a.pdf", kind: "pdf", size: "2 MB", progress: 40 }, {
              name: "b.png",
              size: "80 KB",
              removeHref: "#",
            }, { name: "c.zip", error: "Unsupported" }],
          }),
        ),
      ],
    },
    {
      name: "editor",
      cases: [
        c(
          "mode markdown — toolbar inserts syntax; Preview is rendered by the server (#note)",
          Editor({
            id: "note",
            name: "note",
            mode: "markdown",
            value: "Release notes\n\n- faster builds\n- **dark mode**",
            previewAction: routes.preview,
            placeholder: "Write in Markdown…",
          }),
        ),
        c(
          "mode html — WYSIWYG surface, HTML mirrored into the textarea that submits (#bio)",
          Editor({
            id: "bio",
            name: "bio",
            mode: "html",
            value: "<p>Hello <strong>world</strong></p>",
            placeholder: "Tell us about yourself",
          }),
        ),
        c(
          "disabled / invalid",
          row(
            Editor({ id: "cat-ed-dis", name: "d", value: "Read-only", disabled: true, rows: 3 }),
            Editor({ id: "cat-ed-inv", name: "i", value: "Too short", invalid: true, rows: 3 }),
          ),
        ),
      ],
    },
    {
      name: "empty",
      cases: [
        ...emptyVariants.flatMap((variant) =>
          emptyTones.map((tone) =>
            c(
              `variant ${variant} · tone ${tone}`,
              Empty({
                variant,
                tone,
                icon: tone === "error" ? "warning" : "folder",
                title: `${variant} ${tone}`,
                text: "Some explanatory text.",
                code: tone === "error" ? "500 · req_1" : undefined,
                actions: Button({ label: "Act", size: "sm" }),
              }),
            )
          )
        ),
        c(
          "icon as Html (another icon set), text as Html, details (#cat-empty-details)",
          html`<div id="cat-empty-details">${
            Empty({
              variant: "inline",
              icon: html`<span class="cat-own-icon">#</span>`,
              title: "No tags yet",
              text: html`Tags group links by <strong>campaign</strong>.`,
              details: html`<span>Included in ${Badge({ label: "Pro", variant: "accent" })}</span>`,
              actions: Button({ label: "Compare plans", size: "sm", variant: "outline" }),
            })
          }</div>`,
        ),
      ],
    },
    {
      name: "form-field",
      cases: [
        c(
          "label, help, required, error, a11y control",
          FormGrid({
            fields: [
              FormField({ id: "cat-ff-1", label: "Plain", span: 6, control: Input({ id: "cat-ff-1" }) }),
              FormField({
                id: "cat-ff-2",
                label: "Required + help",
                required: true,
                help: "We never share it.",
                span: 6,
                control: Input({ id: "cat-ff-2" }),
              }),
              FormField({
                id: "cat-ff-3",
                label: "Error (a11y wiring)",
                error: "That is not right.",
                span: 4,
                control: (a) =>
                  Input({ id: "cat-ff-3", invalid: a.invalid, attrs: { "aria-describedby": a.describedBy } }),
              }),
              FormField({ id: "cat-ff-4", label: "span 3", span: 3, control: Input({ id: "cat-ff-4" }) }),
              FormField({ id: "cat-ff-5", label: "span 12", span: 12, control: Textarea({ id: "cat-ff-5" }) }),
            ],
          }),
        ),
        c(
          "FormActions",
          FormActions({ content: html`${Button({ label: "Cancel", variant: "ghost" })}${Button({ label: "Save" })}` }),
        ),
      ],
    },
    {
      name: "form",
      cases: [
        c("plain", Form({ id: "cat-form-1", action: "#", content: FormField({ label: "Name", control: Input({}) }) })),
        c(
          "csrfToken — the hidden field a no-JS POST carries; CsrfField for a hand-built form",
          html`${
            Form({
              id: "cat-form-csrf",
              action: "?save",
              csrfToken: "demo-token",
              content: FormField({ label: "Name", control: Input({ name: "name" }) }),
            })
          }<form method="post" action="?revoke">${CsrfField({ token: "demo-token" })}${
            Button({ label: "Revoke", size: "sm", variant: "danger", type: "submit" })
          }</form>`,
        ),
        c(
          "autosubmit — a filter bar: a choice submits, typing does not (#cat-autosubmit)",
          Form({
            id: "cat-autosubmit",
            action: "?filter",
            method: "get",
            autosubmit: true,
            attrs: { "data-cat-autosubmit": "" },
            content: html`<div class="cat-row">${
              Input({ type: "search", name: "q", placeholder: "Search", size: "sm", attrs: { "aria-label": "Search" } })
            }${
              Select({
                id: "cat-autosubmit-status",
                name: "status",
                options: [{ value: "", label: "All" }, { value: "active", label: "Active" }, {
                  value: "paused",
                  label: "Paused",
                }],
                attrs: { "aria-label": "Status" },
              })
            }${
              Segmented({
                id: "cat-autosubmit-range",
                name: "range",
                size: "sm",
                value: "7d",
                legend: "Range",
                options: [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }],
              })
            }</div>`,
          }),
        ),
        c(
          "method get + error banner",
          Form({
            id: "cat-form-2",
            action: "#",
            method: "get",
            error: formError,
            content: FormField({ label: "Email", control: Input({ type: "email", invalid: true }) }),
          }),
        ),
        c(
          "validate: true — inline client-side validation (required, email, pattern, min/max, password strength + confirm)",
          Form({
            id: "cat-validate",
            action: "?validate",
            validate: true,
            content: html`${
              FormGrid({
                fields: [
                  FormField({
                    id: "cv-email",
                    label: "Email",
                    required: true,
                    span: 6,
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
                    id: "cv-handle",
                    label: "Handle",
                    help: "3–20 lowercase letters, digits or dashes.",
                    span: 6,
                    control: (a) =>
                      Input({
                        id: a.id,
                        name: "handle",
                        minLength: 3,
                        maxLength: 20,
                        pattern: "[a-z0-9\\-]+",
                        validateAction: routes.checkHandle || undefined,
                        messages: {
                          pattern: "Lowercase letters, digits and dashes only.",
                          minLength: "At least 3 characters.",
                        },
                        attrs: { "aria-describedby": a.describedBy },
                      }),
                  }),
                  FormField({
                    id: "cv-seats",
                    label: "Seats",
                    span: 6,
                    control: (a) =>
                      Input({
                        id: a.id,
                        name: "seats",
                        type: "number",
                        min: 1,
                        max: 500,
                        value: "0",
                        messages: { min: "At least one seat." },
                      }),
                  }),
                  FormField({
                    id: "cv-password",
                    label: "Password",
                    required: true,
                    help: "At least 12 characters.",
                    span: 6,
                    control: (a) =>
                      Input({
                        id: a.id,
                        name: "password",
                        type: "password",
                        required: true,
                        minLength: 12,
                        autocomplete: "new-password",
                        strength: true,
                        strengthMin: 3,
                        messages: { minLength: "Use at least 12 characters.", strength: "Choose a stronger password." },
                        attrs: { "aria-describedby": a.describedBy },
                      }),
                  }),
                  FormField({
                    id: "cv-confirm",
                    label: "Confirm password",
                    required: true,
                    span: 6,
                    control: (a) =>
                      Input({
                        id: a.id,
                        name: "confirm",
                        type: "password",
                        required: true,
                        autocomplete: "new-password",
                        match: "#cv-password",
                        messages: { match: "The passwords do not match." },
                      }),
                  }),
                ],
              })
            }${FormActions({ content: Button({ label: "Create account", type: "submit" }) })}`,
          }),
        ),
      ],
    },
    {
      name: "grid",
      cases: [
        c(
          "every GridColSpan",
          Grid({
            items: gridSpans.map((span) =>
              GridCol({ span, content: html`<div class="cat-swatch">${String(span)}</div>` })
            ),
          }),
        ),
        c("default span", Grid({ items: [GridCol({ content: html`<div class="cat-swatch">default</div>` })] })),
      ],
    },
    {
      name: "input",
      cases: [
        c(
          "type email + domains — local part, fixed @, the domain (one domain: fixed text)",
          html`<div class="stack stack--sm">${
            Input({
              id: "cat-em-1",
              name: "email",
              type: "email",
              domains: ["acme.com", "acme.io"],
              value: "ada@acme.io",
            })
          }${Input({ id: "cat-em-2", name: "email", type: "email", domains: ["acme.com"] })}</div>`,
        ),
        c(
          "type tel + countries — country code, then the number",
          Input({
            id: "cat-tel-1",
            name: "phone",
            type: "tel",
            countries: [{ code: "+1", label: "US" }, { code: "+44", label: "UK" }, { code: "+91", label: "IN" }],
            value: "+44 20 7946 0958",
          }),
        ),
        c(
          "type tel + countries with flags — the library ships none; the demo draws five (examples/shared/flags.ts)",
          Input({ id: "cat-tel-2", name: "phone", type: "tel", countries: sampleCountries, value: "+49 30 901820" }),
        ),
        c(
          "type url + scheme — https:// fixed, the rest typed",
          Input({ id: "cat-url-1", name: "website", type: "url", scheme: "https://", value: "https://acme.com/team" }),
        ),
        c(
          "prefix / suffix",
          html`<div class="stack stack--sm">${
            Input({
              id: "cat-px-1",
              name: "amount",
              type: "number",
              prefix: "$",
              suffix: "per seat",
              min: 0,
              step: "any",
            })
          }${Input({ id: "cat-px-2", name: "weight", type: "number", suffix: "kg" })}</div>`,
        ),
        c(
          "Counter() alone — for a custom control that sets data-counter itself",
          html`${Input({ id: "cat-cnt-2", name: "tag", maxLength: 10, attrs: { "data-counter": "" } })}${
            Counter("cat-cnt-2", 10)
          }`,
        ),
        c(
          "counter (maxLength 40)",
          Input({ id: "cat-cnt-1", name: "title", maxLength: 40, counter: true, value: "Quarterly invoice run" }),
        ),
        c(
          "type search — clear button (clearable: false to drop it)",
          html`<div class="stack stack--sm">${
            Input({ id: "cat-srch-1", name: "q", type: "search", placeholder: "Search", value: "invoices" })
          }${
            Input({ id: "cat-srch-2", name: "q", type: "search", placeholder: "No clear button", clearable: false })
          }</div>`,
        ),
        c(
          "the invite form — email domains + tel countries + url scheme, validate + guard (#cat-invite; the app joins the parts)",
          inviteForm(routes),
        ),
        c("Input sizes", row(...inputSizes.map((size) => Input({ size, placeholder: size })))),
        c(
          "states",
          row(
            Input({ value: "Disabled", disabled: true }),
            Input({ value: "Readonly", readonly: true }),
            Input({ placeholder: "Required", required: true }),
            Input({ value: "bad", invalid: true }),
          ),
        ),
        c(
          "types",
          row(
            Input({ type: "email", placeholder: "email" }),
            Input({ type: "password", value: "secret" }),
            Input({ type: "number", value: "3" }),
            Input({ type: "search", placeholder: "search" }),
            Input({ type: "date" }),
          ),
        ),
        c(
          "FloatingInput",
          row(
            FloatingInput({ id: "cat-fl-1", label: "Empty" }),
            FloatingInput({ id: "cat-fl-2", label: "Filled", value: "Ada" }),
          ),
        ),
        c(
          "InputIcon start / end",
          row(
            InputIcon({ icon: Icon("search", { size: 16 }), control: Input({ placeholder: "Start" }) }),
            InputIcon({ icon: Icon("calendar", { size: 16 }), end: true, control: Input({ placeholder: "End" }) }),
          ),
        ),
        c(
          "InputGroup start / end / both / select",
          row(
            InputGroup({ start: "$", control: Input({ extraClass: "input-group__control" }) }),
            InputGroup({ end: "USD", control: Input({ extraClass: "input-group__control" }) }),
            InputGroup({ start: "https://", end: ".com", control: Input({ extraClass: "input-group__control" }) }),
            InputGroup({
              start: Select({ options: [{ value: "1", label: "+1" }], extraClass: "input-group__control" }),
              control: Input({ extraClass: "input-group__control" }),
            }),
          ),
        ),
        c(
          'Input({ type: "password" }) — the password field with its Show/Hide toggle',
          Input({ id: "cat-pw-1", name: "password", type: "password", required: true }),
        ),
        c(
          "reveal: false — the bare native control",
          Input({ id: "cat-pw-0", name: "password", type: "password", reveal: false }),
        ),
        c(
          "new password — strength bar (type to see it), strengthMin 3",
          Input({
            type: "password",
            id: "cat-pw-2",
            name: "password",
            minLength: 12,
            autocomplete: "new-password",
            strength: true,
            strengthMin: 3,
          }),
        ),
        c(
          "prefilled — bar scored on load",
          Input({
            type: "password",
            id: "cat-pw-3",
            name: "password",
            value: "correct horse battery",
            strength: true,
          }),
        ),
        c(
          "confirm — match: '#cat-pw-2'",
          Input({
            type: "password",
            id: "cat-pw-4",
            name: "confirm",
            match: "#cat-pw-2",
          }),
        ),
        c(
          "no reveal toggle, disabled",
          Input({
            type: "password",
            id: "cat-pw-5",
            name: "password",
            reveal: false,
            disabled: true,
          }),
        ),
        c(
          "in a FormField with a server error",
          FormField({
            id: "cat-pw-6",
            label: "Current password",
            error: "Wrong password.",
            control: (a) =>
              Input({
                type: "password",
                id: a.id,
                name: "password",
                invalid: a.invalid,
                attrs: { "aria-describedby": a.describedBy },
              }),
          }),
        ),
      ],
    },
    {
      name: "menu",
      cases: [c("nested, icons, active, expanded", Menu({ id: "cat-menu", items: menuItems }))],
    },
    {
      name: "modal",
      cases: [
        c(
          "open — shown as soon as it is on the page: on load, or when a swap brings it (#cat-modal-open)",
          html`${
            Button({
              label: "Swap it in",
              variant: "outline",
              attrs: { "data-cat-swap-in": "#cat-modal-open-template", id: "cat-modal-open-trigger" },
            })
          }<template id="cat-modal-open-template">${
            Modal({
              id: "cat-modal-open",
              title: "Opened by the server",
              open: true,
              body:
                html`<p>Rendered with <code>open: true</code>, the way a form that failed inside a modal comes back.</p>`,
              footer: Button({ label: "Close", variant: "ghost", attrs: { "data-modal-close": "" } }),
            })
          }</template>`,
        ),
        c(
          "ConfirmModal + data-confirm — a link, a button and a submit button ask first (#cat-confirm)",
          html`
            <div class="cat-row"
              id="cat-confirm">${Button({
                label: "Leave (link)",
                href: "#cat-confirmed",
                variant: "outline",
                attrs: { "data-confirm": "Leave this page?" },
              })}${Button({
                label: "Delete (button)",
                variant: "danger",
                attrs: { "data-confirm": "Delete it for good?", "data-confirm-label": "Delete", id: "cat-confirm-del" },
              })}<form method="get" action="#cat-confirmed" id="cat-confirm-form">${Button({
                label: "Send (submit)",
                type: "submit",
                attrs: { "data-confirm": "Send the form?" },
              })}</form></div>
            <p
              class="text-muted text-2xs">One ConfirmModal per page: this page's chrome renders it (the core template does in a rAPId app). Its props, kept out of the page in a template:</p>
            <template id="cat-confirm-sample">${ConfirmModal(
              { id: "cat-confirm-sample-dialog", title: "Sure?", confirmLabel: "OK", cancelLabel: "Back" },
            )}</template>
          `,
        ),
        c(
          "title + footer (button opens)",
          html`${Button({ label: "Open modal", attrs: { "data-modal-open": "#cat-modal-1" } })}${
            Modal({
              id: "cat-modal-1",
              title: "Confirm",
              body: lorem,
              footer: html`${Button({ label: "Cancel", variant: "ghost" })}${Button({ label: "OK" })}`,
            })
          }`,
        ),
        c(
          "label only (no title)",
          html`${
            Button({ label: "Open labelled modal", variant: "outline", attrs: { "data-modal-open": "#cat-modal-2" } })
          }${Modal({ id: "cat-modal-2", label: "Plain dialog", body: lorem })}`,
        ),
        c(
          "a form in a modal — Select, DateTimePicker (#cat-modal-3)",
          html`${
            Button({ label: "Open form modal", variant: "outline", attrs: { "data-modal-open": "#cat-modal-3" } })
          }${
            Modal({
              id: "cat-modal-3",
              title: "New destination",
              body: html`${
                FormField({
                  id: "cat-modal-sel",
                  label: "Kind",
                  control: (a) =>
                    Select({
                      id: a.id,
                      name: "kind",
                      value: "webhook",
                      options: [
                        { value: "webhook", label: "Webhook" },
                        { value: "ga4", label: "Google Analytics 4" },
                        { value: "slack", label: "Slack" },
                      ],
                    }),
                })
              }${
                FormField({
                  id: "cat-modal-at-time",
                  label: "Starts",
                  control: () =>
                    DateTimePicker({
                      id: "cat-modal-at",
                      name: "starts",
                      value: "2026-09-15T09:00:00Z",
                      today: "2026-09-14",
                    }),
                })
              }`,
              footer: html`${Button({ label: "Cancel", variant: "ghost" })}${Button({ label: "Save" })}`,
            })
          }`,
        ),
      ],
    },
    {
      name: "navbar",
      cases: [
        c(
          "brand, links, actions",
          Navbar({
            id: "cat-nav-1",
            brand: "Acme",
            links: [{ href: "#", label: "Home", active: true }, { href: "#", label: "Docs" }],
            actions: Button({ label: "Sign in", size: "sm" }),
          }),
        ),
        c("brand only", Navbar({ id: "cat-nav-2", brand: html`<span class="sidebar__brand-mark">A</span> Acme` })),
      ],
    },
    {
      name: "card-fields",
      cases: [
        c(
          "all four parts, luhn on, in a validating form — type 4242 4242 4242 4242 / 34 (Amex → 4-6-5, CVC 4)",
          Form({
            id: "cat-card-form",
            action: "?card",
            validate: true,
            content: html`${
              CardFields({
                name: "card",
                luhn: true,
                messages: { luhn: "Check the card number.", expired: "This card has expired." },
              })
            }${FormActions({ content: Button({ label: "Pay", type: "submit" }) })}`,
          }),
        ),
        c(
          "number + expiry only (a stored card's update)",
          CardFields({ name: "stored", fields: ["number", "expiry"] }),
        ),
        c(
          "no cardholder name, required off for CVC",
          CardFields({ name: "c3", fields: ["number", "expiry", "cvc"], required: { cvc: false } }),
        ),
        c(
          "server errors + values (name and expiry only — the number is never echoed)",
          CardFields({
            name: "c4",
            values: { name: "Ada Lovelace", expiry: "12/24" },
            errors: { number: "This card was declined.", expiry: "This card has expired." },
          }),
        ),
      ],
    },
    {
      name: "otp",
      cases: [
        c(
          "SMS code, 3 groups (#otp-sms)",
          Otp({
            id: "otp-sms",
            name: "code",
            label: "SMS code",
            hint: "Paste the whole code into any cell.",
            groups: 3,
          }),
        ),
        c(
          "server error, prefilled (#otp-err)",
          Otp({
            id: "otp-err",
            name: "code2",
            label: "With a server error",
            value: "48213",
            error: "That code has expired — request a new one.",
            length: 5,
          }),
        ),
        ...otpModes.map((mode) =>
          c(
            `mode ${mode}`,
            Otp({
              id: `cat-otp-${mode}`,
              name: mode,
              mode,
              label: mode,
              length: mode === "numeric" ? 6 : 8,
              groups: 2,
            }),
          )
        ),
        c(
          "value + error + hint",
          Otp({ id: "cat-otp-err", name: "e", value: "1234", length: 4, error: "Expired.", hint: "Check your phone." }),
        ),
        c(
          "disabled / autoSubmit / autofocus",
          row(
            Otp({ id: "cat-otp-dis", name: "d", length: 4, disabled: true }),
            Otp({ id: "cat-otp-auto", name: "a", length: 4, autoSubmit: true, autofocus: false }),
          ),
        ),
      ],
    },
    {
      name: "page-header",
      cases: [
        c("title only", PageHeader({ title: "Title" })),
        c(
          "level 2 + badge — a section's own header",
          PageHeader({
            level: 2,
            title: "Single sign-on",
            subtitle: "Let people sign in with your identity provider.",
            badge: Badge({ label: "Business", variant: "accent" }),
            actions: Button({ label: "Add provider", size: "sm" }),
          }),
        ),
        c(
          "subtitle, breadcrumb, actions",
          PageHeader({
            title: "Projects",
            subtitle: "All of them.",
            breadcrumb: Breadcrumb({ items: [{ label: "Home", href: "#" }, { label: "Projects" }] }),
            actions: Button({ label: "New", size: "sm" }),
          }),
        ),
      ],
    },
    {
      name: "pagination",
      cases: [
        c(
          "middle page with ellipses",
          Pagination({ id: "cat-pg-1", page: 5, totalPages: 12, buildHref: (p) => `?page=${p}` }),
        ),
        c(
          "first / last (disabled arrows), single page",
          row(
            Pagination({ page: 1, totalPages: 3, buildHref: (p) => `?p=${p}` }),
            Pagination({ page: 3, totalPages: 3, buildHref: (p) => `?p=${p}` }),
            Pagination({ page: 1, totalPages: 1, buildHref: (p) => `?p=${p}` }),
          ),
        ),
        c(
          "siblingCount 2, swap target, linkAttrs",
          Pagination({
            id: "cat-pg-2",
            page: 6,
            totalPages: 12,
            siblingCount: 2,
            target: "#cat-pg-2",
            linkAttrs: { rel: "nofollow" },
            buildHref: (p) => `?page=${p}`,
          }),
        ),
      ],
    },
    {
      name: "popover",
      cases: [
        c(
          "profile card (#gh-card)",
          Popover({
            id: "gh-card",
            trigger: PopoverTrigger({ controls: "gh-card", label: "Grace Hopper" }),
            content: html`
              <div
                class="popover__header"><span><span class="popover__title">Grace Hopper</span><br><span class="popover__subtitle">grace@tundra.dev</span></span></div>
              <div
                class="popover__stats"><span class="popover__stat"><span class="popover__stat-value">148</span><span class="popover__stat-label">Reviews</span></span><span class="popover__stat"><span class="popover__stat-value">2.1h</span><span class="popover__stat-label">Median</span></span></div>
              <div class="popover__footer">${Button({ label: "Message", size: "sm" })}${Button({
                label: "Profile",
                size: "sm",
                variant: "outline",
              })}</div>
            `,
          }),
        ),
        ...popoverAligns.map((align) =>
          c(
            `align ${align}`,
            Popover({
              id: `cat-pop-${align}`,
              align,
              trigger: PopoverTrigger({ controls: `cat-pop-${align}`, label: align }),
              content: html`<div class="popover__header"><span class="popover__title">${align}</span></div>`,
            }),
          )
        ),
        c(
          "open + label",
          Popover({
            id: "cat-pop-open",
            open: true,
            label: "Details",
            trigger: PopoverTrigger({
              controls: "cat-pop-open",
              label: "Open",
              open: true,
              className: "btn btn--outline btn--sm",
            }),
            content: lorem,
          }),
        ),
        c(
          "loadFrom (lazy, data-load)",
          Popover({
            id: "cat-pop-lazy",
            loadFrom: "/fragments/profile",
            trigger: PopoverTrigger({ controls: "cat-pop-lazy", label: "Lazy" }),
          }),
        ),
      ],
    },
    {
      name: "progress",
      cases: [
        c(
          "Progress 0 / 60 / max 200",
          row(Progress({ value: 0 }), Progress({ value: 60 }), Progress({ value: 150, max: 200 })),
        ),
        c("Spinner", row(Spinner(), Spinner({ label: "Loading rows" }))),
      ],
    },
    {
      name: "segmented",
      cases: [
        ...segmentedSizes.map((size) =>
          c(
            `size ${size}`,
            Segmented({
              id: `cat-seg-${size}`,
              name: `seg-${size}`,
              size,
              legend: size,
              value: "b",
              options: [{ value: "a", label: "A" }, { value: "b", label: "B" }, {
                value: "c",
                label: "C",
                disabled: true,
              }],
            }),
          )
        ),
        c(
          "counts + Html label (#cat-seg-count)",
          Segmented({
            id: "cat-seg-count",
            name: "seg-count",
            size: "sm",
            value: "",
            legend: "Status",
            options: [
              { value: "", label: "All", count: html`<span>48.2k</span>`, countTitle: "48,213" },
              { value: "active", label: "Active", count: 120 },
              { value: "flagged", label: html`${Icon("warning", { size: 13 })}Flagged`, count: 3, alert: true },
              { value: "paused", label: "Paused", count: 0, alert: true },
            ],
          }),
        ),
        c(
          "icons + block",
          Segmented({
            id: "cat-seg-icons",
            name: "seg-icons",
            block: true,
            value: "list",
            options: [{ value: "list", icon: Icon("list", { size: 15 }), ariaLabel: "List" }, {
              value: "grid",
              icon: Icon("dashboard", { size: 15 }),
              ariaLabel: "Grid",
            }],
          }),
        ),
      ],
    },
    {
      name: "select",
      cases: [
        c(
          "options with a lead — any Html before the label, here a flag",
          Select({
            id: "cat-sel-lead",
            name: "market",
            value: "de",
            options: [
              { value: "fr", label: "France", lead: flags.fr },
              { value: "de", label: "Germany", lead: flags.de },
              { value: "it", label: "Italy", lead: flags.it },
              { value: "se", label: "Sweden", lead: flags.se },
            ],
          }),
        ),
        c(
          "plain / placeholder / value",
          row(
            Select({ id: "cat-sel", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }] }),
            Select({ placeholder: "Pick one", options: [{ value: "a", label: "Alpha" }] }),
            Select({ value: "b", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }] }),
          ),
        ),
        c(
          "disabled / required / invalid / disabled option",
          row(
            Select({ disabled: true, options: [{ value: "a", label: "Alpha" }] }),
            Select({ required: true, options: [{ value: "a", label: "Alpha" }] }),
            Select({ invalid: true, options: [{ value: "a", label: "Alpha" }] }),
            Select({ options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta (off)", disabled: true }] }),
          ),
        ),
      ],
    },
    {
      name: "sidebar",
      cases: [
        c(
          "brand + items",
          Sidebar({ id: "cat-sb-1", brand: html`<span class="sidebar__brand-mark">A</span> Acme`, items: menuItems }),
        ),
        c("collapsible", Sidebar({ id: "cat-sb-2", items: menuItems, collapsible: true })),
        c("SidebarToggle", SidebarToggle({ targetId: "cat-sb-1", label: "Menu" })),
      ],
    },
    {
      name: "skeleton",
      cases: [
        c("Skeleton variants", row(...skeletonVariants.map((variant) => Skeleton({ variant })))),
        c(
          "Skeleton widths",
          html`<div class="stack stack--sm">${
            skeletonWidths.map((width) => Skeleton({ variant: "text", width }))
          }</div>`,
        ),
        c("SkeletonTable rows/columns", SkeletonTable({ rows: 2, columns: [["md", "sm", "xs"], ["lg", "sm", "xs"]] })),
        c("SkeletonCard", SkeletonCard()),
      ],
    },
    {
      name: "slider",
      cases: [
        c(
          "unit / unitOne (#concurrency)",
          Slider({
            id: "concurrency",
            name: "concurrency",
            label: "Concurrency",
            min: 1,
            max: 32,
            value: 12,
            unit: "workers",
            unitOne: "worker",
          }),
        ),
        c(
          "plain / unit / step",
          row(
            Slider({ id: "cat-sl-1", name: "s1", label: "Plain", value: 40 }),
            Slider({
              id: "cat-sl-2",
              name: "s2",
              label: "Workers",
              min: 1,
              max: 32,
              value: 12,
              unit: "workers",
              unitOne: "worker",
            }),
            Slider({ id: "cat-sl-3", name: "s3", label: "Step 5", min: 0, max: 50, step: 5, value: 25 }),
          ),
        ),
        c(
          "scale + format / disabled",
          row(
            Slider({
              id: "cat-sl-4",
              name: "s4",
              label: "Size",
              min: 0,
              max: 3,
              value: 1,
              scale: ["S", "M", "L", "XL"],
              format: (v) => ["Small", "Medium", "Large", "XL"][v],
            }),
            Slider({ id: "cat-sl-5", name: "s5", label: "Disabled", value: 30, disabled: true }),
          ),
        ),
      ],
    },
    {
      name: "stat",
      cases: [
        c(
          "Stat tones",
          Grid({
            items: statTones.map((tone) =>
              GridCol({
                span: 4,
                content: Card({ body: Stat({ label: tone, value: "1,234", tone, icon: Icon("coin", { size: 20 }) }) }),
              })
            ),
          }),
        ),
        c(
          "trend up / down / no icon",
          row(
            Stat({ label: "Up", value: "12%", trend: { label: "+2.1%", up: true } }),
            Stat({ label: "Down", value: "8%", trend: { label: "-0.4%", up: false } }),
            Stat({ label: "Plain", value: "42" }),
          ),
        ),
      ],
    },
    {
      name: "switch",
      cases: [
        c(
          "off / on / disabled",
          row(
            Switch({ label: "Off" }),
            Switch({ label: "On", checked: true }),
            Switch({ label: "Disabled", disabled: true }),
            Switch({ label: "Disabled on", checked: true, disabled: true }),
          ),
        ),
        c(
          "hint + name/value",
          Switch({ id: "cat-sw", name: "notify", value: "yes", label: "Notify", hint: "Email on every deploy." }),
        ),
      ],
    },
    {
      name: "tabs",
      cases: [
        c(
          "default active",
          Tabs({
            id: "cat-tabs-1",
            items: [{ id: "a", label: "First", content: lorem }, { id: "b", label: "Second", content: lorem }, {
              id: "c",
              label: "Third",
              content: lorem,
            }],
          }),
        ),
        c(
          "TabLinks — tabs that are pages (#cat-tablinks)",
          TabLinks({
            id: "cat-tablinks",
            label: "Analytics",
            listAttrs: { class: "cat-tablinks-list", "data-kind": "links" },
            items: [
              { label: "Clicks", href: "#", current: true, icon: Icon("trendUp", { size: 15 }) },
              { label: "Conversions", href: "#", count: html`<span>1.2k</span>`, countTitle: "1,204" },
              { label: "Attribution", href: "#", badge: Badge({ label: "Pro", variant: "neutral" }) },
            ],
          }),
        ),
        c(
          "active = second",
          Tabs({
            id: "cat-tabs-2",
            active: "b",
            items: [{ id: "a", label: "First", content: lorem }, { id: "b", label: "Second", content: lorem }],
          }),
        ),
      ],
    },
    {
      name: "textarea",
      cases: [
        c(
          "counter (maxLength 280)",
          Textarea({ id: "cat-ta-cnt", name: "note", maxLength: 280, counter: true, rows: 3, value: "Ship it." }),
        ),
        c(
          "autosize — grows with the content",
          Textarea({ id: "cat-ta-auto", name: "note", autosize: true, rows: 2, placeholder: "Type a few lines…" }),
        ),
        c(
          "plain / rows / states",
          row(
            Textarea({ placeholder: "Plain" }),
            Textarea({ rows: 6, value: "Six rows" }),
            Textarea({ value: "Disabled", disabled: true }),
            Textarea({ value: "Readonly", readonly: true }),
            Textarea({ required: true, placeholder: "Required" }),
            Textarea({ value: "bad", invalid: true }),
          ),
        ),
      ],
    },
    {
      name: "timeline",
      cases: [
        c(
          "every status + meta",
          Timeline({
            id: "cat-tl",
            items: [
              ...timelineStatuses.map((status) => ({ title: status as string, meta: `meta for ${status}`, status })),
              { title: "No status" },
            ],
          }),
        ),
        c(
          "tones, icons and text",
          Timeline({
            id: "cat-tl-tones",
            attrs: { class: "cat-tl", "data-kind": "tones" },
            items: timelineTones.map((tone) => ({
              attrs: { class: `cat-tl-${tone}` },
              title: `tone ${tone}`,
              meta: "Sep 14",
              text: "What happened, and what happens next.",
              tone,
              icon: tone === "danger"
                ? Icon("x", { size: 12 })
                : tone === "info"
                ? Icon("info", { size: 12 })
                : undefined,
              status: "done" as const,
            })),
          }),
        ),
      ],
    },
    {
      name: "toast",
      cases: [
        c(
          routes.toast === "#"
            ? "Show toast — data-toast-open clones a <template> into #toast-region (no server on this page)"
            : "from the server — data-action appends into #toast-region",
          routes.toast === "#"
            ? html`${
              Button({ label: "Show toast", attrs: { "data-toast-open": "#cat-toast-template" } })
            }<template id="cat-toast-template">${
              Toast({ variant: "success", body: "Saved.", meta: "just now", dismissible: true, autoDismissMs: 6000 })
            }</template>`
            : Button({
              label: "Show toast",
              attrs: { "data-action": routes.toast, "data-target": "#toast-region", "data-swap": "append" },
            }),
        ),
        c(
          "Toast variants",
          html`<div class="stack stack--sm">${
            toastVariants.map((variant) => Toast({ variant, body: `${variant} toast`, meta: "just now" }))
          }</div>`,
        ),
        c(
          "icon / no icon / action / dismissible / autoDismiss",
          html`<div class="stack stack--sm">${Toast({ body: "Custom icon", icon: Icon("bell", { size: 13 }) })}${
            Toast({ body: "No icon", icon: false })
          }${Toast({ variant: "ink", body: "With action", action: { label: "Undo", attrs: { "data-undo": "" } } })}${
            Toast({ body: "Not dismissible", dismissible: false })
          }${Toast({ body: "Auto-dismiss 60s", autoDismissMs: 60000 })}</div>`,
        ),
        c(
          "ToastRegion with max",
          ToastRegion({ id: "cat-toast-region", max: 3, toasts: [Toast({ body: "In a region" })] }),
        ),
      ],
    },
    {
      name: "toolbar",
      cases: [
        c(
          "start + end",
          Toolbar({
            start: html`${Input({ type: "search", placeholder: "Search", size: "sm" })}${
              Select({ options: [{ value: "all", label: "All" }] })
            }`,
            end: html`${Button({ label: "Export", size: "sm", variant: "outline" })}${
              Button({ label: "New", size: "sm" })
            }`,
          }),
        ),
      ],
    },
    {
      name: "tooltip",
      cases: [
        c(
          "hover trigger",
          Tooltip({
            id: "cat-tip",
            trigger: Button({ label: "Hover me", variant: "outline", attrs: { "aria-describedby": "cat-tip" } }),
            content: "Helpful context",
          }),
        ),
      ],
    },
    {
      name: "wizard",
      cases: [
        c(
          "every step status",
          Wizard({ id: "cat-wz", steps: wizardStatuses.map((status) => ({ label: status, status })), content: lorem }),
        ),
        c(
          "steps only — no content (a flow whose pages carry their own)",
          Wizard({
            id: "cat-wz-steps",
            label: "Import steps",
            listAttrs: { class: "cat-wz-list" },
            steps: [{ label: "Upload", status: "done" }, { label: "Columns", status: "active" }, { label: "Results" }],
          }),
        ),
      ],
    },
  ];
}

/** Every entry, grouped — `routes` decides where the server-driven cases point. */
export function catalogue(routes: DemoRoutes = staticRoutes, state: CatalogueState = {}): CatalogueEntry[] {
  return entries(routes, state).map((e) => {
    const group = GROUP_OF[e.name];
    if (!group) throw new Error(`catalogue: components/${e.name} has no group in GROUP_OF`);
    return { ...e, group };
  });
}

/** The whole catalogue (or one group of it) as one page body. */
export function catalogueHtml(list: CatalogueEntry[] = catalogue()): Html {
  const entries = list;
  return html`<nav class="cat-nav" aria-label="Components">${
    entries.map((e) => html`<a href="#cat-${e.name}">${e.name}</a>`)
  }</nav>${
    entries.map((e) =>
      html`
        <section class="cat-section" id="cat-${e.name}"
          data-catalogue="${e.name}"><h2 class="cat-section__title">${e
            .name} <span class="text-mono text-2xs">components/${e.name}</span></h2>${e.cases.map((k) =>
              html`
                <div class="cat-case" data-case="${k.label}">
                  <p class="cat-case__label">${k.label}</p>
                  <div class="cat-case__body">${k.html}</div>
                </div>
              `
            )}</section>
      `
    )
  }`;
}

/** Harness-only layout for the catalogue page — not part of the library. */
export const catalogueCss =
  `.cat-nav { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-4) 0; font-size: var(--font-size-sm); }
.cat-section { display: flex; flex-direction: column; gap: var(--space-4); padding-top: var(--space-6); }
.cat-section__title { display: flex; align-items: baseline; gap: var(--space-3); padding-bottom: var(--space-2); border-bottom: var(--border-width) solid var(--color-border); font-size: var(--font-size-xl); }
.cat-section__title .text-2xs { color: var(--color-text-subtle); font-weight: var(--font-weight-normal); }
.cat-case { display: flex; flex-direction: column; gap: var(--space-2); }
.cat-case__label { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); font-family: var(--font-family-mono, monospace); }
.cat-case__body { padding: var(--space-4); border: var(--border-width) dashed var(--color-border); border-radius: var(--radius-md); }
.cat-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-start; }
.cat-narrow { max-width: 320px; }
.cat-own-icon { font-weight: var(--font-weight-semibold); }
.cat-swatch { background: var(--color-surface-alt); border: var(--border-width) dashed var(--color-border-strong); border-radius: var(--radius-md); padding: var(--space-2); text-align: center; font-size: var(--font-size-xs); }
`;
