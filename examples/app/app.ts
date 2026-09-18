/**
 * End-to-end example: a real rAPId `Application` wearing this library —
 * `ui.core` from `createCoreTemplate()`, `ui.errorTemplates` from
 * `templates/errors.ts`, every layout on its own page, every component
 * on the gallery pages, and the server-driven pieces (combobox, command
 * palette, date picker, sortable/paginated tables, a lazy region, a
 * validated form, toasts) backed by actual swap routes.
 *
 * Assets: `UI_ASSETS=/ui` (default) mounts the package's own dist/ under
 * /ui with rAPId fingerprinting; `UI_ASSETS=cdn` loads the versioned
 * jsDelivr bundle with SRI instead — the zero-setup path a downstream app
 * gets by default, exercised here once the package is published.
 *
 * Run: `deno task app` (Node: `npm run app`, Bun: `bun run bun:app`).
 */
import { Application } from "@tundralibs/rapid";
import { type Html, html, type RapidFormError, template } from "@tundralibs/rapid/ui";
import { type CoreAssets, createCoreTemplate } from "../../templates/core.ts";
import { asRapidLayout } from "../../templates/layout.ts";
import { errorTemplates } from "../../templates/errors.ts";
import { uiAssetsDir } from "../../assets.ts";
import { VERSION } from "../../version.ts";
import { StackedLayout } from "../../layouts/stacked/stacked.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { Button } from "../../components/button/button.ts";
import { Card } from "../../components/card/card.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Badge } from "../../components/badge/badge.ts";
import { Alert } from "../../components/alert/alert.ts";
import { Toast } from "../../components/toast/toast.ts";
import { SkeletonCard } from "../../components/skeleton/skeleton.ts";
import { Timeline } from "../../components/timeline/timeline.ts";
import { Form } from "../../components/form/form.ts";
import { FormActions, FormField, FormGrid } from "../../components/form-field/form-field.ts";
import { Input } from "../../components/input/input.ts";
import { Select } from "../../components/select/select.ts";
import { Otp } from "../../components/otp/otp.ts";
import { ComboboxList } from "../../components/combobox/combobox.ts";
import { CommandList } from "../../components/command/command.ts";
import { DatePicker } from "../../components/datepicker/datepicker.ts";
import { Dropzone, type DropzoneFile } from "../../components/dropzone/dropzone.ts";
import { Icon } from "../../shared/icons.ts";
import { APEXCHARTS } from "../../components/chart/chart.ts";
import { layoutIndex, type LayoutName, layoutNames, layoutSamples } from "../shared/layout-samples.ts";
import { catalogue, catalogueCss, type CatalogueGroup, catalogueGroups, catalogueHtml } from "../shared/catalogue.ts";
import {
  commandItems,
  type DemoRoutes,
  type Dir,
  type InvoiceEdits,
  invoicesTable,
  matches,
  periodPicker,
  type PeriodState,
  type ProjectsState,
  projectsTable,
  reviewerOptions,
} from "../shared/data.ts";

export type AppOptions = {
  port?: number;
  hostname?: string;
  /** `"cdn"` or a URL prefix to self-host dist/ under. @default "/ui" */
  assets?: CoreAssets;
  /** Silence the application log (tests). */
  quiet?: boolean;
};

const dir = (v: string | null): Dir => v === "desc" ? "desc" : "asc";
const int = (v: string | null, fallback: number): number => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/* ----------------------------------------------------------------- shell */

const nav = (active: string) =>
  Navbar({
    id: "app-navbar",
    brand: html`<span class="sidebar__brand-mark">U</span> @tundralibs/ui`,
    links: [
      { href: "/", label: "Home", active: active === "home" },
      { href: "/layouts", label: "Layouts", active: active === "layouts" },
      { href: "/components", label: "Components", active: active === "components" },
      { href: "/forms", label: "Forms", active: active === "forms" },
      { href: "/errors", label: "Errors", active: active === "errors" },
    ],
    actions: Button({
      label: "Dark",
      variant: "outline",
      size: "sm",
      iconStart: Icon("moon", { size: 14 }),
      attrs: { "data-theme-toggle": "" },
    }),
  });

const footer =
  html`<p>@tundralibs/ui ${VERSION} &middot; example app &middot; <a href="https://jsr.io/@tundralibs/rapid">rAPId</a></p>`;

const shell = (active: string) =>
  asRapidLayout((body) => StackedLayout({ header: nav(active), width: "boxed", content: body, footer }));

/* ----------------------------------------------------------------- pages */

const Home = template<{ assets: CoreAssets }>((data) =>
  html`
    ${PageHeader({
      title: "Every layout and component, served by rAPId",
      subtitle: html`Assets: ${
        data.assets === "cdn"
          ? Badge({ label: "CDN + SRI", variant: "success", dot: true })
          : Badge({ label: `self-hosted at ${data.assets}`, variant: "info", dot: true })
      } &middot; swaps via <code class="text-mono">/__rapid/ui.js</code>, history on.`,
    })}<div
      class="stack stack--lg">${Grid({
        items: [
          ["Layouts", "/layouts", "Eight device-compatible frames, one page each."],
          [
            "Components",
            "/components",
            "Every component in every variant, grouped — tables, combobox, palette and date picker wired to real routes.",
          ],
          ["Forms", "/forms", "A validated form: RapidFormError → FormErrorAlert, no page reload."],
        ].map(([title, href, body]) =>
          GridCol({ span: 3, content: Card({ title, href, body: html`<p>${body}</p>` }) })
        ),
      })}<section class="stack" aria-labelledby="stats-title"><h2 id="stats-title">Lazy region <span class="text-mono text-2xs">data-load</span></h2><div id="stats" data-action="/fragments/stats" data-load>${Grid(
        { items: [1, 2, 3, 4].map(() => GridCol({ span: 3, content: SkeletonCard() })) },
      )}</div></section><section class="stack" aria-labelledby="toast-title"><h2 id="toast-title">Toast from the server <span class="text-mono text-2xs">data-swap="append"</span></h2><p>${Button(
        {
          label: "Show toast",
          attrs: { "data-action": "/fragments/toast", "data-target": "#toast-region", "data-swap": "append" },
        },
      )}</p></section></div>
  `, "Home");

const Static = (name: string, body: Html) => template<Record<never, never>>(() => body, name);

/* Component pages — the catalogue, one group per route, with its
 * server-driven cases wired to real routes. A pushable region's URL is
 * the page route itself: the projects table's sort/page links and the
 * invoices table's sort links point back at /components/data, the period
 * picker's month/day/preset links at /components/forms, and the handler
 * returns `fragment` naming the region a swap should get; a plain
 * navigation renders the whole page. That is what makes `data-push`
 * safe — a reload or deep link of a pushed URL renders the full page in
 * the right state. Regions on one page use distinct query keys
 * (`psort/pdir/page` → projects, `sort/dir` → invoices) and build their
 * links from a fixed base, so one region's state never leaks into
 * another's URLs. */
type GroupData = {
  group: CatalogueGroup;
  projects: ProjectsState;
  invoices: { key: string; dir: Dir };
  invoiceEdits: InvoiceEdits;
  period: PeriodState;
  fragment: "projects" | "invoices" | "period" | false;
};
const appRoutes = (period: PeriodState): DemoRoutes => {
  const range = `&start=${period.start ?? ""}&end=${period.end ?? ""}`;
  return {
    toast: "/fragments/toast",
    reviewers: "/fragments/reviewers",
    commands: "/fragments/commands",
    projectsSort: (key, d) => `/components/data?psort=${key}&pdir=${d}&page=1`,
    projectsPage: (p) => `/components/data?page=${p}`,
    invoiceSort: (key, d) => `/components/data?sort=${key}&dir=${d}`,
    invoiceBulk: (sort) => `/components/data/invoices?sort=${sort.key}&dir=${sort.dir}`,
    preview: "/fragments/preview",
    upload: "/fragments/upload",
    month: (y, m) => `/components/forms?month=${y}-${String(m + 1).padStart(2, "0")}${range}`,
    day: (iso) => `/components/forms?day=${iso}${range}`,
    preset: (name) => `/components/forms?preset=${name}`,
  };
};
const GroupPage = template<GroupData>((data) => {
  const routes = appRoutes(data.period);
  if (data.fragment === "projects") return projectsTable(routes, data.projects);
  if (data.fragment === "invoices") return invoicesTable(routes, data.invoices, data.invoiceEdits);
  if (data.fragment === "period") return DatePicker(periodPicker(routes, data.period));
  const group = catalogueGroups.find((g) => g.id === data.group)!;
  const entries = catalogue(routes, {
    projects: data.projects,
    invoices: data.invoices,
    invoiceEdits: data.invoiceEdits,
    period: data.period,
  })
    .filter((e) => e.group === data.group);
  return html`${PageHeader({ title: group.title, subtitle: group.blurb })}${catalogueHtml(entries)}`;
}, "GroupPage");

const ComponentsIndex = Static(
  "ComponentsIndex",
  html`${
    PageHeader({
      title: "Components",
      subtitle:
        "Every component in every variant, one page per group. The server-driven cases (tables, combobox, palette, date picker, toasts) are wired to real routes here.",
    })
  }${
    Grid({
      items: catalogueGroups.map((g) =>
        GridCol({
          span: 4,
          content: Card({ title: g.title, href: `/components/${g.id}`, body: html`<p>${g.blurb}</p>` }),
        })
      ),
    })
  }`,
);

/** Parse the server-driven state (and which region a swap wants) from the URL. */
function groupData(group: CatalogueGroup, url: string, isSwap: boolean, invoiceEdits: InvoiceEdits = {}): GroupData {
  const q = new URL(url).searchParams;
  const projects: ProjectsState = {
    page: int(q.get("page"), 2),
    sort: q.has("psort") ? { key: q.get("psort")!, dir: dir(q.get("pdir")) } : undefined,
  };
  const invoices = { key: q.get("sort") ?? "id", dir: q.has("sort") ? dir(q.get("dir")) : "desc" as Dir };
  const period: PeriodState = q.has("start") || q.has("end")
    ? { start: q.get("start") || undefined, end: q.get("end") || undefined }
    : { start: "2026-09-14", end: "2026-09-22" };
  if (q.has("month")) {
    const [y, m] = q.get("month")!.split("-").map(Number);
    if (y && m) {
      period.year = y;
      period.month = m - 1;
    }
  }
  const day = q.get("day");
  if (day) {
    // First pick starts a range; a later pick closes it (or restarts).
    if (period.start && !period.end && day >= period.start) period.end = day;
    else {
      period.start = day;
      period.end = undefined;
    }
    period.year = Number(day.slice(0, 4));
    period.month = Number(day.slice(5, 7)) - 1;
  }
  const preset = q.get("preset");
  if (preset) {
    period.start = preset === "7d" ? "2026-09-08" : preset === "30d" ? "2026-08-16" : "2026-07-01";
    period.end = "2026-09-14";
    period.year = 2026;
    period.month = 8;
  }
  let fragment: GroupData["fragment"] = false;
  if (isSwap) {
    if (q.has("month") || q.has("day") || q.has("preset")) fragment = "period";
    else if (q.has("psort") || q.has("page")) fragment = "projects";
    else if (q.has("sort")) fragment = "invoices";
  }
  return { group, projects, invoices, invoiceEdits, period, fragment };
}

/* Forms — the union rAPId's formState() produces, rendered straight. */
type SignupState = RapidFormError | { state: "clean" } | { state: "added"; values: Record<string, string> };
const signupForm = (state: SignupState) => {
  const values = state.state === "error" ? state.values : {};
  const fields = state.state === "error" ? state.fields : {};
  return Form({
    id: "signup",
    action: "/forms/signup",
    error: state.state === "error" ? state : undefined,
    attrs: { "data-action": "/forms/signup", "data-target": "#signup", "data-swap": "outer" },
    content: html`${
      FormGrid({
        fields: [
          FormField({
            id: "name",
            label: "Full name",
            required: true,
            span: 6,
            error: fields.name,
            control: (a11y) =>
              Input({
                id: "name",
                name: "name",
                value: values.name,
                required: true,
                invalid: a11y.invalid,
                attrs: { "aria-describedby": a11y.describedBy },
              }),
          }),
          FormField({
            id: "email",
            label: "Email",
            required: true,
            span: 6,
            error: fields.email,
            control: (a11y) =>
              Input({
                id: "email",
                name: "email",
                type: "email",
                value: values.email,
                required: true,
                invalid: a11y.invalid,
                attrs: { "aria-describedby": a11y.describedBy },
              }),
          }),
          FormField({
            id: "plan",
            label: "Plan",
            span: 6,
            error: fields.plan,
            control: Select({
              id: "plan",
              name: "plan",
              value: values.plan,
              options: [{ value: "free", label: "Free" }, { value: "team", label: "Team" }, {
                value: "enterprise",
                label: "Enterprise",
              }],
            }),
          }),
          FormField({
            id: "invite",
            label: "Invite code",
            help: "Any 6 digits — 000000 is rejected, to show a field error.",
            span: 6,
            control: Otp({
              id: "invite",
              name: "invite",
              length: 6,
              groups: 2,
              value: values.invite,
              error: fields.invite,
            }),
          }),
        ],
      })
    }${
      FormActions({
        content: html`${Button({ label: "Reset", variant: "ghost", type: "reset" })}${
          Button({ label: "Create account", type: "submit" })
        }`,
      })
    }`,
  });
};
const SignupView = template<SignupState>(
  (state) =>
    state.state === "added"
      ? html`<div id="signup" class="stack">${
        Alert({
          variant: "success",
          title: `Welcome, ${state.values.name}!`,
          body: `We sent a confirmation to ${state.values.email}.`,
        })
      }${
        Timeline({
          items: [{ title: "Account created", status: "done" }, { title: "Confirm your email", status: "current" }, {
            title: "Invite your team",
          }],
        })
      }<p>${Button({ label: "Start over", variant: "outline", href: "/forms" })}</p></div>`
      : signupForm(state),
  "SignupView",
);
const FormsPage = template<SignupState>((state, view) =>
  html`${
    PageHeader({
      title: "Forms",
      subtitle:
        "Submit with mistakes to see RapidFormError rendered by FormErrorAlert and per-field errors — swapped in place. Without JavaScript the same route redirects (PRG).",
    })
  }${Card({ body: SignupView.render(state, view) })}`, "FormsPage");

const validateSignup = (body: Record<string, string>): SignupState => {
  const values = {
    name: (body.name ?? "").trim(),
    email: (body.email ?? "").trim(),
    plan: body.plan ?? "free",
    invite: (body.invite ?? "").trim(),
  };
  const fields: Record<string, string> = {};
  if (values.name.length < 2) fields.name = "Tell us your name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) fields.email = "Enter a valid email address.";
  if (!["free", "team", "enterprise"].includes(values.plan)) fields.plan = "Pick a plan.";
  if (values.invite && !/^\d{6}$/.test(values.invite)) fields.invite = "Invite codes are 6 digits.";
  if (values.invite === "000000") fields.invite = "That invite code has been used.";
  if (Object.keys(fields).length) {
    return { state: "error", message: "Please fix the highlighted fields.", fields, values };
  }
  return { state: "added", values };
};

const ErrorsPage = Static(
  "ErrorsPage",
  html`${
    PageHeader({
      title: "Error pages",
      subtitle:
        "templates/errors.ts replaces rAPId's inline-styled DefaultErrorPage — CSP-clean, on the library's tokens.",
    })
  }${
    Grid({
      items: [
        GridCol({
          span: 6,
          content: Card({
            title: "404 — not found",
            href: "/this-page-does-not-exist",
            body: html`<p>An unmatched URL, rendered inside the core.</p>`,
          }),
        }),
        GridCol({
          span: 6,
          content: Card({
            title: "500 — handler threw",
            href: "/errors/boom",
            body: html`<p>A route that throws; PRODUCTION collapses the details.</p>`,
          }),
        }),
      ],
    })
  }`,
);

/* ------------------------------------------------------------- fragments */

const StatsFragment = Static(
  "StatsFragment",
  Grid({
    items: [
      ["Revenue", "$48.2k", "coin", { label: "+12.4%", up: true }],
      ["Active users", "1,284", "users", { label: "+3.1%", up: true }],
      ["p95 latency", "212 ms", "clock", { label: "-8 ms", up: true }],
      ["Errors", "0.4%", "warning", { label: "+0.1%", up: false }],
    ].map(([label, value, icon, trend]) =>
      GridCol({
        span: 3,
        content: Card({
          body: Stat({
            label: label as string,
            value: value as string,
            icon: Icon(icon as "coin", { size: 20 }),
            tone: "primary",
            trend: trend as { label: string; up: boolean },
          }),
        }),
      })
    ),
  }),
);

let toasts = 0;
const ToastFragment = template<{ n: number }>(
  (d) =>
    Toast({
      variant: "success",
      body: `Toast #${d.n} from the server`,
      meta: new Date().toLocaleTimeString("en-GB"),
      autoDismissMs: 4000,
    }),
  "ToastFragment",
);

const ProfileFragment = Static(
  "ProfileFragment",
  html`
    <div
      class="popover__header"><span><span class="popover__title">Grace Hopper</span><br><span class="popover__subtitle">grace@tundra.dev</span></span></div>
    <div
      class="popover__stats"><span class="popover__stat"><span class="popover__stat-value">148</span><span class="popover__stat-label">Reviews</span></span><span class="popover__stat"><span class="popover__stat-value">2.1h</span><span class="popover__stat-label">Median</span></span></div>
  `,
);

/* A deliberately small Markdown renderer for the editor's Preview:
 * headings, lists, quotes, fenced code, bold/italic/code/links. Every
 * piece of user text goes through `html` (escaped); links only keep
 * http(s)/relative targets. A real app would use a proper parser — the
 * point here is that rendering user text is the server's job. */
function inline(text: string): Html[] {
  const out: Html[] = [];
  const re = /(\*\*(.+?)\*\*|_(.+?)_|~~(.+?)~~|`(.+?)`|!\[(.*?)\]\((\S+?)\)|\[(.+?)\]\((\S+?)\))/g;
  const safe = (u: string) => /^(https?:\/\/|\/|#)/.test(u) ? u : "#";
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(html`${text.slice(last, m.index)}`);
    if (m[2]) out.push(html`<strong>${m[2]}</strong>`);
    else if (m[3]) out.push(html`<em>${m[3]}</em>`);
    else if (m[4]) out.push(html`<s>${m[4]}</s>`);
    else if (m[5]) out.push(html`<code>${m[5]}</code>`);
    else if (m[7]) out.push(html`<img src="${safe(m[7])}" alt="${m[6]}" loading="lazy">`);
    else if (m[8]) out.push(html`<a href="${safe(m[9])}">${m[8]}</a>`);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(html`${text.slice(last)}`);
  return out;
}
function renderMarkdown(src: string): Html {
  const blocks: Html[] = [];
  const lines = src.replace(/\r/g, "").split("\n");
  const isBlock = (l: string) => /^(#{1,3} |- |\d+\. |> |```|-{3,}\s*$)/.test(l);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(html`<pre><code>${code.join("\n")}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,3}) (.*)/);
    if (h) {
      const level = h[1].length;
      blocks.push(
        level === 1
          ? html`<h1>${inline(h[2])}</h1>`
          : level === 2
          ? html`<h2>${inline(h[2])}</h2>`
          : html`<h3>${inline(h[2])}</h3>`,
      );
      i++;
      continue;
    }
    if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: Html[] = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) {
        items.push(html`<li>${inline(lines[i++].replace(/^(- |\d+\. )/, ""))}</li>`);
      }
      blocks.push(ordered ? html`<ol>${items}</ol>` : html`<ul>${items}</ul>`);
      continue;
    }
    if (line.startsWith("> ")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) q.push(lines[i++].slice(2));
      blocks.push(html`
        <blockquote>
          <p>${inline(q.join(" "))}</p>
        </blockquote>
      `);
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(html`<hr>`);
      i++;
      continue;
    }
    // A single newline inside a paragraph is a line break (as GitHub renders it).
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBlock(lines[i])) para.push(lines[i++]);
    blocks.push(html`<p>${para.map((l, n) => n ? html`<br>${inline(l)}` : html`${inline(l)}`)}</p>`);
  }
  return html`${blocks}`;
}
const PreviewFragment = template<{ text: string }>(
  (d) => d.text.trim() ? renderMarkdown(d.text) : html`<p class="text-muted">Nothing to preview.</p>`,
  "PreviewFragment",
);

const ReviewersFragment = template<{ q: string }>(
  (d) =>
    ComboboxList({
      id: "reviewer",
      query: d.q,
      selected: "gh",
      options: reviewerOptions.filter((o) => matches(o.label, d.q)),
    }),
  "ReviewersFragment",
);

const CommandsFragment = template<{ q: string }>(
  (d) => CommandList({ id: "palette", query: d.q, items: commandItems.filter((i) => matches(i.label, d.q)) }),
  "CommandsFragment",
);

const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1c1c1e"/><text x="16" y="22" font-family="system-ui,sans-serif" font-size="17" font-weight="700" fill="#fff" text-anchor="middle">U</text></svg>`;

const css = `/* Example-app chrome — not part of the library. */
${catalogueCss}`;

/* ------------------------------------------------------------------- app */

export async function createApp(options: AppOptions = {}): Promise<Application> {
  const assets = options.assets ?? "/ui";
  const distDir = uiAssetsDir();
  if (assets !== "cdn" && !distDir) throw new Error("dist/ is not on disk — run the build, or use assets: 'cdn'");

  const app = await Application.initialize({
    name: "ui-example",
    // rAPId refuses every upload until extensions are declared (fail-safe).
    uploads: { allowedExtensions: [".txt", ".png", ".jpg", ".pdf"] },
    server: {
      port: options.port ?? 8010,
      hostname: options.hostname ?? "127.0.0.1",
      static: assets === "cdn" ? {} : { [assets]: { root: distDir!, fingerprint: true } },
    },
    ui: {
      core: createCoreTemplate({
        assets,
        history: true,
        stylesheets: ["/app.css"],
        scripts: [APEXCHARTS],
        head: html`<link rel="icon" href="/favicon.svg">`,
      }),
      errorTemplates,
      prefer: "html",
      history: true,
    },
    ...(options.quiet ? { logger: { handlers: [] } } : {}),
  });

  app.get("/app.css", () => ({ content: css, headers: { "content-type": "text/css; charset=utf-8" } }));
  app.get("/favicon.svg", () => ({ content: favicon, headers: { "content-type": "image/svg+xml" } }));

  app.get(
    "/",
    { template: { render: Home, title: "@tundralibs/ui example" }, layout: shell("home") },
    () => ({ content: { assets } }),
  );

  // Layouts: each sample is a complete frame of its own, so no shell.
  app.get("/layouts", {
    template: { render: Static("LayoutIndex", layoutIndex(layoutHrefs)), title: "Layouts" },
    layout: false,
  }, () => ({ content: {} }));
  const samples = layoutSamples(layoutHrefs);
  for (const name of layoutNames) {
    app.get(`/layouts/${name}`, {
      template: { render: Static(`Layout:${name}`, samples[name]), title: `Layout: ${name}` },
      layout: false,
    }, () => ({ content: {} }));
  }

  app.get(
    "/components",
    { template: { render: ComponentsIndex, title: "Components" }, layout: shell("components") },
    () => ({ content: {} }),
  );
  // What the invoices bulk form has done: per process, so every boot starts clean.
  const invoiceEdits: Required<InvoiceEdits> = { deleted: [], assigned: [] };
  for (const group of catalogueGroups) {
    app.get(`/components/${group.id}`, {
      template: { render: GroupPage, title: group.title },
      layout: shell("components"),
    }, (ctx) => ({
      content: groupData(group.id, ctx.url, ctx.isSwap, invoiceEdits),
    }));
  }
  // The invoices bulk form: `op` names the button that submitted, `selected`
  // is one entry per checked row (rAPId's runtime posts the submitter too).
  // A swap gets the re-rendered table back; without JavaScript it is a
  // redirect to the page (PRG), sort carried in the URL.
  app.post(
    "/components/data/invoices",
    { template: { render: GroupPage, prefer: "html" as const }, layout: shell("components") },
    async (ctx) => {
      const body = ((await ctx.payload) ?? {}) as Record<string, string | string[]>;
      const raw = body.selected;
      const keys = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [];
      const list = body.op === "delete" ? invoiceEdits.deleted : body.op === "assign" ? invoiceEdits.assigned : null;
      if (list) { for (const key of keys) if (!list.includes(key)) list.push(key); }
      const data = groupData("data", ctx.url, true, invoiceEdits);
      if (!ctx.isSwap) {
        const q = new URL(ctx.url).search;
        return { content: data, redirect: `/components/data${q}` };
      }
      return { content: { ...data, fragment: "invoices" as const } };
    },
  );

  app.get("/forms", { template: { render: FormsPage, title: "Forms" }, layout: shell("forms") }, (ctx) => {
    const q = new URL(ctx.url).searchParams;
    const name = q.get("welcome");
    return { content: name ? { state: "added", values: { name, email: q.get("email") ?? "" } } : { state: "clean" } };
  });
  app.post("/forms/signup", { template: { render: SignupView, prefer: "html" as const } }, async (ctx) => {
    const body = ((await ctx.payload) ?? {}) as Record<string, string>;
    const result = validateSignup(body);
    if (result.state === "added" && !ctx.isSwap) {
      // No JavaScript: Post/Redirect/Get, values carried in the URL.
      return {
        content: result,
        redirect: `/forms?welcome=${encodeURIComponent(result.values.name)}&email=${
          encodeURIComponent(result.values.email)
        }`,
      };
    }
    return { content: result };
  });

  app.get(
    "/errors",
    { template: { render: ErrorsPage, title: "Error pages" }, layout: shell("errors") },
    () => ({ content: {} }),
  );
  app.get("/errors/boom", { template: ErrorsPage, layout: shell("errors") }, () => {
    throw new Error("The example route threw on purpose.");
  });

  app.get("/fragments/stats", { template: StatsFragment }, () => ({ content: {} }));
  app.get("/fragments/toast", { template: ToastFragment }, () => ({ content: { n: ++toasts } }));
  app.get("/fragments/profile", { template: ProfileFragment }, () => ({ content: {} }));
  // The dropzone's upload form: a multipart post the runtime streams over
  // XMLHttpRequest (rapid:progress fills the pending rows); the reply is
  // the re-rendered Dropzone with the server's own rows for what landed.
  app.post("/fragments/upload", { template: UploadFragment }, async (ctx) => {
    const body = ((await ctx.payload) ?? {}) as Record<string, unknown>;
    const raw = body.files;
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as { name?: string; size?: number }[];
    const files: DropzoneFile[] = list.map((f) => ({
      name: String(f.name ?? "file"),
      kind: String(f.name ?? "").split(".").pop()?.slice(0, 4).toLowerCase(),
      size: formatSize(Number(f.size ?? 0)),
    }));
    return { content: { files } };
  });
  app.post("/fragments/preview", { template: PreviewFragment }, async (ctx) => {
    const body = ((await ctx.payload) ?? {}) as Record<string, string>;
    return { content: { text: String(body.text ?? "") } };
  });
  app.get(
    "/fragments/reviewers",
    { template: ReviewersFragment },
    (ctx) => ({ content: { q: new URL(ctx.url).searchParams.get("q") ?? "" } }),
  );
  app.get(
    "/fragments/commands",
    { template: CommandsFragment },
    (ctx) => ({ content: { q: new URL(ctx.url).searchParams.get("q") ?? "" } }),
  );

  return app;
}

const layoutHrefs = { index: "/layouts", page: (name: LayoutName) => `/layouts/${name}` };

const formatSize = (bytes: number): string =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1048576).toFixed(1)} MB`;

const UploadFragment = template<{ files: DropzoneFile[] }>(
  (d) => Dropzone({ id: "cat-dz-1", name: "files", multiple: true, hint: "Anything up to 10 MB", files: d.files }),
  "UploadFragment",
);
