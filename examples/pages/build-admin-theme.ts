/**
 * Admin SaaS sample theme — a full application built from the base
 * partials (v1 + v2), proving the base/theme split end to end. Every
 * page here is a realistic composition, not a component showcase; the
 * catalogue pages exist for that. Built on layouts/sidebar; no inline
 * styles or scripts (CLAUDE.md §9) — the theme's own partial CSS lives in
 * examples/themes/admin.css, and all behavior comes from dist/ui.js.
 */
import { type Html, html, render } from "@tundralibs/rapid/ui";
import { ensureDir, writeTextFile } from "@tundralibs/compat/file";
import { Card } from "../../components/card/card.ts";
import { Button, ButtonGroup } from "../../components/button/button.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { Sidebar } from "../../components/sidebar/sidebar.ts";
import { SidebarLayout } from "../../layouts/sidebar/sidebar.ts";
import { AuthLayout } from "../../layouts/auth/auth.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Breadcrumb } from "../../components/breadcrumb/breadcrumb.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { Badge } from "../../components/badge/badge.ts";
import { Avatar, AvatarGroup } from "../../components/avatar/avatar.ts";
import { Chart, ChartScript } from "../../components/chart/chart.ts";
import { DataTable } from "../../components/data-table/data-table.ts";
import { Pagination } from "../../components/pagination/pagination.ts";
import { Input, InputGroup, InputIcon } from "../../components/input/input.ts";
import { Select } from "../../components/select/select.ts";
import { Modal } from "../../components/modal/modal.ts";
import { FormActions, FormField, FormGrid } from "../../components/form-field/form-field.ts";
import { Form } from "../../components/form/form.ts";
import { Textarea } from "../../components/textarea/textarea.ts";
import { Toast, ToastRegion } from "../../components/toast/toast.ts";
import { Dropdown } from "../../components/dropdown/dropdown.ts";
import { Menu, type MenuItem } from "../../components/menu/menu.ts";
import { Tabs } from "../../components/tabs/tabs.ts";
import { Wizard } from "../../components/wizard/wizard.ts";
import { Switch } from "../../components/switch/switch.ts";
import { Checkbox, ChoiceGroup, Radio } from "../../components/choice/choice.ts";
import { Progress } from "../../components/progress/progress.ts";
import { FormErrorAlert } from "../../components/alert/alert.ts";
import { Combobox } from "../../components/combobox/combobox.ts";
import { DatePicker } from "../../components/datepicker/datepicker.ts";
import { Command } from "../../components/command/command.ts";
import { Dropzone } from "../../components/dropzone/dropzone.ts";
import { Slider } from "../../components/slider/slider.ts";
import { Otp } from "../../components/otp/otp.ts";
import { Segmented } from "../../components/segmented/segmented.ts";
import { Popover, PopoverTrigger } from "../../components/popover/popover.ts";
import { Timeline } from "../../components/timeline/timeline.ts";
import { Empty } from "../../components/empty/empty.ts";
import { SkeletonTable } from "../../components/skeleton/skeleton.ts";
import { ErrorTemplate } from "../../templates/errors.ts";
import { Icon } from "../../shared/icons.ts";

/* ------------------------------------------------------------ helpers */

const searchInput = (placeholder: string, extra: Record<string, string> = {}) =>
  InputIcon({
    icon: Icon("search", { size: 16 }),
    control: Input({ type: "search", placeholder, attrs: { "data-table-search": "", ...extra } }),
  });

/** Inline empty state that filter.js reveals when a search matches nothing. */
const filterEmpty = (what: string) =>
  html`<div data-filter-empty hidden>${
    Empty({
      variant: "inline",
      icon: "search",
      title: `No ${what} match`,
      text: "Try a different search or clear the filter.",
    })
  }</div>`;

function statusBadge(status: string): Html {
  const variant = status === "Paid" || status === "Active" || status === "Done"
    ? "success"
    : status === "Pending" || status === "Away"
    ? "warning"
    : status === "Overdue" || status === "Failed"
    ? "danger"
    : status === "In progress"
    ? "info"
    : "neutral";
  return Badge({ label: status, variant, dot: variant !== "neutral" });
}

/** Ids derive from the row key — a counter would drift across renders (§4). */
function rowKebab(key: string): Html {
  return Dropdown({
    id: `row-${key}`,
    align: "end",
    trigger: html`${Icon("kebab", { size: 16 })}<span class="sr-only">Row actions</span>`,
    content: Menu({
      items: [{ label: "Edit", href: "#" }, { label: "Duplicate", href: "#" }, { label: "Remove", href: "#" }],
    }),
  });
}

const initials = (name: string) => name.split(" ").map((w) => w[0]).join("");

/* ----------------------------------------------------------- app frame */

const NAV_ITEMS: MenuItem[] = [
  { label: "Dashboard", href: "dashboard.html", icon: Icon("dashboard", { size: 18 }) },
  { label: "Projects", href: "projects.html", icon: Icon("folder", { size: 18 }) },
  { label: "Team", href: "team.html", icon: Icon("users", { size: 18 }) },
  { label: "Invoice", href: "invoice.html", icon: Icon("invoice", { size: 18 }) },
  { label: "Tables", href: "tables.html", icon: Icon("table", { size: 18 }) },
  { label: "Forms", href: "forms.html", icon: Icon("edit", { size: 18 }) },
  {
    label: "Settings",
    icon: Icon("settings", { size: 18 }),
    children: [
      { label: "General", href: "settings.html#tab-general" },
      { label: "Billing", href: "settings.html#tab-billing" },
      { label: "Integrations", href: "settings.html#tab-integrations" },
    ],
  },
];

/** Exact href → active; a parent whose children live on the current page
 *  (same file, any hash) renders expanded — menu.js then highlights the
 *  child whose hash matches, since only the browser knows that. */
function withActive(items: MenuItem[], activeHref: string): MenuItem[] {
  const file = (href?: string) => href?.split("#")[0];
  return items.map((item) => ({
    ...item,
    active: item.href === activeHref,
    expanded: item.children?.some((c) => file(c.href) === file(activeHref)) || undefined,
    children: item.children ? withActive(item.children, activeHref) : undefined,
  }));
}

const sidebarId = "admin-sidebar";

/** ⌘K palette: pages + actions + a recent record. No `action` here, so
 *  command.js filters the rendered list client-side; a rAPId app would set
 *  `action` and let the server return matches per keystroke. */
const globalCommand = Command({
  id: "global-command",
  placeholder: "Jump to a page or run an action…",
  items: [
    { label: "Dashboard", group: "Pages", icon: "dashboard", href: "dashboard.html" },
    { label: "Projects", group: "Pages", icon: "folder", href: "projects.html" },
    { label: "Team", group: "Pages", icon: "users", href: "team.html" },
    { label: "Tables", group: "Pages", icon: "table", href: "tables.html" },
    { label: "Settings", group: "Pages", icon: "settings", href: "settings.html" },
    { label: "New project", group: "Actions", icon: "plus", shortcut: "⌘N" },
    { label: "Invite teammate", group: "Actions", icon: "mail", shortcut: "⌘I" },
    { label: "Toggle dark mode", group: "Actions", icon: "moon", shortcut: "⌘D" },
    { label: "INV-1042 · Blue Bottle Co.", group: "Recent", badge: "IN", meta: "$2,106", href: "invoice.html" },
  ],
});

const notifications = [
  { title: "Marcus commented on Invoice #1042", meta: "12 min ago", status: "current" as const },
  { title: "Northwind Traders signed up", meta: "1 hr ago", status: "done" as const },
  { title: "Deploy to production succeeded", meta: "3 hr ago", status: "done" as const },
];

function adminNavbar() {
  return Navbar({
    id: "admin-navbar",
    brand: html`<span class="sidebar__brand-mark">A</span> Acme Admin`,
    actions: html`${
      Button({
        variant: "outline",
        size: "sm",
        iconStart: Icon("search", { size: 15 }),
        // Icon-only below sm: the label and shortcut hint hide, the
        // aria-label keeps the accessible name.
        label: html`<span class="hide-sm">Search…</span><span class="command__kbd hide-sm">⌘K</span>`,
        attrs: { "data-command-open": "#global-command", "aria-label": "Search (⌘K)", class: "command__trigger" },
      })
    }${
      Dropdown({
        id: "admin-notifications",
        align: "end",
        trigger: Icon("bell", { size: 18 }),
        content: html`<div class="notif-list"><p class="text-sm text-semibold">Notifications</p>${
          Timeline({ items: notifications })
        }${Button({ label: "View all", variant: "subtle", size: "sm", block: true })}</div>`,
      })
    }${
      Button({
        iconOnly: true,
        variant: "ghost",
        label: Icon("moon", { size: 18 }),
        attrs: { "data-theme-toggle": "", "aria-label": "Toggle dark mode" },
      })
    }${
      Dropdown({
        id: "admin-user-menu",
        align: "end",
        trigger: html`${
          Avatar({ initials: "JS", size: "sm" })
        }<span class="hide-sm">Jamie Sun</span><span class="sr-only">Account menu</span>`,
        content: Menu({
          items: [
            { label: "Profile", href: "profile.html" },
            { label: "Billing", href: "settings.html#tab-billing" },
            { label: "Sign out", href: "lock-screen.html" },
          ],
        }),
      })
    }`,
  });
}

function adminSidebar(activeHref: string) {
  // No brand here: the navbar already carries it, and two "Acme"s stacked
  // in the corner read as a mistake.
  return Sidebar({
    id: sidebarId,
    collapsible: true,
    items: withActive(NAV_ITEMS, activeHref),
  });
}

type PageOpts = {
  title: string;
  activeHref: string;
  breadcrumb: string;
  content: unknown;
  /** Page-level actions rendered top-right of the header. */
  actions?: Html;
  /** Toasts pre-rendered into the region (default: one success toast). */
  toasts?: Html[];
  /** Extra `defer`red scripts — only the pages that need a library load it. */
  scripts?: Html[];
};

function adminPage(opts: PageOpts) {
  const toasts = opts.toasts ?? [Toast({ variant: "success", body: "Saved successfully!", autoDismissMs: 4000 })];
  return html`
    <!doctype html>
    <html lang="en">
      <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acme Admin — ${opts.title}</title>
    <link rel="stylesheet" href="../../dist/ui.css">
    <link rel="stylesheet" href="../../examples/themes/admin.css">
    ${opts.scripts ?? []}
      </head>
      <body>
    ${SidebarLayout({
      header: adminNavbar(),
      sidebar: adminSidebar(opts.activeHref),
      sidebarId,
      width: "boxed",
      content: html`${
        PageHeader({
          breadcrumb: Breadcrumb({ items: [{ label: "Home", href: "dashboard.html" }, { label: opts.breadcrumb }] }),
          title: opts.title,
          actions: html`${opts.actions ?? ""}${
            Button({
              label: "Show toast",
              variant: "outline",
              size: "sm",
              attrs: { "data-toast-open": "#page-toasts" },
            })
          }`,
        })
      }${opts.content}`,
      contentId: "main-content",
    })}
    ${globalCommand}
    ${ToastRegion()}
    <template id="page-toasts">${toasts}</template>
    <script src="../../dist/ui.js"></script>
      </body>
    </html>
  `;
}

/* ------------------------------------------------------------ Dashboard */

const statCards = Grid({
  items: [
    {
      label: "Monthly revenue",
      value: "$48,290",
      trend: "+12.4%",
      up: true,
      icon: "coin" as const,
      tone: "primary" as const,
    },
    {
      label: "Active users",
      value: "8,412",
      trend: "+3.1%",
      up: true,
      icon: "users" as const,
      tone: "success" as const,
    },
    {
      label: "Conversion rate",
      value: "4.6%",
      trend: "-0.4%",
      up: false,
      icon: "trendUp" as const,
      tone: "warning" as const,
    },
    { label: "Churn", value: "1.2%", trend: "+0.2%", up: false, icon: "trendDown" as const, tone: "danger" as const },
  ].map((stat) =>
    GridCol({
      span: 3,
      content: Card({
        variant: "elevated",
        body: Stat({
          label: stat.label,
          value: stat.value,
          icon: Icon(stat.icon, { size: 20 }),
          tone: stat.tone,
          trend: { label: stat.trend, up: stat.up },
        }),
      }),
    })
  ),
});

const revenueChart = Card({
  title: "Revenue",
  subtitle: "Booked, USD",
  actions: Segmented({
    id: "revenue-range",
    name: "range",
    size: "sm",
    legend: "Range",
    value: "6m",
    options: [{ value: "30d", label: "30d" }, { value: "6m", label: "6m" }, { value: "1y", label: "1y" }],
  }),
  body: Chart({
    type: "area",
    height: 240,
    series: [{ name: "Revenue", data: [32, 38, 35, 41, 44, 48] }],
    categories: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    options: { dataLabels: { enabled: false }, stroke: { curve: "smooth", width: 2 } },
  }),
});

const quickActions = Card({
  title: "Quick actions",
  body: html`<div class="stack stack--sm">${
    Button({
      label: "New project",
      block: true,
      iconStart: Icon("plus", { size: 15 }),
      attrs: { "data-modal-open": "#create-project-modal" },
    })
  }${
    Button({ label: "Invite teammate", variant: "outline", block: true, attrs: { "data-modal-open": "#invite-modal" } })
  }${
    Button({
      label: "Open command palette",
      variant: "subtle",
      block: true,
      attrs: { "data-command-open": "#global-command" },
    })
  }</div>`,
});

const activity = Card({
  title: "Recent activity",
  body: Timeline({
    id: "dashboard-activity",
    items: [
      { title: "Priya merged “fix: sidebar collapse state”", meta: "10 min ago", status: "done" },
      { title: "New signup: Northwind Traders", meta: "42 min ago", status: "done" },
      { title: "Marcus commented on Invoice #1042", meta: "1 hr ago", status: "current" },
      { title: "Nightly billing run", meta: "Scheduled 02:00 UTC", status: "pending" },
    ],
  }),
});

const tasks = Card({
  title: "Tasks",
  body: [
    { label: "Migrate billing to Stripe", value: 80 },
    { label: "Q3 onboarding revamp", value: 45 },
    { label: "Design system audit", value: 20 },
  ].map((task) =>
    html`
      <div
        class="task-item"><div class="task-item__row"><span>${task
          .label}</span><span class="text-muted text-sm text-nums">${task.value}%</span></div>${Progress({
            value: task.value,
          })}</div>
    `
  ).reduce((a, b) => html`${a}${b}`, html``),
});

/** Lazy region: rAPId's `data-load` swaps the real rows in on mount; the
 *  skeleton is what the server renders in the meantime. */
const deployQueue = Card({
  title: "Deploy queue",
  subtitle: "Lazy region — data-load swaps the real rows in",
  body: html`<div id="deploy-queue" data-action="/deploys" data-load>${SkeletonTable({ rows: 3 })}</div>`,
});

type Order = { id: string; customer: string; amount: string; status: string; date: string };
const orderRows: Order[] = [
  { id: "ORD-1093", customer: "Blue Bottle Co.", amount: "$1,240.00", status: "Paid", date: "2026-09-12" },
  { id: "ORD-1092", customer: "Northwind Traders", amount: "$860.00", status: "Pending", date: "2026-09-11" },
  { id: "ORD-1091", customer: "Initech", amount: "$2,410.00", status: "Paid", date: "2026-09-10" },
  { id: "ORD-1090", customer: "Globex", amount: "$430.00", status: "Refunded", date: "2026-09-09" },
  { id: "ORD-1089", customer: "Umbrella Corp", amount: "$1,980.00", status: "Paid", date: "2026-09-08" },
  { id: "ORD-1088", customer: "Stark Industries", amount: "$5,120.00", status: "Overdue", date: "2026-09-02" },
  { id: "ORD-1087", customer: "Wayne Enterprises", amount: "$3,300.00", status: "Paid", date: "2026-08-30" },
];

function ordersTable(opts: { id: string; filterable: boolean; selectable: boolean }) {
  return DataTable<Order>({
    id: opts.id,
    title: opts.filterable ? undefined : "Recent orders",
    selectable: opts.selectable,
    sort: { key: "date", dir: "desc" },
    buildSortHref: (key, dir) => `?sort=${key}&dir=${dir}`,
    maxHeight: opts.filterable ? "md" : undefined,
    columns: [
      { key: "id", label: "Order", pinned: true, mono: true, sortable: true },
      { key: "customer", label: "Customer", sortable: true },
      { key: "date", label: "Date", sortable: true },
      { key: "status", label: "Status", render: (row) => statusBadge(row.status) },
      { key: "amount", label: "Amount", numeric: true, sortable: true },
    ],
    rows: orderRows,
    rowKey: (row) => row.id,
    rowActions: (row) => rowKebab(`${opts.id}-${row.id}`),
    toolbar: opts.filterable
      ? html`${searchInput("Search orders…")}<div class="toolbar__end">${
        Select({
          placeholder: "All statuses",
          attrs: { "data-table-filter": "", "aria-label": "Filter by status" },
          options: [{ value: "paid", label: "Paid" }, { value: "pending", label: "Pending" }, {
            value: "refunded",
            label: "Refunded",
          }, { value: "overdue", label: "Overdue" }],
        })
      }${
        DatePicker({
          id: `${opts.id}-period`,
          name: "period",
          align: "end",
          range: true,
          start: "2026-08-30",
          end: "2026-09-12",
          today: "2026-09-14",
          buildMonthHref: (y, m) => `?month=${y}-${String(m + 1).padStart(2, "0")}`,
          buildDayHref: (iso) => `?day=${iso}`,
          presets: [{ label: "Last 7d", href: "?preset=7d" }, { label: "Last 30d", href: "?preset=30d" }, {
            label: "This quarter",
            href: "?preset=q",
          }],
        })
      }</div>`
      : undefined,
    bulkActions: opts.selectable
      ? html`${Button({ label: "Mark paid", size: "sm" })}${Button({ label: "Export", size: "sm" })}${
        Button({ label: "Refund", size: "sm", variant: "danger" })
      }${Button({ label: "Clear", size: "sm", attrs: { "data-bulk-clear": "" } })}`
      : undefined,
    footer: html`${opts.filterable ? filterEmpty("orders") : ""}<span>Showing ${orderRows.length} of 1,093</span>${
      Pagination({ page: 1, totalPages: 4, buildHref: (p) => `?page=${p}` })
    }`,
    attrs: opts.filterable ? { "data-filter-scope": "" } : undefined,
  });
}

const createProjectModal = Modal({
  id: "create-project-modal",
  title: "Create project",
  body: Form({
    content: FormGrid({
      fields: [
        FormField({
          id: "project-name",
          label: "Project name",
          span: 12,
          control: Input({ id: "project-name", placeholder: "Website relaunch" }),
        }),
        FormField({
          id: "project-lead",
          label: "Lead",
          span: 12,
          control: Combobox({
            id: "project-lead",
            name: "lead",
            placeholder: "Search people…",
            options: [
              { value: "pn", label: "Priya N.", group: "Engineering", meta: "Frontend" },
              { value: "mt", label: "Marcus T.", group: "Engineering", meta: "Backend" },
              { value: "js", label: "Jamie Sun", group: "Design" },
            ],
          }),
        }),
        FormField({
          id: "project-desc",
          label: "Description",
          span: 12,
          control: Textarea({ id: "project-desc" }),
        }),
      ],
    }),
  }),
  footer: html`${Button({ label: "Cancel", variant: "ghost", attrs: { "data-modal-close": "" } })}${
    Button({ label: "Create project" })
  }`,
});

const inviteModal = Modal({
  id: "invite-modal",
  title: "Invite teammate",
  body: Form({
    content: html`${
      FormField({
        id: "invite-email",
        label: "Email address",
        control: InputIcon({
          icon: Icon("mail", { size: 16 }),
          control: Input({ id: "invite-email", type: "email", placeholder: "teammate@company.com" }),
        }),
      })
    }<br>${
      FormField({
        id: "invite-role",
        label: "Role",
        control: Segmented({
          id: "invite-role",
          name: "role",
          value: "member",
          block: true,
          options: [{ value: "admin", label: "Admin" }, { value: "member", label: "Member" }, {
            value: "viewer",
            label: "Viewer",
          }],
        }),
      })
    }`,
  }),
  footer: html`${Button({ label: "Cancel", variant: "ghost", attrs: { "data-modal-close": "" } })}${
    Button({ label: "Send invite" })
  }`,
});

const dashboardContent = html`${statCards}<br>${
  Grid({ items: [GridCol({ span: 8, content: revenueChart }), GridCol({ span: 4, content: quickActions })] })
}<br>${
  Grid({
    items: [
      GridCol({ span: 4, content: activity }),
      GridCol({ span: 4, content: tasks }),
      GridCol({ span: 4, content: deployQueue }),
    ],
  })
}<br>${ordersTable({ id: "recent-orders", filterable: false, selectable: false })}${createProjectModal}${inviteModal}`;

/* -------------------------------------------------------------- Profile */

const profileHeader = html`
  <div
    class="profile-header">${Avatar({
      initials: "JS",
      size: "lg",
    })}<div><h2>Jamie Sun</h2><p class="text-muted">Product Designer &middot; Acme Inc.</p></div></div>
`;

type Session = { id: string; device: string; location: string; lastActive: string; current: boolean };
const sessions: Session[] = [
  { id: "s1", device: "MacBook Pro · Chrome", location: "San Francisco, US", lastActive: "Now", current: true },
  { id: "s2", device: "iPhone 16 · Safari", location: "San Francisco, US", lastActive: "2 hr ago", current: false },
  { id: "s3", device: "Windows · Edge", location: "Berlin, DE", lastActive: "6 days ago", current: false },
];

const profileContent = Card({
  body: html`${profileHeader}${
    Tabs({
      id: "profile-tabs",
      items: [
        {
          id: "overview",
          label: "Overview",
          content:
            html`<p>Jamie has been with Acme since 2022, leading design for the billing and onboarding surfaces.</p><br>${
              Badge({ label: "Design", variant: "primary" })
            } ${Badge({ label: "Figma" })} ${Badge({ label: "Design systems" })} ${
              Badge({ label: "v2.1 maintainer", variant: "code" })
            }<br><br>${
              Timeline({
                items: [
                  { title: "Joined Acme", meta: "Mar 2022", status: "done" },
                  { title: "Promoted to Senior Designer", meta: "Jan 2024", status: "done" },
                  { title: "Leading billing redesign", meta: "Since Jun 2026", status: "current" },
                ],
              })
            }`,
        },
        {
          id: "edit",
          label: "Edit profile",
          content: Form({
            content: html`${
              FormGrid({
                fields: [
                  FormField({
                    id: "profile-name",
                    label: "Full name",
                    span: 6,
                    control: Input({ id: "profile-name", value: "Jamie Sun" }),
                  }),
                  FormField({
                    id: "profile-email",
                    label: "Email",
                    span: 6,
                    control: InputIcon({
                      icon: Icon("mail", { size: 16 }),
                      control: Input({ id: "profile-email", type: "email", value: "jamie@acme.com" }),
                    }),
                  }),
                  FormField({
                    id: "profile-team",
                    label: "Team",
                    span: 6,
                    control: Combobox({
                      id: "profile-team",
                      name: "team",
                      query: "Design",
                      selected: "design",
                      options: [
                        { value: "design", label: "Design", group: "Product" },
                        { value: "research", label: "Research", group: "Product" },
                        { value: "frontend", label: "Frontend", group: "Engineering" },
                        { value: "backend", label: "Backend", group: "Engineering" },
                      ],
                    }),
                  }),
                  FormField({
                    id: "profile-start",
                    label: "Start date",
                    span: 6,
                    control: DatePicker({
                      id: "profile-start",
                      name: "start",
                      start: "2022-03-14",
                      today: "2026-09-14",
                      buildMonthHref: (y, m) => `?month=${y}-${String(m + 1).padStart(2, "0")}`,
                      buildDayHref: (iso) => `?day=${iso}`,
                    }),
                  }),
                  FormField({
                    id: "profile-bio",
                    label: "Bio",
                    span: 12,
                    control: Textarea({ id: "profile-bio", value: "Product designer at Acme Inc." }),
                  }),
                  FormField({
                    id: "profile-avatar",
                    label: "Avatar",
                    span: 12,
                    control: Dropzone({
                      id: "profile-avatar",
                      name: "avatar",
                      accept: "image/png,image/jpeg",
                      hint: "PNG or JPG · square · up to 2 MB",
                      files: [{ name: "jamie-2026.png", size: "212 KB" }],
                    }),
                  }),
                ],
              })
            }<br>${
              FormActions({
                content: html`${Button({ label: "Cancel", variant: "ghost" })}${
                  Button({ label: "Save changes", type: "submit" })
                }`,
              })
            }`,
          }),
        },
        {
          id: "security",
          label: "Security",
          content: html`${
            FormField({
              id: "current-password",
              label: "Current password",
              span: 6,
              control: Input({ id: "current-password", type: "password" }),
            })
          }<br>${
            Switch({ label: "Two-factor authentication", hint: "Required for admins from Oct 1.", checked: true })
          }<br><br>${
            DataTable<Session>({
              id: "sessions",
              title: "Active sessions",
              selectable: true,
              columns: [
                {
                  key: "device",
                  label: "Device",
                  pinned: true,
                  render: (r) =>
                    html`${r.device}${
                      r.current
                        ? html`
                          ${Badge({ label: "This device", variant: "accent" })}
                        `
                        : ""
                    }`,
                },
                { key: "location", label: "Location" },
                { key: "lastActive", label: "Last active" },
              ],
              rows: sessions,
              rowKey: (r) => r.id,
              bulkActions: html`${Button({ label: "Sign out", size: "sm", variant: "danger" })}${
                Button({ label: "Clear", size: "sm", attrs: { "data-bulk-clear": "" } })
              }`,
              footer: html`<span>Sign out of everything else from here.</span>`,
            })
          }<br>${FormActions({ content: Button({ label: "Save changes" }) })}`,
        },
      ],
    })
  }`,
});

/* -------------------------------------------------------------- Invoice */

type InvoiceItem = { desc: string; qty: number; price: number };
const invoiceItems: InvoiceItem[] = [
  { desc: "UI component library license", qty: 1, price: 1200 },
  { desc: "Priority support (3 months)", qty: 1, price: 450 },
  { desc: "Onboarding workshop", qty: 2, price: 300 },
];
const invoiceSubtotal = invoiceItems.reduce((sum, i) => sum + i.qty * i.price, 0);
const invoiceTax = Math.round(invoiceSubtotal * 0.08);
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const invoiceContent = Grid({
  items: [
    GridCol({
      span: 8,
      content: Card({
        body: html`
          <div
            class="invoice-header"><div><h2>Invoice #1042</h2><p class="text-muted">Issued Sep 1, 2026 &middot; Due Sep 15, 2026</p></div>${statusBadge(
              "Paid",
            )}</div><br>${Grid({
              items: [
                GridCol({
                  span: 6,
                  content: html`
                    <p class="text-caps">Billed from</p>
                    <p>Acme Inc.<br>500 Market St<br>San Francisco, CA</p>
                  `,
                }),
                GridCol({
                  span: 6,
                  content: html`
                    <p class="text-caps">Billed to</p>
                    <p>${Popover({
                      id: "client-card",
                      align: "start",
                      trigger: PopoverTrigger({
                        controls: "client-card",
                        label: "Blue Bottle Co.",
                        className: "btn btn--subtle btn--sm",
                      }),
                      content: html`
                        <div
                          class="popover__header"><span><span class="popover__title">Blue Bottle Co.</span><br><span class="popover__subtitle">billing@bluebottle.example</span></span></div>
                        <div
                          class="popover__stats"><span class="popover__stat"><span class="popover__stat-value">14</span><span class="popover__stat-label">Invoices</span></span><span class="popover__stat"><span class="popover__stat-value">$21k</span><span class="popover__stat-label">Lifetime</span></span></div>
                        <div class="popover__footer">${Button({ label: "Open account", size: "sm" })}</div>
                      `,
                    })}<br>12 Ferry Building<br>San Francisco, CA</p>
                  `,
                }),
              ],
            })}<br>${DataTable<InvoiceItem>({
              id: "invoice-items",
              columns: [
                { key: "desc", label: "Description" },
                { key: "qty", label: "Qty", numeric: true },
                { key: "price", label: "Unit price", numeric: true, render: (r) => money(r.price) },
                { key: "total", label: "Total", numeric: true, render: (r) => money(r.qty * r.price) },
              ],
              rows: invoiceItems,
              rowKey: (r) => r.desc,
            })}<br><div
            class="invoice-totals">
            <div class="invoice-totals__row"><span>Subtotal</span><span>${money(invoiceSubtotal)}</span></div>
            <div class="invoice-totals__row"><span>Tax (8%)</span><span>${money(invoiceTax)}</span></div>
            <div class="invoice-totals__row invoice-totals__row--grand"><span>Total</span><span>${money(
              invoiceSubtotal + invoiceTax,
            )}</span></div>
          </div><br>${FormActions({
            content: html`${
              ButtonGroup({
                buttons: [
                  Button({ label: "Download PDF", variant: "outline" }),
                  Dropdown({
                    id: "download-options",
                    align: "end",
                    triggerClass: "btn btn--outline btn--icon",
                    trigger: html`${
                      Icon("chevronDown", { size: 15 })
                    }<span class="sr-only">More download options</span>`,
                    content: Menu({
                      items: [
                        { label: "Download PDF", href: "#" },
                        { label: "Download CSV", href: "#" },
                        { label: "Email a copy", href: "#" },
                      ],
                    }),
                  }),
                ],
              })
            }${Button({ label: "Send reminder", variant: "accent" })}`,
          })}
        `,
      }),
    }),
    GridCol({
      span: 4,
      content: Card({
        title: "History",
        body: Timeline({
          items: [
            { title: "Created", meta: "Sep 1 · Jamie Sun", status: "done" },
            { title: "Sent to client", meta: "Sep 1 · billing@bluebottle.example", status: "done" },
            { title: "Viewed by client", meta: "Sep 3", status: "done" },
            { title: "Paid", meta: "Sep 9 · card ending 4242", status: "current" },
            { title: "Reconciled", status: "pending" },
          ],
        }),
      }),
    }),
  ],
});

/* --------------------------------------------------------------- Tables */

type Member = { id: string; name: string; role: string; email: string; status: string; joined: string };
const teamMembers: Member[] = [
  {
    id: "1",
    name: "Priya N.",
    role: "Frontend Engineer",
    email: "priya@acme.com",
    status: "Active",
    joined: "2023-02-01",
  },
  {
    id: "2",
    name: "Marcus T.",
    role: "Backend Engineer",
    email: "marcus@acme.com",
    status: "Active",
    joined: "2022-11-14",
  },
  {
    id: "3",
    name: "Jamie Sun",
    role: "Product Designer",
    email: "jamie@acme.com",
    status: "Away",
    joined: "2022-03-14",
  },
  { id: "4", name: "Sam K.", role: "QA Engineer", email: "sam@acme.com", status: "Active", joined: "2024-06-03" },
  {
    id: "5",
    name: "Alex R.",
    role: "Engineering Manager",
    email: "alex@acme.com",
    status: "Active",
    joined: "2021-09-20",
  },
  {
    id: "6",
    name: "Robin D.",
    role: "Customer Success",
    email: "robin@acme.com",
    status: "Inactive",
    joined: "2023-08-08",
  },
];

const teamTable = DataTable<Member>({
  id: "team-table",
  title: "Team members",
  selectable: true,
  maxHeight: "md",
  sort: { key: "name", dir: "asc" },
  buildSortHref: (key, dir) => `?sort=${key}&dir=${dir}`,
  columns: [
    {
      key: "name",
      label: "Name",
      pinned: true,
      sortable: true,
      render: (r) => html`${Avatar({ initials: initials(r.name), size: "sm" })} ${r.name}`,
    },
    { key: "role", label: "Role", sortable: true },
    { key: "email", label: "Email", mono: true },
    { key: "joined", label: "Joined", sortable: true },
    { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
  ],
  rows: teamMembers,
  rowKey: (r) => r.id,
  rowActions: (r) => rowKebab(`team-${r.id}`),
  toolbar: html`${searchInput("Search team…")}<div class="toolbar__end">${
    Segmented({
      id: "team-status",
      name: "status",
      size: "sm",
      legend: "Status",
      value: "",
      inputAttrs: { "data-table-filter": "" },
      options: [{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "away", label: "Away" }, {
        value: "inactive",
        label: "Inactive",
      }],
    })
  }${Button({ label: "Add member", size: "sm", iconStart: Icon("plus", { size: 14 }) })}</div>`,
  bulkActions: html`${Button({ label: "Change role", size: "sm" })}${Button({ label: "Export CSV", size: "sm" })}${
    Button({ label: "Deactivate", size: "sm", variant: "danger" })
  }${Button({ label: "Clear", size: "sm", attrs: { "data-bulk-clear": "" } })}`,
  footer: html`${filterEmpty("team members")}<span>${teamMembers.length} members</span>${
    Pagination({ page: 1, totalPages: 1, buildHref: (p) => `?page=${p}` })
  }`,
  attrs: { "data-filter-scope": "" },
});

const importsEmpty = Card({
  title: "Imports",
  body: Empty({
    icon: "upload",
    title: "No imports yet",
    text: "Bring in customers from a CSV or connect your CRM — rows land here for review before they go live.",
    actions: html`${Button({ label: "Import CSV", size: "sm" })}${
      Button({ label: "Connect CRM", size: "sm", variant: "outline" })
    }`,
  }),
});

const auditLog = Card({
  title: "Audit log",
  subtitle: "Lazy region — data-load",
  body: html`<div id="audit-log" data-action="/audit" data-load>${SkeletonTable({ rows: 4 })}</div>`,
});

const tablesContent = html`${teamTable}<br>${
  ordersTable({ id: "orders-table", filterable: true, selectable: true })
}<br>${Grid({ items: [GridCol({ span: 6, content: importsEmpty }), GridCol({ span: 6, content: auditLog })] })}`;

/* ---------------------------------------------------------------- Forms */

/** What a failed submit looks like straight from rAPId's `formState()` (§6). */
const mockFormError = {
  state: "error" as const,
  message: "Couldn't save the member",
  fields: { email: "A member with this email already exists", seats: "Must be at least 1" },
  values: {},
};

const memberForm = Card({
  title: "New member",
  subtitle: "Every field type, including a server-side validation failure",
  body: Form({
    content: html`${FormErrorAlert(mockFormError)}<br>${
      FormGrid({
        fields: [
          FormField({ id: "f-first", label: "First name", span: 6, control: Input({ id: "f-first", value: "Ada" }) }),
          FormField({ id: "f-last", label: "Last name", span: 6, control: Input({ id: "f-last", value: "Lovelace" }) }),
          FormField({
            id: "f-email",
            label: "Work email",
            span: 6,
            error: mockFormError.fields.email,
            // Function form: the field hands the control its error id so
            // screen readers announce the message with the input (§6).
            control: (a11y) =>
              InputIcon({
                icon: Icon("mail", { size: 16 }),
                control: Input({
                  id: a11y.id,
                  type: "email",
                  value: "ada@acme.com",
                  invalid: a11y.invalid,
                  attrs: { "aria-describedby": a11y.describedBy },
                }),
              }),
          }),
          FormField({
            id: "f-handle",
            label: "Handle",
            span: 6,
            control: InputGroup({
              start: "acme.dev/",
              control: Input({ id: "f-handle", value: "ada", extraClass: "input-group__control" }),
            }),
          }),
          FormField({
            id: "f-manager",
            label: "Reports to",
            span: 6,
            help: "Type to filter — with `action` set, a rAPId app would fetch matches instead.",
            control: Combobox({
              id: "f-manager",
              name: "manager",
              placeholder: "Search people…",
              options: [
                {
                  value: "ar",
                  label: "Alex R.",
                  group: "Engineering",
                  meta: "Manager",
                  lead: Avatar({ initials: "AR", size: "sm" }),
                },
                { value: "mt", label: "Marcus T.", group: "Engineering", lead: Avatar({ initials: "MT", size: "sm" }) },
                { value: "js", label: "Jamie Sun", group: "Design", lead: Avatar({ initials: "JS", size: "sm" }) },
              ],
            }),
          }),
          FormField({
            id: "f-start",
            label: "Start date",
            span: 6,
            control: DatePicker({
              id: "f-start",
              name: "start",
              start: "2026-09-21",
              today: "2026-09-14",
              min: "2026-09-14",
              buildMonthHref: (y, m) => `?month=${y}-${String(m + 1).padStart(2, "0")}`,
              buildDayHref: (iso) => `?day=${iso}`,
            }),
          }),
          FormField({
            id: "f-role",
            label: "Role",
            span: 6,
            control: Segmented({
              id: "f-role",
              name: "role",
              value: "member",
              block: true,
              options: [{ value: "admin", label: "Admin" }, { value: "member", label: "Member" }, {
                value: "viewer",
                label: "Viewer",
              }],
            }),
          }),
          FormField({
            id: "f-team",
            label: "Teams",
            span: 6,
            control: Combobox({
              id: "f-team",
              name: "teams",
              multi: true,
              placeholder: "Add a team…",
              selected: ["design", "frontend"],
              options: [
                { value: "design", label: "Design" },
                { value: "frontend", label: "Frontend" },
                { value: "backend", label: "Backend" },
                { value: "qa", label: "QA" },
              ],
            }),
          }),
          FormField({
            id: "f-seats",
            span: 6,
            error: mockFormError.fields.seats,
            control: Slider({
              id: "f-seats",
              name: "seats",
              label: "Seat allocation",
              min: 0,
              max: 20,
              value: 0,
              unit: "seats",
              unitOne: "seat",
            }),
          }),
          FormField({
            id: "f-tier",
            span: 6,
            control: Slider({
              id: "f-tier",
              name: "tier",
              label: "Support tier",
              min: 0,
              max: 3,
              value: 1,
              scale: ["Basic", "Standard", "Priority", "Enterprise"],
              format: (v) => ["Basic", "Standard", "Priority", "Enterprise"][v],
            }),
          }),
          FormField({
            id: "f-notes",
            label: "Notes",
            span: 12,
            control: Textarea({ id: "f-notes", placeholder: "Anything the team should know…" }),
          }),
          FormField({
            id: "f-docs",
            label: "Documents",
            span: 12,
            control: Dropzone({
              id: "f-docs",
              name: "documents",
              accept: ".pdf,.png,.jpg",
              multiple: true,
              hint: "Contract, ID — PDF, PNG or JPG · up to 10 MB each",
              files: [
                { name: "contract-ada.pdf", kind: "pdf", size: "1.8 MB", progress: 72 },
                { name: "id-scan.png", size: "640 KB" },
                { name: "notes.docx", error: "Unsupported file type" },
              ],
            }),
          }),
        ],
      })
    }<br>${
      FormActions({
        content: html`${Button({ label: "Cancel", variant: "ghost" })}${
          Button({ label: "Save draft", variant: "outline" })
        }${Button({ label: "Create member", type: "submit" })}`,
      })
    }`,
  }),
});

const preferences = Card({
  title: "Preferences",
  body: html`<div class="stack">${
    Switch({ label: "Email notifications", hint: "Mentions, assignments and weekly summary.", checked: true })
  }${Switch({ label: "SMS alerts", hint: "Only for billing failures and security events." })}${
    Switch({ label: "Beta features", hint: "Try new UI before it ships to everyone.", disabled: true })
  }${
    Slider({
      id: "digest-freq",
      name: "digest",
      label: "Digest frequency",
      min: 0,
      max: 3,
      value: 2,
      scale: ["Off", "Monthly", "Weekly", "Daily"],
      format: (v) => ["Off", "Monthly", "Weekly", "Daily"][v],
    })
  }${
    ChoiceGroup({
      items: [
        Checkbox({ label: "Weekly digest", checked: true }),
        Checkbox({ label: "Product updates" }),
      ],
    })
  }${
    ChoiceGroup({
      inline: true,
      items: [
        Radio({ name: "plan", label: "Monthly", checked: true }),
        Radio({ name: "plan", label: "Annual" }),
      ],
    })
  }${
    FormField({
      id: "density",
      label: "Density",
      control: Segmented({
        id: "density",
        name: "density",
        value: "comfortable",
        options: [{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }],
      }),
    })
  }</div>`,
});

const onboardingWizard = Card({
  title: "Workspace setup",
  subtitle: "Multi-step form",
  body: Wizard({
    steps: [{ label: "Account", status: "done" }, { label: "Company", status: "active" }, { label: "Billing" }, {
      label: "Review",
    }],
    content: html`${
      FormGrid({
        fields: [
          FormField({ id: "w-company", label: "Company name", span: 6, control: Input({ id: "w-company" }) }),
          FormField({
            id: "w-size",
            span: 6,
            control: Slider({
              id: "w-size",
              name: "size",
              label: "Team size",
              min: 1,
              max: 500,
              value: 25,
              unit: "people",
              unitOne: "person",
            }),
          }),
          FormField({
            id: "w-trial",
            label: "Trial period",
            span: 6,
            // Client mode (no build*Href): datepicker.js runs the calendar.
            control: DatePicker({
              id: "w-trial",
              name: "trial",
              range: true,
              start: "2026-09-14",
              end: "2026-10-14",
              today: "2026-09-14",
            }),
          }),
          FormField({
            id: "w-industry",
            label: "Industry",
            span: 6,
            control: Select({
              id: "w-industry",
              options: [{ value: "saas", label: "SaaS" }, { value: "agency", label: "Agency" }, {
                value: "other",
                label: "Other",
              }],
            }),
          }),
        ],
      })
    }<br>${
      FormActions({ content: html`${Button({ label: "Back", variant: "ghost" })}${Button({ label: "Continue" })}` })
    }`,
  }),
});

const formsContent = Grid({
  items: [
    GridCol({ span: 8, content: memberForm }),
    GridCol({ span: 4, content: preferences }),
    GridCol({ span: 12, content: onboardingWizard }),
  ],
});

/* ------------------------------------------------------------- Projects */

const projects = [
  {
    name: "Website relaunch",
    desc: "Marketing site redesign on the new CMS.",
    progress: 65,
    status: "In progress",
    team: ["PN", "MT"],
    due: "Oct 3",
  },
  {
    name: "Mobile app v2",
    desc: "Rebuild the mobile client with the new design system.",
    progress: 30,
    status: "In progress",
    team: ["JS", "SK"],
    due: "Nov 20",
  },
  {
    name: "Billing migration",
    desc: "Move billing infra from the legacy provider to Stripe.",
    progress: 80,
    status: "In progress",
    team: ["MT"],
    due: "Sep 30",
  },
  {
    name: "Design system audit",
    desc: "Full accessibility and consistency pass.",
    progress: 100,
    status: "Done",
    team: ["JS", "PN"],
    due: "Sep 1",
  },
  {
    name: "Onboarding revamp",
    desc: "Reduce time-to-first-value for new workspaces.",
    progress: 45,
    status: "In progress",
    team: ["PN", "SK", "MT"],
    due: "Oct 15",
  },
  {
    name: "API v3",
    desc: "Versioned public API with typed SDKs.",
    progress: 10,
    status: "Planned",
    team: ["MT", "JS"],
    due: "Dec 1",
  },
];

const projectsContent = html`
  <div
    data-filter-scope><div class="toolbar">${searchInput("Search projects…")}${Segmented({
      id: "project-status",
      name: "status",
      size: "sm",
      legend: "Status",
      value: "",
      inputAttrs: { "data-table-filter": "" },
      options: [{ value: "", label: "All" }, { value: "in progress", label: "In progress" }, {
        value: "done",
        label: "Done",
      }, {
        value: "planned",
        label: "Planned",
      }],
    })}${Segmented({
      id: "project-view",
      name: "view",
      size: "sm",
      legend: "View",
      value: "grid",
      inputAttrs: { "data-view-target": "#projects-grid" },
      options: [
        { value: "grid", icon: Icon("dashboard", { size: 15 }), ariaLabel: "Grid" },
        { value: "list", icon: Icon("list", { size: 15 }), ariaLabel: "List" },
      ],
    })}</div>${Grid({
      attrs: { id: "projects-grid", "data-view": "grid" },
      items: projects.map((project) =>
        GridCol({
          span: 4,
          attrs: { "data-filter-item": "" },
          content: Card({
            variant: "outlined",
            body: html`
              <div class="project-card__header">${Icon("folder", { size: 20 })}${statusBadge(
                project.status,
              )}</div><h3 class="mt-2">${project.name}</h3><p
                class="text-muted text-sm">${project.desc}</p>${Progress({ value: project.progress })}<div
                class="project-card__footer">${AvatarGroup({
                  avatars: project.team.map((i) => Avatar({ initials: i, size: "sm" })),
                })}<span class="text-subtle text-xs">Due ${project.due} · ${project.progress}%</span></div>
            `,
          }),
        })
      ),
    })}${filterEmpty("projects")}<br>${Card({
      title: "Archived",
      body: Empty({
        variant: "inline",
        icon: "folder",
        title: "No archived projects",
        text: "Finished projects you archive will show up here.",
      }),
    })}</div>${createProjectModal}
`;

/* ----------------------------------------------------------------- Team */

const teamContent = html`<div data-filter-scope><div class="toolbar">${searchInput("Search team…")}${
  Segmented({
    id: "team-page-status",
    name: "status",
    size: "sm",
    legend: "Status",
    value: "",
    inputAttrs: { "data-table-filter": "" },
    options: [{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "away", label: "Away" }],
  })
}</div>${
  Grid({
    items: teamMembers.map((member) =>
      GridCol({
        span: 3,
        attrs: { "data-filter-item": "" },
        content: Card({
          variant: "outlined",
          body: html`
            <div
              class="team-card">${Avatar({ initials: initials(member.name), size: "lg" })}<h3 class="mt-3">${member
                .name}</h3><p class="text-muted text-sm">${member.role}</p><div class="team-card__meta">${Icon("mail", {
                  size: 14,
                })}<span class="text-muted text-xs">${member.email}</span></div><div class="mt-3">${statusBadge(
                  member.status,
                )}</div>${Popover({
                  id: `member-${member.id}`,
                  trigger: PopoverTrigger({ controls: `member-${member.id}`, label: "Contact" }),
                  content: html`
                    <div
                      class="popover__header"><span><span class="popover__title">${member
                        .name}</span><br><span class="popover__subtitle">${member.email}</span></span></div>
                    <div
                      class="popover__stats"><span class="popover__stat"><span class="popover__stat-value">${member
                        .joined.slice(
                          0,
                          4,
                        )}</span><span class="popover__stat-label">Joined</span></span><span class="popover__stat"><span class="popover__stat-value">${member
                          .status === "Active"
                        ? "Now"
                        : "2d"}</span><span class="popover__stat-label">Last seen</span></span></div>
                    <div class="popover__footer">${Button({ label: "Message", size: "sm" })}${Button({
                      label: "Profile",
                      size: "sm",
                      variant: "outline",
                      href: "profile.html",
                    })}</div>
                  `,
                })}</div>
          `,
        }),
      })
    ),
  })
}${filterEmpty("team members")}</div>${inviteModal}`;

/* ------------------------------------------------------------- Settings */

const integrations = [
  { name: "Slack", desc: "Get notified in your team channel.", connected: true },
  { name: "GitHub", desc: "Link pull requests to projects.", connected: true },
  { name: "Stripe", desc: "Sync invoices and payments.", connected: false },
];

type BillingRow = { id: string; date: string; amount: string; status: string };
const billingRows: BillingRow[] = [
  { id: "INV-0921", date: "2026-09-01", amount: "$49.00", status: "Paid" },
  { id: "INV-0884", date: "2026-08-01", amount: "$49.00", status: "Paid" },
  { id: "INV-0850", date: "2026-07-01", amount: "$49.00", status: "Paid" },
  { id: "INV-0812", date: "2026-06-01", amount: "$29.00", status: "Refunded" },
];

const deleteWorkspaceModal = Modal({
  id: "delete-workspace-modal",
  title: "Delete workspace?",
  body:
    html`<p>This permanently deletes <strong>Acme Inc.</strong>, its 6 members and all data. Type the workspace name to confirm.</p><br>${
      Input({ placeholder: "Acme Inc." })
    }`,
  footer: html`${Button({ label: "Cancel", variant: "ghost", attrs: { "data-modal-close": "" } })}${
    Button({ label: "Delete workspace", variant: "danger" })
  }`,
});

const settingsContent = html`${
  Card({
    body: Tabs({
      id: "settings-tabs",
      items: [
        {
          id: "general",
          label: "General",
          content: html`${
            FormGrid({
              fields: [
                FormField({
                  id: "workspace-name",
                  label: "Workspace name",
                  span: 6,
                  control: Input({ id: "workspace-name", value: "Acme Inc." }),
                }),
                FormField({
                  id: "workspace-url",
                  label: "Workspace URL",
                  span: 6,
                  control: InputGroup({
                    start: "app.acme.dev/",
                    control: Input({ id: "workspace-url", value: "acme", extraClass: "input-group__control" }),
                  }),
                }),
                FormField({
                  id: "workspace-recipients",
                  label: "Billing recipients",
                  span: 12,
                  help: "Everyone here gets invoices and payment failures.",
                  control: Combobox({
                    id: "workspace-recipients",
                    name: "recipients",
                    multi: true,
                    placeholder: "Add a person…",
                    selected: ["js", "ar"],
                    options: teamMembers.map((m) => ({
                      value: initials(m.name).toLowerCase(),
                      label: m.name,
                      meta: m.email,
                    })),
                  }),
                }),
                FormField({
                  id: "workspace-week",
                  label: "Week starts on",
                  span: 6,
                  control: Segmented({
                    id: "workspace-week",
                    name: "week",
                    value: "mon",
                    options: [{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }],
                  }),
                }),
                FormField({
                  id: "workspace-retention",
                  span: 6,
                  control: Slider({
                    id: "workspace-retention",
                    name: "retention",
                    label: "Log retention",
                    min: 7,
                    max: 365,
                    step: 1,
                    value: 90,
                    unit: "days",
                    unitOne: "day",
                  }),
                }),
              ],
            })
          }<br>${FormActions({ content: Button({ label: "Save changes" }) })}`,
        },
        {
          id: "billing",
          label: "Billing",
          content: html`${
            Grid({
              items: [
                GridCol({
                  span: 6,
                  content: Card({
                    variant: "flat",
                    body: html`
                      <p class="text-caps">Current plan</p><h3>Team &middot; $49/mo</h3><p
                        class="text-muted text-sm">Renews Oct 1, 2026 · 6 of 10 seats</p>${Progress({ value: 60 })}
                    `,
                  }),
                }),
                GridCol({
                  span: 6,
                  content: Card({
                    variant: "flat",
                    body: html`
                      <p class="text-caps">Payment method</p>
                      <h3>Visa ending 4242</h3>
                      <p class="text-muted text-sm">Expires 04/28 · ${Badge({
                        label: "Default",
                        variant: "accent",
                      })}</p>
                    `,
                  }),
                }),
              ],
            })
          }<br>${
            DataTable<BillingRow>({
              id: "billing-history",
              title: "Billing history",
              columns: [
                { key: "id", label: "Invoice", mono: true },
                { key: "date", label: "Date" },
                { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
                { key: "amount", label: "Amount", numeric: true },
              ],
              rows: billingRows,
              rowKey: (r) => r.id,
              rowActions: () => Button({ label: "PDF", size: "sm", variant: "ghost" }),
            })
          }<br>${
            FormActions({
              content: html`${Button({ label: "Change plan", variant: "outline" })}${
                Button({ label: "Update payment method" })
              }`,
            })
          }`,
        },
        {
          id: "integrations",
          label: "Integrations",
          content: html`${
            integrations.map((integ) =>
              html`
                <div
                  class="integration-row"><div class="integration-row__icon">${Icon("plug", {
                    size: 18,
                  })}</div><div class="integration-row__body"><p class="text-medium">${integ
                    .name}</p><p class="text-muted text-sm">${integ.desc}</p></div>${Switch({
                      checked: integ.connected,
                      attrs: { "aria-label": `Connect ${integ.name}` },
                    })}</div>
              `
            )
          }<br><h3>Webhooks</h3><br>${
            Empty({
              variant: "inline",
              icon: "terminal",
              title: "No webhooks configured",
              text: "Send events to your own endpoints when records change.",
              actions: Button({ label: "Add webhook", size: "sm" }),
            })
          }`,
        },
      ],
    }),
  })
}<br>${
  Card({
    title: "Danger zone",
    variant: "danger",
    body: html`
      <div
        class="danger-zone__row"><div><p class="text-medium">Delete this workspace</p><p class="text-muted text-sm">All projects, members and billing history are removed. This cannot be undone.</p></div>${Button(
          { label: "Delete workspace", variant: "danger", attrs: { "data-modal-open": "#delete-workspace-modal" } },
        )}</div>
    `,
  })
}${deleteWorkspaceModal}`;

/* ------------------------------------------------ Lock screen / 404 */

const lockScreenPage = html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Locked — Acme Admin</title>
      <link rel="stylesheet" href="../../dist/ui.css">
      <link rel="stylesheet" href="../../examples/themes/admin.css">
    </head>
    <body>
  ${AuthLayout({
    brand: html`<span class="sidebar__brand-mark">A</span> Acme`,
    content: Card({
      body: html`
        <div
          class="profile-header">${Avatar({
            initials: "JS",
            size: "lg",
          })}<div><h3>Jamie Sun</h3><p class="text-muted text-sm">Session locked</p></div></div>${Form({
            content: html`${
              FormField({
                id: "unlock-password",
                label: "Password",
                control: Input({ id: "unlock-password", type: "password" }),
              })
            }<br>${
              Otp({
                id: "unlock-otp",
                name: "otp",
                label: "Authenticator code",
                hint: "The 6-digit code from your authenticator app.",
                groups: 3,
              })
            }<br>${FormActions({ content: Button({ label: "Unlock", type: "submit", block: true }) })}`,
          })}
      `,
    }),
  })}
  <script src="../../dist/ui.js"></script>
    </body>
  </html>
`;

const mockView = {
  requestId: "req_9f2c1a",
  runtimePath: "/__rapid/ui.js",
  path: "/does-not-exist",
  asset: (p: string) => p,
  query: {},
};

const notFoundBody = ErrorTemplate.render(
  { status: 404, message: "That page doesn't exist, or has moved.", requestId: mockView.requestId },
  mockView,
);

const notFoundPage = html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>404 — Acme Admin</title>
      <link rel="stylesheet" href="../../dist/ui.css">
      <link rel="stylesheet" href="../../examples/themes/admin.css">
    </head>
    <body>
  ${adminNavbar()}
  ${notFoundBody}
  ${globalCommand}
  <script src="../../dist/ui.js"></script>
    </body>
  </html>
`;

/* ------------------------------------------------------- write it all */

await ensureDir("demo/admin");

const write = (name: string, page: unknown) => writeTextFile(`demo/admin/${name}.html`, render(page as Html));

await write(
  "dashboard",
  adminPage({
    title: "Dashboard",
    activeHref: "dashboard.html",
    breadcrumb: "Dashboard",
    content: dashboardContent,
    scripts: [ChartScript()],
    actions: Segmented({
      id: "dash-period",
      name: "period",
      size: "sm",
      legend: "Period",
      value: "month",
      options: [{ value: "week", label: "Week" }, { value: "month", label: "Month" }, {
        value: "quarter",
        label: "Quarter",
      }],
    }),
  }),
);
await write(
  "projects",
  adminPage({
    title: "Projects",
    activeHref: "projects.html",
    breadcrumb: "Projects",
    content: projectsContent,
    actions: Button({
      label: "New project",
      size: "sm",
      iconStart: Icon("plus", { size: 14 }),
      attrs: { "data-modal-open": "#create-project-modal" },
    }),
  }),
);
await write(
  "team",
  adminPage({
    title: "Team",
    activeHref: "team.html",
    breadcrumb: "Team",
    content: teamContent,
    actions: Button({
      label: "Invite",
      size: "sm",
      iconStart: Icon("plus", { size: 14 }),
      attrs: { "data-modal-open": "#invite-modal" },
    }),
  }),
);
await write(
  "profile",
  adminPage({ title: "Profile", activeHref: "profile.html", breadcrumb: "Profile", content: profileContent }),
);
await write(
  "invoice",
  adminPage({
    title: "Invoice",
    activeHref: "invoice.html",
    breadcrumb: "Invoice",
    content: invoiceContent,
    toasts: [Toast({ variant: "ink", body: "Reminder sent to Blue Bottle Co.", action: { label: "Undo" } })],
  }),
);
await write(
  "tables",
  adminPage({
    title: "Tables",
    activeHref: "tables.html",
    breadcrumb: "Tables",
    content: tablesContent,
    toasts: [
      Toast({ variant: "success", body: "Export ready", meta: "orders-2026-09.csv · 1,093 rows" }),
      Toast({ variant: "ink", body: "2 members deactivated", action: { label: "Undo" } }),
    ],
  }),
);
await write(
  "forms",
  adminPage({ title: "Forms", activeHref: "forms.html", breadcrumb: "Forms", content: formsContent }),
);
await write(
  "settings",
  adminPage({ title: "Settings", activeHref: "settings.html", breadcrumb: "Settings", content: settingsContent }),
);
await write("lock-screen", lockScreenPage);
await write("404", notFoundPage);

console.log(
  "Built demo/admin/{dashboard,projects,team,profile,invoice,tables,forms,settings,lock-screen,404}.html",
);
