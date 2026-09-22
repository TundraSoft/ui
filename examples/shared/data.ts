/**
 * Sample data and the server-driven builders the catalogue and the rAPId
 * example app share: the projects table (sort + pagination), the invoices
 * table (sort), the reviewer combobox, the command palette and the period
 * picker. `routes` decides where their links point — inert query strings
 * on a static page, real routes in the app — so the same markup is both
 * the demo and the integration bed.
 */
import { type Html, html } from "@tundralibs/rapid/ui";
import { Badge } from "../../components/badge/badge.ts";
import { Alert } from "../../components/alert/alert.ts";
import { Button } from "../../components/button/button.ts";
import { Form } from "../../components/form/form.ts";
import { FormActions, FormField, FormGrid } from "../../components/form-field/form-field.ts";
import type { ComboboxOption } from "../../components/combobox/combobox.ts";
import type { CommandItem } from "../../components/command/command.ts";
import { DataTable, RowActions } from "../../components/data-table/data-table.ts";
import type { DatePickerProps } from "../../components/datepicker/datepicker.ts";
import { Input } from "../../components/input/input.ts";
import { Pagination } from "../../components/pagination/pagination.ts";

export type Dir = "asc" | "desc";

/** Where the server-driven pieces point. */
export type DemoRoutes = {
  /** The "Show toast" button's `data-action` — the server answers with a `Toast`. */
  toast: string;
  /** Combobox `action` — the server answers `?q=` with a `ComboboxList`. */
  reviewers: string;
  /** Command palette `action` — the server answers `?q=` with a `CommandList`. */
  commands: string;
  /** Sort / page links of the projects table (outer-swap `#projects`). */
  projectsSort: (key: string, dir: Dir) => string;
  projectsPage: (page: number) => string;
  /** Sort link of the invoices table (outer-swap `#invoices`). */
  invoiceSort: (key: string, dir: Dir) => string;
  /** Where the invoices bulk form posts (`op` + the checked `selected` ids); carries the current sort. */
  invoiceBulk: (sort: { key: string; dir: Dir }) => string;
  /** The editor's Markdown preview route — receives `text`, answers with an HTML fragment. */
  preview: string;
  /** The dropzone's upload form posts here (multipart); the server answers with the re-rendered `Dropzone`. */
  upload: string;
  /** `Input.validateAction` for the handle field — answers a message (taken) or nothing; empty on a static page. */
  checkHandle: string;
  /** The invite form (email domains, tel countries, url scheme) posts here; the server joins the parts. */
  invite: string;
  /** Month navigation / day pick / preset links of the period picker (outer-swap `#period`). */
  month: (year: number, month: number) => string;
  day: (iso: string) => string;
  preset: (name: string) => string;
};

/** Inert links for a static page: they render, but go nowhere. */
export const staticRoutes: DemoRoutes = {
  toast: "#",
  reviewers: "/reviewers",
  commands: "/commands",
  projectsSort: (key, dir) => `?psort=${key}&pdir=${dir}&page=1`,
  projectsPage: (p) => `?page=${p}`,
  invoiceSort: (key, dir) => `?sort=${key}&dir=${dir}`,
  invoiceBulk: () => "?bulk",
  preview: "/preview",
  upload: "?upload",
  checkHandle: "",
  invite: "?invite",
  month: (y, m) => `?month=${y}-${String(m + 1).padStart(2, "0")}`,
  day: (iso) => `?day=${iso}`,
  preset: (name) => `?preset=${name}`,
};

/** Case-insensitive contains — what a server would do with `?q=`. */
export const matches = (text: string, query: string): boolean =>
  text.toLowerCase().includes(query.trim().toLowerCase());

/* ----------------------------------------------------------- projects */

export type Project = { id: string; name: string; status: string };
export const projects: Project[] = Array.from({ length: 40 }, (_, i) => ({
  id: `${i + 1}`,
  name: `Project ${i + 1}`,
  status: i % 2 === 0 ? "Active" : "Archived",
}));
export const PAGE_SIZE = 5;
export type ProjectsState = { page: number; sort?: { key: string; dir: Dir } };

/** The projects table + pagination — the catalogue renders it, and so do the sort/page routes. */
export function projectsTable(routes: DemoRoutes, state?: ProjectsState): Html {
  state ??= { page: 2 };
  const sorted = state.sort
    ? [...projects].sort((a, b) => {
      const key = state.sort!.key as keyof Project;
      const cmp = key === "id" ? Number(a.id) - Number(b.id) : String(a[key]).localeCompare(String(b[key]));
      return state.sort!.dir === "asc" ? cmp : -cmp;
    })
    : projects;
  const totalPages = Math.ceil(projects.length / PAGE_SIZE);
  const page = Math.min(Math.max(1, state.page), totalPages);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return DataTable({
    id: "projects",
    columns: [
      { key: "name", label: "Name", sortable: true },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (row) =>
          Badge({ label: row.status as string, variant: row.status === "Active" ? "success" : "neutral" }),
      },
    ],
    rows,
    rowKey: (row) => row.id as string,
    sort: state.sort,
    buildSortHref: routes.projectsSort,
    toolbar: Input({
      placeholder: "Search projects...",
      type: "search",
      size: "sm",
      attrs: { "data-table-search": "", "aria-label": "Search projects" },
    }),
    footer: Pagination({ page, totalPages, buildHref: routes.projectsPage, target: "#projects" }),
    attrs: { "data-filter-scope": "" },
  });
}

/* ------------------------------------------------------------- invite */

/** What `/forms/invite` joined from the parts the composite fields posted. */
export type InviteResult = { email: string; phone: string; website: string };

/**
 * The invite form: an email restricted to the company's domains, a phone
 * with a country code, a website with a fixed scheme — each posts two
 * parts the server joins with `emailFrom` / `telFrom` / `urlFrom`. With a
 * `result`, the form re-renders with what the server received.
 */
export function inviteForm(routes: DemoRoutes, result?: InviteResult): Html {
  return Form({
    id: "cat-invite",
    action: routes.invite,
    validate: true,
    guard: true,
    attrs: { "data-action": routes.invite, "data-target": "#cat-invite", "data-swap": "outer" },
    content: html`${
      result
        ? Alert({
          variant: "success",
          title: "Received",
          body: html`<code>${result.email}</code> · <code>${result.phone}</code> · <code>${result.website}</code>`,
          id: "cat-invite-result",
        })
        : ""
    }${
      FormGrid({
        fields: [
          FormField({
            id: "inv-email",
            label: "Work email",
            required: true,
            help: "Only company addresses.",
            control: (a) =>
              Input({
                id: a.id,
                name: "email",
                type: "email",
                required: true,
                domains: ["acme.com", "acme.io", "acme.dev"],
                messages: { required: "Enter the part before the @.", pattern: "Just the part before the @." },
                attrs: { "aria-describedby": a.describedBy },
              }),
          }),
          FormField({
            id: "inv-phone",
            label: "Phone",
            control: (a) =>
              Input({
                id: a.id,
                name: "phone",
                type: "tel",
                countries: [{ code: "+1", label: "US" }, { code: "+44", label: "UK" }, { code: "+91", label: "IN" }, {
                  code: "+49",
                  label: "DE",
                }],
                messages: { pattern: "Digits, spaces and dashes only." },
              }),
          }),
          FormField({
            id: "inv-website",
            label: "Website",
            control: (a) =>
              Input({ id: a.id, name: "website", type: "url", scheme: "https://", placeholder: "acme.com/team" }),
          }),
        ],
      })
    }${FormActions({ content: Button({ label: "Send invite", type: "submit" }) })}`,
  });
}

/* ----------------------------------------------------------- invoices */

export type Invoice = { id: string; client: string; status: string; total: string };
export const invoices: Invoice[] = [
  { id: "INV-2048", client: "Northwind Traders", status: "Paid", total: "$12,400.00" },
  { id: "INV-2047", client: "Contoso Ltd", status: "Open", total: "$3,120.00" },
  { id: "INV-2046", client: "Fabrikam Inc", status: "Overdue", total: "$18,960.00" },
  { id: "INV-2045", client: "Tailspin Toys", status: "Draft", total: "$742.50" },
  { id: "INV-2044", client: "Wide World Imports", status: "Paid", total: "$9,300.00" },
  { id: "INV-2043", client: "Alpine Ski House", status: "Open", total: "$1,050.00" },
  { id: "INV-2042", client: "Adventure Works", status: "Paid", total: "$27,800.00" },
];
const statusVariant = (s: string) =>
  s === "Paid" ? "success" : s === "Open" ? "info" : s === "Overdue" ? "danger" : "neutral";

/** Sort invoices the way the table's sort links ask for. */
export function sortInvoices(sort?: { key: string; dir: Dir }): Invoice[] {
  if (!sort) return invoices;
  const key = sort.key as keyof Invoice;
  const num = (v: string) => Number(v.replace(/[^0-9.]/g, ""));
  return [...invoices].sort((a, b) => {
    const cmp = key === "total"
      ? num(a.total) - num(b.total)
      : String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

/** What the bulk form has done so far — the app keeps one per process, a static page none. */
export type InvoiceEdits = { deleted?: string[]; assigned?: string[] };

/**
 * The invoices table — selectable with a bulk bar whose buttons post the
 * selection (`op=assign|delete`) to `routes.invoiceBulk`; the sort route
 * and the bulk route both re-render it.
 */
export function invoicesTable(
  routes: DemoRoutes,
  sort: { key: string; dir: Dir } = { key: "id", dir: "desc" },
  edits: InvoiceEdits = {},
): Html {
  const deleted = new Set(edits.deleted ?? []);
  const assigned = new Set(edits.assigned ?? []);
  const rows = sortInvoices(sort).filter((row) => !deleted.has(row.id));
  return DataTable<Invoice>({
    id: "invoices",
    title: "Invoices",
    selectable: true,
    maxHeight: "sm",
    sort,
    buildSortHref: routes.invoiceSort,
    bulkAction: routes.invoiceBulk(sort),
    columns: [
      { key: "id", label: "Invoice", pinned: true, mono: true, sortable: true },
      { key: "client", label: "Client", sortable: true },
      {
        key: "status",
        label: "Status",
        render: (row) =>
          html`${Badge({ label: row.status, variant: statusVariant(row.status), dot: row.status !== "Draft" })}${
            assigned.has(row.id)
              ? html`
                ${Badge({ label: "Assigned to you", variant: "accent" })}
              `
              : ""
          }`,
      },
      { key: "total", label: "Total", numeric: true, sortable: true },
    ],
    rows,
    rowKey: (row) => row.id,
    bulkActions: html`${
      Button({ label: "Assign", size: "sm", type: "submit", attrs: { name: "op", value: "assign" } })
    }${
      Button({ label: "Delete", size: "sm", variant: "danger", type: "submit", attrs: { name: "op", value: "delete" } })
    }${Button({ label: "Clear", size: "sm", attrs: { "data-bulk-clear": "" } })}`,
    rowActions: (row) =>
      RowActions({
        id: `inv-row-${row.id}`,
        label: `Actions for ${row.id}`,
        items: [
          { label: "View", href: "#" },
          { label: "Duplicate", href: "#" },
          { label: "Send reminder", href: "#" },
          {
            label: "Delete",
            href: "#",
            danger: true,
          },
        ],
      }),
    emptyMessage: "Every invoice is gone. Reload the app to get them back.",
    footer: html`<span>Showing ${rows.length} of 1,204 · scroll the body, the header stays</span>`,
  });
}

/* ------------------------------------------------ reviewers / commands */

export const reviewerOptions: ComboboxOption[] = [
  { value: "gh", label: "Grace Hopper", group: "Your team" },
  { value: "gb", label: "Graham Bell", group: "Your team" },
  { value: "ag", label: "Ada Grant", group: "Elsewhere", meta: "Contractor" },
  { value: "al", label: "Ada Lovelace", group: "Elsewhere" },
  { value: "kt", label: "Katherine Johnson", group: "Elsewhere", meta: "Advisor" },
];

export const commandItems: CommandItem[] = [
  { label: "New invoice", group: "Actions", icon: "invoice", shortcut: "⌘N" },
  { label: "Export invoices as CSV", group: "Actions", icon: "table" },
  { label: "Invite a teammate", group: "Actions", icon: "users" },
  { label: "INV-2048 · Northwind", group: "Recent", badge: "IN", meta: "$12,400", href: "#invoices" },
  { label: "INV-2046 · Fabrikam", group: "Recent", badge: "IN", meta: "$18,960", href: "#invoices" },
];

/* -------------------------------------------------------------- period */

export type PeriodState = { start?: string; end?: string; year?: number; month?: number };

/** The period picker's props — the catalogue renders it; the month/day routes re-render it. */
export function periodPicker(routes: DemoRoutes, state: PeriodState = {}): DatePickerProps {
  return {
    id: "period",
    name: "period",
    range: true,
    start: state.start ?? "2026-09-14",
    end: state.end ?? "2026-09-22",
    year: state.year,
    month: state.month,
    today: "2026-09-14",
    open: true,
    inline: true,
    buildMonthHref: routes.month,
    buildDayHref: routes.day,
    presets: [
      { label: "Last 7d", href: routes.preset("7d") },
      { label: "Last 30d", href: routes.preset("30d") },
      { label: "This quarter", href: routes.preset("q") },
    ],
  };
}
