/**
 * The recipes in docs/UI-Recipes.md as real code, so the guide's TypeScript
 * keeps type-checking against the library (`deno task check` covers this
 * file). Run it directly to render each recipe's standalone HTML into a
 * directory (`deno run -A examples/docs/recipes.ts <dir>`) — that render,
 * trimmed, is what the guide's HTML blocks show. Keep the two in step.
 */
import { type Html, html, type RapidFormError, render, template } from "@tundralibs/rapid/ui";
import { ensureDir, writeTextFile } from "@tundralibs/compat/file";
import { SidebarLayout } from "../../layouts/sidebar/sidebar.ts";
import { AuthLayout } from "../../layouts/auth/auth.ts";
import { asRapidLayout } from "../../templates/layout.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { Sidebar } from "../../components/sidebar/sidebar.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Button } from "../../components/button/button.ts";
import { Form } from "../../components/form/form.ts";
import { FormActions, FormField, FormGrid } from "../../components/form-field/form-field.ts";
import { Input } from "../../components/input/input.ts";
import { Switch } from "../../components/switch/switch.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Card } from "../../components/card/card.ts";
import { Chart } from "../../components/chart/chart.ts";
import { SkeletonTable } from "../../components/skeleton/skeleton.ts";
import { Timeline } from "../../components/timeline/timeline.ts";
import { DataTable, RowActions } from "../../components/data-table/data-table.ts";
import { Pagination } from "../../components/pagination/pagination.ts";
import { Badge } from "../../components/badge/badge.ts";
import { Empty } from "../../components/empty/empty.ts";
import { Dropzone, type DropzoneFile } from "../../components/dropzone/dropzone.ts";
import { Combobox, ComboboxList } from "../../components/combobox/combobox.ts";
import { Command, CommandList } from "../../components/command/command.ts";
import { Toast } from "../../components/toast/toast.ts";
import { Select } from "../../components/select/select.ts";
import { Alert } from "../../components/alert/alert.ts";
// Your flag set is whatever package gives you SVG strings:
//   import flagSvg from "some-flag-set";
//   const flag = (code: string) => raw(flagSvg[code]);
// The demos draw a few by hand instead, through exactly that helper.
import { flags, sampleCountries } from "../shared/flags.ts";
import { Icon } from "../../shared/icons.ts";

const out: Record<string, Html> = {};

/* ------------------------------------------------ 1. app shell */
const frame = (body: Html) =>
  SidebarLayout({
    sidebarId: "nav",
    header: Navbar({
      brand: "Acme",
      actions: html`${Button({ label: "Dark", size: "sm", variant: "outline", attrs: { "data-theme-toggle": "" } })}`,
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
export const layout = asRapidLayout((body) => frame(body));
out.shell = frame(html`${PageHeader({ title: "Dashboard" })}<p>Page content goes here.</p>`);

/* ------------------------------------------------ 2. sign in */
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
export const SignInPage = template<SignIn>((s) =>
  AuthLayout({
    brand: "Acme",
    split: true,
    narrative: html`
      <h2>Welcome back</h2>
      <p>Invoices, payments and reports in one place.</p>
    `,
    content: signInForm(s),
  }), "SignInPage");
out.signin = signInForm({ state: "clean" });
out.signinError = signInForm({
  state: "error",
  message: "Check the highlighted fields.",
  fields: { password: "Wrong password." },
  values: { email: "ada@acme.com" },
});

/* ------------------------------------------------ 3. dashboard */
const statsRow = (s: { revenue: string; open: number; overdue: number }) =>
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
export const StatsFragment = template<{ revenue: string; open: number; overdue: number }>(statsRow, "StatsFragment");
const dashboard = html`${
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
}`;
out.dashboard = dashboard;
out.stats = statsRow({ revenue: "$48,200", open: 12, overdue: 3 });

/* ------------------------------------------------ 4. invoices table */
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
export const InvoicesPage = template<InvoicesData>(
  (d) =>
    d.fragment
      ? invoicesTable(d.rows, d.sort, d.page, d.totalPages)
      : html`${PageHeader({ title: "Invoices", actions: Button({ label: "New invoice", href: "/invoices/new" }) })}${
        invoicesTable(d.rows, d.sort, d.page, d.totalPages)
      }`,
  "InvoicesPage",
);
out.invoices = invoicesTable(
  [
    { id: "INV-2048", client: "Northwind Traders", status: "Paid", total: "$12,400.00" },
    { id: "INV-2047", client: "Contoso Ltd", status: "Open", total: "$3,120.00" },
  ],
  { key: "id", dir: "desc" },
  1,
  4,
);

/* ------------------------------------------------ 5. upload */
const uploadForm = (files: DropzoneFile[]) =>
  Form({
    id: "attach",
    action: "/invoices/INV-2048/attachments",
    attrs: { "data-action": "/invoices/INV-2048/attachments", "data-target": "#attachments", "data-swap": "outer" },
    content: html`${
      Dropzone({
        id: "attachments",
        name: "files",
        multiple: true,
        accept: ".pdf,.png",
        hint: "PDF or PNG, up to 10 MB",
        files,
      })
    }${FormActions({ content: Button({ label: "Upload", type: "submit" }) })}`,
  });
export const AttachmentsFragment = template<{ files: DropzoneFile[] }>(
  (d) =>
    Dropzone({
      id: "attachments",
      name: "files",
      multiple: true,
      accept: ".pdf,.png",
      hint: "PDF or PNG, up to 10 MB",
      files: d.files,
    }),
  "AttachmentsFragment",
);
out.upload = uploadForm([{
  name: "contract.pdf",
  kind: "pdf",
  size: "2.4 MB",
  removeHref: "/invoices/INV-2048/attachments/contract.pdf/delete",
}]);

/* ------------------------------------------------ 6. search */
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
export const ReviewersFragment = template<{ q: string; options: { value: string; label: string; meta?: string }[] }>(
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
export const CommandsFragment = template<{ q: string; items: { label: string; href?: string; group?: string }[] }>(
  (d) => CommandList({ id: "palette", query: d.q, items: d.items }),
  "CommandsFragment",
);
out.search = html`${reviewer}${
  Button({
    label: "Search",
    size: "sm",
    variant: "outline",
    iconStart: Icon("search", { size: 14 }),
    attrs: { "data-command-open": "#palette" },
  })
}${palette}`;

/* ------------------------------------------------ 7. notifications */
export const ReminderToast = template<{ client: string }>(
  (d) => Toast({ variant: "success", body: `Reminder sent to ${d.client}`, dismissible: true, autoDismissMs: 6000 }),
  "ReminderToast",
);
out.toastButton = Button({
  label: "Send reminder",
  size: "sm",
  attrs: {
    "data-action": "/invoices/INV-2047/remind",
    "data-method": "post",
    "data-target": "#toast-region",
    "data-swap": "append",
  },
});
out.toast = Toast({ variant: "success", body: "Reminder sent to Contoso Ltd", dismissible: true, autoDismissMs: 6000 });

/* ------------------------------- 8. international contact form */
type Contact = { email: string; phone: string; website: string; market: string };

const contactForm = (received?: Contact) =>
  Form({
    id: "contact",
    action: "/contact",
    validate: true,
    guard: true,
    attrs: { "data-action": "/contact", "data-target": "#contact", "data-swap": "outer" },
    content: html`${
      received
        ? Alert({
          id: "contact-received",
          variant: "success",
          title: "Received",
          body:
            html`<code>${received.email}</code> · <code>${received.phone}</code> · <code>${received.website}</code> · ${received.market}`,
        })
        : ""
    }${
      FormGrid({
        fields: [
          FormField({
            id: "c-email",
            label: "Work email",
            required: true,
            help: "Company addresses only.",
            span: 6,
            control: (a) =>
              Input({
                id: a.id,
                name: "email",
                type: "email",
                required: true,
                domains: ["acme.com", "acme.io"],
                messages: { required: "Enter the part before the @.", pattern: "Just the part before the @." },
                attrs: { "aria-describedby": a.describedBy },
              }),
          }),
          FormField({
            id: "c-phone",
            label: "Phone",
            span: 6,
            control: (a) => Input({ id: a.id, name: "phone", type: "tel", countries: sampleCountries }),
          }),
          FormField({
            id: "c-website",
            label: "Website",
            span: 6,
            control: (a) =>
              Input({ id: a.id, name: "website", type: "url", scheme: "https://", placeholder: "acme.com" }),
          }),
          FormField({
            id: "c-market",
            label: "Primary market",
            span: 6,
            control: (a) =>
              Select({
                id: a.id,
                name: "market",
                value: "de",
                options: [
                  { value: "fr", label: "France", lead: flags.fr },
                  { value: "de", label: "Germany", lead: flags.de },
                  { value: "it", label: "Italy", lead: flags.it },
                  { value: "se", label: "Sweden", lead: flags.se },
                ],
              }),
          }),
        ],
      })
    }${FormActions({ content: Button({ label: "Send", type: "submit" }) })}`,
  });

export const ContactPage = template<{ received?: Contact }>((d) => contactForm(d.received), "ContactPage");
out.contact = contactForm();
out.contactReceived = contactForm({
  email: "grace@acme.io",
  phone: "+49 30 901820",
  website: "https://acme.com",
  market: "de",
});

/** Every recipe's rendered HTML, by name. */
export const rendered: Record<string, string> = Object.fromEntries(
  Object.entries(out).map(([name, h]) => [name, render(h)]),
);

if (import.meta.main) {
  // Deno.args / process.argv without touching either global directly.
  const g = globalThis as unknown as { Deno?: { args: string[] }; process?: { argv: string[] } };
  const dir = (g.Deno?.args ?? g.process?.argv.slice(2) ?? [])[0] ?? ".test-output/recipes";
  await ensureDir(dir);
  for (const [name, htmlText] of Object.entries(rendered)) await writeTextFile(`${dir}/${name}.html`, htmlText);
  console.log(`Rendered ${Object.keys(rendered).length} recipes to ${dir}/`);
}
