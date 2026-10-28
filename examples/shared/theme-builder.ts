/**
 * The theme builder (demo/theme-builder.html): live controls for the main
 * tokens — colours, radius, control height, type size, motion, fonts —
 * applied to the page through the CSSOM (`documentElement.style.
 * setProperty`, no inline style attribute) so a preview made of real
 * components follows every move, and an "Export" that writes the changed
 * tokens as a theme file in the shape `tokens/default.css` uses (a `:root`
 * block plus the two dark blocks, with the same selectors). The state
 * lives in localStorage and in the URL hash, so a theme can be shared as a
 * link. Everything here is harness: the page's chrome is the library, the
 * script and stylesheet are written to demo/theme-builder.{js,css}.
 */
import { type Html, html } from "@tundralibs/rapid/ui";
import { Alert } from "../../components/alert/alert.ts";
import { Badge } from "../../components/badge/badge.ts";
import { Breadcrumb } from "../../components/breadcrumb/breadcrumb.ts";
import { Button } from "../../components/button/button.ts";
import { Card } from "../../components/card/card.ts";
import { DataTable } from "../../components/data-table/data-table.ts";
import { FormField } from "../../components/form-field/form-field.ts";
import { Input } from "../../components/input/input.ts";
import type { MenuItem } from "../../components/menu/menu.ts";
import { ConfirmModal } from "../../components/modal/modal.ts";
import { Navbar } from "../../components/navbar/navbar.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Segmented } from "../../components/segmented/segmented.ts";
import { Select } from "../../components/select/select.ts";
import { Sidebar } from "../../components/sidebar/sidebar.ts";
import { Slider } from "../../components/slider/slider.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Switch } from "../../components/switch/switch.ts";
import { Tabs } from "../../components/tabs/tabs.ts";
import { ToastRegion } from "../../components/toast/toast.ts";
import { SidebarLayout } from "../../layouts/sidebar/sidebar.ts";
import { Icon } from "../../shared/icons.ts";
import { catalogueGroups } from "./catalogue.ts";

/** A colour token the builder edits. */
const COLORS: { token: string; label: string; hint?: string }[] = [
  { token: "--color-primary", label: "Primary (ink)", hint: "Buttons, active links." },
  { token: "--color-accent", label: "Accent", hint: "Links, focus ring, highlights." },
  { token: "--color-canvas", label: "Canvas", hint: "The page ground." },
  { token: "--color-surface", label: "Surface", hint: "Cards and controls." },
  { token: "--color-text", label: "Text" },
  { token: "--color-border", label: "Border" },
  { token: "--color-success", label: "Success" },
  { token: "--color-warning", label: "Warning" },
  { token: "--color-danger", label: "Danger" },
  { token: "--color-info", label: "Info" },
];

const FONT_OPTIONS = [
  { value: "system", label: "System sans" },
  { value: "instrument", label: "Instrument Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
];

const chrome = (
  { brand, active }: { brand: Html; active: string },
) => {
  const items: MenuItem[] = [
    { label: "Overview", href: "index.html", icon: Icon("dashboard", { size: 18 }) },
    ...catalogueGroups.map((g): MenuItem => ({
      label: g.title,
      href: `${g.id}.html`,
      icon: Icon("folder", { size: 18 }),
    })),
    { label: "Layouts", href: "layouts/index.html", icon: Icon("folder", { size: 18 }) },
    { label: "Admin sample", href: "admin/dashboard.html", icon: Icon("users", { size: 18 }) },
    {
      label: "Theme builder",
      href: "theme-builder.html",
      icon: Icon("palette", { size: 18 }),
      active: active === "theme",
    },
  ];
  return {
    navbar: Navbar({
      id: "tb-topbar",
      brand,
      links: [{ href: "index.html", label: "Catalogue" }, { href: "layouts/index.html", label: "Layouts" }, {
        href: "admin/dashboard.html",
        label: "Admin",
      }],
      actions: Button({
        label: "Dark",
        variant: "outline",
        size: "sm",
        iconStart: Icon("moon", { size: 14 }),
        attrs: { "data-theme-toggle": "" },
      }),
    }),
    sidebar: Sidebar({ id: "tb-sidebar", brand, items, collapsible: true }),
  };
};

function colorRow(c: { token: string; label: string; hint?: string }): Html {
  const id = `tb${c.token.replace(/^--/, "-")}`;
  return html`
    <div class="tb-color" data-tb-color="${c.token}">
      <label class="form-field__label" for="${id}">${c.label}</label>
      <div class="tb-color__row">
        <input class="tb-swatch" type="color" id="${id}" data-tb-token="${c.token}" data-tb-kind="color"
          aria-label="${c.label} colour">${Input({
            id: `${id}-hex`,
            name: `${id}-hex`,
            size: "sm",
            placeholder: "#000000",
            attrs: { "data-tb-hex": c.token, "aria-label": `${c.label} hex`, spellcheck: "false" },
          })}
      </div>
      ${c.hint ? html`<p class="form-field__help">${c.hint}</p>` : ""}
    </div>
  `;
}

function controls(): Html {
  return html`
    <form id="tb-form" class="stack" data-tb-form novalidate>
      ${Segmented({
        id: "tb-scheme",
        name: "scheme",
        legend: "Editing",
        value: "light",
        block: true,
        options: [{ value: "light", label: "Light palette" }, { value: "dark", label: "Dark palette" }],
      })}
      <div class="tb-colors">${COLORS.map(colorRow)}</div>
      ${Slider({ id: "tb-radius", name: "radius", label: "Radius", min: 0, max: 24, step: 1, value: 9, unit: "px" })}
      ${Slider({
        id: "tb-control",
        name: "control",
        label: "Control height",
        min: 28,
        max: 48,
        step: 1,
        value: 36,
        unit: "px",
      })}
      ${Slider({
        id: "tb-type",
        name: "type",
        label: "Base type size",
        min: 13,
        max: 17,
        step: 0.5,
        value: 15,
        unit: "px",
      })}
      ${Slider({
        id: "tb-motion",
        name: "motion",
        label: "Motion",
        min: 0,
        max: 400,
        step: 10,
        value: 200,
        unit: "ms",
      })}
      ${FormField({
        id: "tb-font-base",
        label: "Body font",
        control: Select({
          id: "tb-font-base",
          name: "font-base",
          value: "system",
          options: FONT_OPTIONS,
          searchable: false,
        }),
      })}
      ${FormField({
        id: "tb-font-display",
        label: "Heading font",
        control: Select({
          id: "tb-font-display",
          name: "font-display",
          value: "system",
          options: FONT_OPTIONS,
          searchable: false,
        }),
      })}
      <div class="tb-actions">
        ${Button({ label: "Export theme.css", type: "button", attrs: { "data-tb-export": "" } })}${Button({
          label: "Copy CSS",
          type: "button",
          variant: "outline",
          iconStart: Icon("copy", { size: 14 }),
          attrs: { "data-copy-target": "#tb-css", "data-copy-announce": "Theme CSS copied" },
        })}${Button({ label: "Reset", type: "button", variant: "ghost", attrs: { "data-tb-reset": "" } })}
      </div>
      <textarea id="tb-css" class="input textarea tb-css" rows="12" readonly aria-label="Exported theme CSS"
        spellcheck="false" placeholder="Export writes the changed tokens here, as a theme file."></textarea>
    </form>
  `;
}

type Row = Record<string, unknown> & { id: string; customer: string; status: string; total: string };
const rows: Row[] = [
  { id: "INV-2048", customer: "Northwind Traders", status: "Paid", total: "$12,400.00" },
  { id: "INV-2047", customer: "Contoso Ltd", status: "Open", total: "$3,120.00" },
  { id: "INV-2046", customer: "Fabrikam Inc", status: "Overdue", total: "$18,960.00" },
];

function preview(): Html {
  return html`
    <div class="stack" data-tb-preview>
      <div class="cat-row">
        ${Button({ label: "Primary" })}${Button({ label: "Accent", variant: "accent" })}${Button({
          label: "Outline",
          variant: "outline",
        })}${Button({ label: "Subtle", variant: "subtle" })}${Button({ label: "Danger", variant: "danger" })}
      </div>
      <div class="cat-row">
        ${Badge({ label: "Paid", variant: "success", dot: true })}${Badge({
          label: "Open",
          variant: "info",
          dot: true,
        })}${Badge({ label: "Overdue", variant: "danger", dot: true })}${Badge({ label: "Draft" })}${Badge({
          label: "Accent",
          variant: "accent",
        })}
      </div>
      <div class="form-grid">
        <div class="form-grid__col-6">${FormField({
          id: "tb-prev-email",
          label: "Email",
          control: Input({ id: "tb-prev-email", name: "email", type: "email", placeholder: "ada@acme.com" }),
          help: "We never share it.",
        })}</div>
        <div class="form-grid__col-6">${FormField({
          id: "tb-prev-select",
          label: "Plan",
          control: Select({
            id: "tb-prev-select",
            name: "plan",
            value: "team",
            searchable: false,
            options: [{ value: "starter", label: "Starter" }, { value: "team", label: "Team" }, {
              value: "business",
              label: "Business",
            }],
          }),
        })}</div>
      </div>
      <div class="cat-row">${Switch({ label: "Email notifications", checked: true })}${Switch({
        label: "SMS alerts",
      })}</div>
      ${Alert({
        variant: "info",
        title: "Scheduled maintenance",
        body: "Saturday 02:00–04:00 UTC.",
        dismissible: true,
      })}
      <div class="grid">
        <div class="col-6">${Card({
          body: Stat({
            label: "Monthly revenue",
            value: "$48,290",
            tone: "primary",
            icon: Icon("coin", { size: 20 }),
            trend: { label: "+12.4%", up: true },
            sparkline: [12, 14, 13, 16, 18, 17, 21, 24],
          }),
        })}</div>
        <div class="col-6">${Card({
          body: Stat({
            label: "Churn",
            value: "1.2%",
            tone: "danger",
            icon: Icon("trendDown", { size: 20 }),
            trend: { label: "+0.2%", up: false },
          }),
        })}</div>
      </div>
      ${Tabs({
        id: "tb-prev-tabs",
        items: [
          {
            id: "tb-prev-tab-1",
            label: "General",
            content: html`<p class="text-muted">The look of every tab panel.</p>`,
          },
          { id: "tb-prev-tab-2", label: "Billing", content: html`<p class="text-muted">Second panel.</p>` },
          { id: "tb-prev-tab-3", label: "Team", content: html`<p class="text-muted">Third panel.</p>` },
        ],
      })}
      ${DataTable<Row>({
        id: "tb-prev-table",
        title: "Invoices",
        rowKey: (r) => r.id,
        rows,
        columns: [
          { key: "id", label: "Invoice", mono: true },
          { key: "customer", label: "Customer" },
          {
            key: "status",
            label: "Status",
            render: (r) =>
              Badge({
                label: r.status,
                variant: r.status === "Paid" ? "success" : r.status === "Open" ? "info" : "danger",
                dot: true,
              }),
          },
          { key: "total", label: "Total", numeric: true },
        ],
      })}
    </div>
  `;
}

/** The whole document. */
export function themeBuilderPage(): Html {
  const brand = html`<span class="sidebar__brand-mark">U</span> Catalogue`;
  const { navbar, sidebar } = chrome({ brand, active: "theme" });
  const content = html`
    ${PageHeader({
      title: "Theme builder",
      subtitle:
        "Move a control and every component follows: the tokens are written onto the page as you go. Export writes the ones you changed as a theme file — one stylesheet loaded after the bundle.",
      breadcrumb: Breadcrumb({ items: [{ label: "Catalogue", href: "index.html" }, { label: "Theme builder" }] }),
    })}
    <div class="grid tb-layout">
      <div class="col-5">${Card({ title: "Tokens", body: controls() })}</div>
      <div class="col-7 tb-preview-col">${Card({ title: "Preview", body: preview() })}</div>
    </div>
  `;
  return html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Theme builder — @tundralibs/ui</title>
        <link rel="stylesheet" href="../dist/ui.css">
        <link rel="stylesheet" href="catalogue.css">
        <link rel="stylesheet" href="theme-builder.css">
      </head>
      <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    ${SidebarLayout({ header: navbar, sidebar, sidebarId: "tb-sidebar", content, stickyHeader: true })}
    ${ToastRegion()}${ConfirmModal()}
    <script src="../dist/ui.js"></script>
    <script src="theme-builder.js"></script>
      </body>
    </html>
  `;
}

/** Harness-only layout for the builder — not part of the library. */
export const themeBuilderCss =
  `.tb-colors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3) var(--space-4); }
.tb-color { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.tb-color__row { display: flex; align-items: center; gap: var(--space-2); }
.tb-swatch { flex: 0 0 auto; width: var(--control-height-sm); height: var(--control-height-sm); padding: 0; border: var(--border-width) solid var(--color-border-control); border-radius: var(--radius-sm); background: none; cursor: pointer; }
.tb-swatch::-webkit-color-swatch-wrapper { padding: 2px; }
.tb-swatch::-webkit-color-swatch { border: none; border-radius: calc(var(--radius-sm) - 2px); }
.tb-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.tb-css { font-family: var(--font-family-mono); font-size: var(--font-size-xs); white-space: pre; overflow: auto; }
@media screen and (min-width: 992px) { .tb-preview-col > .card { position: sticky; top: calc(var(--scroll-padding-top) + var(--space-4)); } }
`;

/**
 * The builder's own script: reads the live token values, applies edits
 * through the CSSOM, keeps the state in localStorage and the hash, and
 * writes the export. Harness only.
 */
export const themeBuilderJs = `/* Theme builder (examples/shared/theme-builder.ts). */
(() => {
  const root = document.documentElement;
  const KEY = "ui-theme-builder";
  const FONTS = {
    system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    instrument: '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  };
  const DARK_MEDIA = ':root:not([data-theme="light"]):not([data-theme-default="light"])';
  const DARK_ATTR = ':root[data-theme="dark"],\\n:root[data-theme-default="dark"]:not([data-theme="light"])';
  const RANGES = {
    "tb-radius": { token: "--radius-md", unit: "px", derive: (v) => ({ "--radius-sm": Math.round(v * 0.55) + "px", "--radius-lg": Math.round(v * 1.55) + "px" }) },
    "tb-control": { token: "--control-height-md", unit: "px", derive: (v) => ({ "--control-height-sm": (v - 6) + "px", "--control-height-lg": (v + 8) + "px" }) },
    "tb-type": { token: "--font-size-base", unit: "px", derive: () => ({}) },
    "tb-motion": { token: "--duration-base", unit: "ms", derive: (v) => ({ "--duration-fast": Math.round(v * 0.6) + "ms", "--duration-slow": Math.round(v * 1.6) + "ms", "--duration-enter": Math.round(v * 1.1) + "ms", "--duration-exit": Math.round(v * 0.75) + "ms" }) },
  };
  const FONT_SELECTS = { "tb-font-base": "--font-family-base", "tb-font-display": "--font-family-display" };
  const COLOR_INPUTS = () => Array.from(document.querySelectorAll("[data-tb-kind=color]"));

  /* state: { light: { token: value }, dark: { token: value }, shared: { token: value } } */
  let state = { light: {}, dark: {}, shared: {} };
  const scheme = () => document.querySelector("#tb-scheme input:checked")?.value || "light";

  function load() {
    try {
      const m = location.hash.match(/^#t\\.(.+)$/);
      if (m) return JSON.parse(atob(m[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch { /* a hash that is not ours */ }
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* no storage */ }
    return null;
  }
  function save() {
    const json = JSON.stringify(state);
    try { localStorage.setItem(KEY, json); } catch { /* no storage */ }
    const changed = Object.keys(state.light).length + Object.keys(state.dark).length + Object.keys(state.shared).length;
    const hash = changed ? "#t." + btoa(json).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "") : "";
    if (location.hash !== hash) history.replaceState(null, "", location.pathname + location.search + hash);
  }

  /** Every edited token for the palette on screen, plus the shared ones, onto :root. */
  function apply() {
    const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    const palette = dark ? state.dark : state.light;
    const all = { ...state.shared, ...palette };
    Array.from(root.style).filter((p) => p.startsWith("--")).forEach((p) => { if (!(p in all)) root.style.removeProperty(p); });
    for (const [token, value] of Object.entries(all)) root.style.setProperty(token, value);
    root.dispatchEvent(new CustomEvent("theme:change", { bubbles: true, detail: { theme: root.dataset.theme || "auto" } }));
  }

  const computed = (token) => getComputedStyle(root).getPropertyValue(token).trim();
  /* A probe resolves any colour syntax (hex, rgb(), color-mix()) to rgb() through the engine. */
  const probe = document.createElement("span");
  probe.hidden = true;
  document.body.append(probe);
  const colorHex = (token) => {
    probe.style.color = "var(" + token + ")";
    const m = getComputedStyle(probe).color.match(/\\d+(\\.\\d+)?/g);
    if (!m || m.length < 3) return "#000000";
    return "#" + m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, "0")).join("");
  };
  /* A length/time token in px or ms, whatever unit the sheet used. */
  const numberOf = (value, unit) => {
    const m = value.match(/^(-?[\\d.]+)\\s*([a-z%]*)$/i);
    if (!m) return NaN;
    const n = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    if (unit === "px" && (u === "rem" || u === "em")) return n * 16;
    if (unit === "ms" && u === "s") return n * 1000;
    return n;
  };
  let reflecting = false;

  /** The colour inputs show the palette being edited (set values or the live computed ones). */
  function reflect() {
    const s = scheme();
    const palette = state[s];
    // Read the palette being edited: flip the theme attribute for the measurement only.
    const was = root.dataset.theme;
    root.dataset.theme = s;
    for (const input of COLOR_INPUTS()) {
      const token = input.getAttribute("data-tb-token");
      const hex = palette[token] || colorHex(token);
      input.value = hex;
      const hexField = document.querySelector('[data-tb-hex="' + token + '"]');
      if (hexField && document.activeElement !== hexField) hexField.value = hex;
    }
    if (was) root.dataset.theme = was; else delete root.dataset.theme;
    reflecting = true;
    for (const [id, r] of Object.entries(RANGES)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const v = numberOf(state.shared[r.token] || computed(r.token), r.unit);
      if (!Number.isNaN(v)) {
        el.value = String(v);
        el.dispatchEvent(new Event("input", { bubbles: true })); // slider.js repaints its track + output
      }
    }
    reflecting = false;
  }

  function setColor(token, hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
    state[scheme()][token] = hex.toLowerCase();
    apply(); save();
  }

  function exportCss() {
    const line = ([t, v]) => "  " + t + ": " + v + ";";
    const parts = [];
    const light = { ...state.shared, ...state.light };
    if (Object.keys(light).length) parts.push(":root {\\n" + Object.entries(light).map(line).join("\\n") + "\\n}");
    if (Object.keys(state.dark).length) {
      const body = Object.entries(state.dark).map(line).join("\\n");
      parts.push("@media (prefers-color-scheme: dark) {\\n  " + DARK_MEDIA + " {\\n" + body.replace(/^/gm, "  ") + "\\n  }\\n}");
      parts.push(DARK_ATTR + " {\\n" + body + "\\n}");
    }
    const out = document.getElementById("tb-css");
    out.value = parts.length ? "/* theme.css — load after dist/ui.css */\\n" + parts.join("\\n\\n") + "\\n" : "/* Nothing changed yet. */\\n";
  }

  document.addEventListener("input", (event) => {
    if (reflecting) return;
    const el = event.target;
    if (el.matches?.("[data-tb-kind=color]")) setColor(el.getAttribute("data-tb-token"), el.value);
    else if (el.matches?.("[data-tb-hex]")) {
      const hex = el.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(hex)) {
        setColor(el.getAttribute("data-tb-hex"), hex);
        const sw = document.querySelector('[data-tb-kind=color][data-tb-token="' + el.getAttribute("data-tb-hex") + '"]');
        if (sw) sw.value = hex.toLowerCase();
      }
    } else if (RANGES[el.id]) {
      const r = RANGES[el.id];
      const v = parseFloat(el.value);
      state.shared[r.token] = v + r.unit;
      Object.assign(state.shared, r.derive(v));
      apply(); save();
    }
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (FONT_SELECTS[el.id]) {
      state.shared[FONT_SELECTS[el.id]] = FONTS[el.value] || FONTS.system;
      apply(); save();
    } else if (el.matches?.("#tb-scheme input")) {
      // Editing the dark palette: show it, so the preview is what is being edited.
      root.dataset.theme = el.value;
      apply(); reflect();
    }
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-tb-export]")) exportCss();
    if (event.target.closest?.("[data-tb-reset]")) {
      state = { light: {}, dark: {}, shared: {} };
      Array.from(root.style).filter((p) => p.startsWith("--")).forEach((p) => root.style.removeProperty(p));
      try { localStorage.removeItem(KEY); } catch { /* no storage */ }
      history.replaceState(null, "", location.pathname + location.search);
      apply(); reflect(); exportCss();
      for (const [id] of Object.entries(FONT_SELECTS)) {
        const native = document.getElementById(id + "-native");
        if (native) { native.value = "system"; native.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    }
  });
  root.addEventListener("theme:change", (event) => {
    if (event.target === root && event.detail?.theme !== "auto" && !event.detail?.builder) {
      const picked = document.querySelector('#tb-scheme input[value="' + event.detail.theme + '"]');
      if (picked && !picked.checked) { picked.checked = true; picked.dispatchEvent(new Event("change", { bubbles: true })); }
    }
  });

  const saved = load();
  if (saved && saved.light && saved.dark && saved.shared) state = saved;
  const init = () => {
    // theme-toggle.js may have applied a stored dark preference: edit that palette.
    const darkRadio = document.querySelector('#tb-scheme input[value="dark"]');
    if (darkRadio && root.dataset.theme === "dark") darkRadio.checked = true;
    apply();
    for (const [id, token] of Object.entries(FONT_SELECTS)) {
      const key = Object.keys(FONTS).find((k) => FONTS[k] === state.shared[token]);
      const native = document.getElementById(id + "-native");
      if (native && key) { native.value = key; native.dispatchEvent(new Event("change", { bubbles: true })); }
    }
    reflect();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  addEventListener("load", reflect);
})();
`;
