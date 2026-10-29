/**
 * The foundation pages: design tokens, typography, icons, the grid and
 * utility classes, motion, themes and dark mode, and the theme builder.
 * The token pages read tokens/default.css and styles/*.css at build time,
 * so a new token or utility shows up here without an edit. Live values are
 * read back by site.js through getComputedStyle, so a theme or dark-mode
 * switch updates them in place. Swatches and samples paint through classes
 * generated into site.css (`tokenCss`) — never an inline style.
 */
import { type Html, html } from "@tundralibs/rapid/ui";
import { readTextFile } from "@tundralibs/compat/file";
import { Alert } from "../../../components/alert/alert.ts";
import { Button } from "../../../components/button/button.ts";
import { Card } from "../../../components/card/card.ts";
import { CodeBlock } from "../../../components/code/code.ts";
import { Grid, GridCol } from "../../../components/grid/grid.ts";
import { Input } from "../../../components/input/input.ts";
import { Kbd } from "../../../components/kbd/kbd.ts";
import { PageHeader } from "../../../components/page-header/page-header.ts";
import { Prose } from "../../../components/prose/prose.ts";
import { Select } from "../../../components/select/select.ts";
import { Switch } from "../../../components/switch/switch.ts";
import { Icon, iconNames } from "../../../shared/icons.ts";
import { themeBuilderContent } from "../../shared/theme-builder.ts";
import { chips, section } from "./component-page.ts";
import { DENSITIES, THEMES } from "./chrome.ts";
import type { SitePage } from "./nav.ts";

/* ------------------------------------------------------------ tokens */

type Token = { name: string; value: string };

/** The light palette's declarations, in file order (the first `:root` block of tokens/default.css). */
export async function readTokens(): Promise<Token[]> {
  const css = await readTextFile("tokens/default.css");
  const start = css.indexOf(":root {");
  const block = css.slice(start, css.indexOf("\n}", start));
  return [...block.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => ({
    name: m[1]!,
    value: m[2]!.replace(/\s+/g, " ").trim(),
  }));
}

const slug = (token: string) => token.slice(2);
const has = (t: Token, ...prefixes: string[]) => prefixes.some((p) => t.name.startsWith(p));

/** The value cell: the file's value, replaced by the live computed one on the page. */
const liveValue = (t: Token) =>
  html`<code class="site-token__value" data-token-value="${t.name}" title="${t.value}">${t.value}</code>`;

const tokenRow = (t: Token, sample: Html) =>
  html`
    <li class="site-token">
      ${sample}<span class="site-token__meta"><code class="site-token__name">${t.name}</code>${liveValue(t)}</span>
    </li>
  `;

const tokenTable = (tokens: Token[]) =>
  html`
    <div class="site-table-wrap">
      <table class="site-table">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>${tokens.map((t) =>
          html`
            <tr>
              <td><code>${t.name}</code></td>
              <td>${liveValue(t)}</td>
            </tr>
          `
        )}</tbody>
      </table>
    </div>
  `;

/** The classes the samples paint through: one rule per token, all `var()`. */
export function tokenCss(tokens: Token[]): string {
  return tokens.map((t) => {
    const n = slug(t.name);
    if (has(t, "--color-")) return `.tk-${n} { background: var(${t.name}); }`;
    if (has(t, "--space-")) return `.tk-${n} { inline-size: var(${t.name}); }`;
    if (has(t, "--radius-")) return `.tk-${n} { border-radius: var(${t.name}); }`;
    if (/^--shadow-(sm|md|lg|xl)$/.test(t.name)) return `.tk-${n} { box-shadow: var(${t.name}); }`;
    if (has(t, "--font-size-")) return `.tk-${n} { font-size: var(${t.name}); }`;
    if (has(t, "--font-weight-")) return `.tk-${n} { font-weight: var(${t.name}); }`;
    if (has(t, "--font-family-")) return `.tk-${n} { font-family: var(${t.name}); }`;
    if (has(t, "--line-height-")) return `.tk-${n} { line-height: var(${t.name}); }`;
    if (has(t, "--letter-spacing-")) return `.tk-${n} { letter-spacing: var(${t.name}); }`;
    if (has(t, "--ease-")) return `.tk-${n}.is-playing .site-ease__dot { transition-timing-function: var(${t.name}); }`;
    if (has(t, "--duration-")) {
      return `.tk-${n}.is-playing .site-ease__dot { transition-duration: var(${t.name}); }`;
    }
    return "";
  }).filter(Boolean).join("\n");
}

const COLOR_GROUPS: { label: string; test: (n: string) => boolean }[] = [
  { label: "Brand", test: (n) => /^--color-(primary|accent|secondary)/.test(n) },
  { label: "Status", test: (n) => /^--color-(success|warning|danger|info)/.test(n) },
  { label: "Surfaces", test: (n) => /^--color-(canvas|surface)/.test(n) },
  { label: "Text", test: (n) => /^--color-text/.test(n) },
  { label: "Borders", test: (n) => /^--color-border/.test(n) },
  { label: "Other", test: () => true },
];

export function tokensPage(page: SitePage, tokens: Token[]): Html {
  const colors = tokens.filter((t) => has(t, "--color-"));
  const used = new Set<string>();
  const colorGroups = COLOR_GROUPS.map((g) => {
    const list = colors.filter((t) => !used.has(t.name) && g.test(t.name));
    list.forEach((t) => used.add(t.name));
    return { label: g.label, list };
  }).filter((g) => g.list.length);
  const pick = (...p: string[]) => tokens.filter((t) => has(t, ...p));
  const typeTokens = pick("--font-size-");
  const rest = tokens.filter((t) =>
    !has(
      t,
      "--color-",
      "--space-",
      "--radius-",
      "--shadow-",
      "--font-",
      "--line-height-",
      "--letter-spacing-",
      "--duration-",
      "--ease-",
      "--transition-",
    )
  );

  return html`
    ${PageHeader({ title: page.label, subtitle: page.blurb })}
        ${Alert({
          variant: "info",
          title: "Values are live",
          body:
            "Each value is read from the page as it is painted, so switching the theme, dark mode or density in the header updates it. A theme is nothing more than new values for these properties.",
        })}
        ${section(
          "colour",
          "Colour",
          html`${
            colorGroups.map((g) =>
              html`
                <h3 class="site-subtitle">${g.label}</h3>
                <ul class="site-tokens site-tokens--swatches">${g.list.map((t) =>
                  tokenRow(t, html`<span class="site-swatch tk-${slug(t.name)}"></span>`)
                )}</ul>
              `
            )
          }`,
          "Ink and one accent carry the brand; status colours come with a contrast and a soft pair; canvas is the page, surface is a card.",
        )}
        ${section(
          "space",
          "Space",
          html`<ul class="site-tokens">${
            pick("--space-").map((t) => tokenRow(t, html`<span class="site-bar tk-${slug(t.name)}"></span>`))
          }</ul>`,
        )}
        ${section(
          "radius",
          "Radius",
          html`<ul class="site-tokens site-tokens--tiles">${
            pick("--radius-").map((t) => tokenRow(t, html`<span class="site-tile tk-${slug(t.name)}"></span>`))
          }</ul>`,
        )}
        ${section(
          "shadow",
          "Shadow",
          html`<ul class="site-tokens site-tokens--tiles">${
            tokens.filter((t) => /^--shadow-(sm|md|lg|xl)$/.test(t.name)).map((t) =>
              tokenRow(t, html`<span class="site-tile site-tile--raised tk-${slug(t.name)}"></span>`)
            )
          }</ul>`,
          "Two warm-tinted layers built from --shadow-color; dark mode changes the tint, not the shadows.",
        )}
        ${section(
          "type",
          "Type",
          html`<ul class="site-tokens">${
            [
              ...typeTokens,
              ...pick("--font-weight-", "--font-family-", "--line-height-", "--letter-spacing-"),
            ].map((t) => tokenRow(t, html`<span class="site-type-sample tk-${slug(t.name)}">Ag</span>`))
          }</ul>`,
        )}
        ${section("other", "Layout, controls and layers", tokenTable(rest))}
  `;
}

/* -------------------------------------------------------- typography */

export async function typographyPage(page: SitePage, tokens: Token[]): Promise<Html> {
  const css = await readTextFile("styles/typography.css");
  const classes = [...new Set([...css.matchAll(/^\.([a-z0-9-]+)/gm)].map((m) => m[1]!))].sort();
  const sizes = tokens.filter((t) => has(t, "--font-size-")).reverse();
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}
    ${
    section(
      "headings",
      "Headings",
      html`
        <div class="site-specimen">
          <h1>Heading one</h1>
          <h2>Heading two</h2>
          <h3>Heading three</h3>
          <h4>Heading four</h4>
          <h5>Heading five</h5>
          <h6>Heading six</h6>
        </div>
      `,
      html`Headings use <code>--font-family-display</code>; body text uses <code>--font-family-base</code>.`,
    )
  }
    ${
    section(
      "scale",
      "Type scale",
      html`<ul class="site-scale">${
        sizes.map((t) =>
          html`
            <li><span class="tk-${slug(t.name)}">The quick brown fox</span><code>${t.name}</code></li>
          `
        )
      }</ul>`,
    )
  }
    ${
    section(
      "text",
      "Text utilities",
      html`
        <ul class="site-tokens">${classes.map((c) =>
          html`
            <li
              class="site-token"><span class="${c === "link" ? "" : c}">${c === "link"
                ? html`<a class="link" href="#text">A link</a>`
                : "Sample text 0123"}</span><span class="site-token__meta"><code>.${c}</code></span></li>
          `
        )}</ul>
      `,
    )
  }
    ${
    section(
      "prose",
      "Prose",
      Card({
        body: Prose({
          measure: true,
          content: html`
            <h2>Writing that someone else marked up</h2>
            <p>
              A Markdown preview, a help article or a CMS body arrives as bare elements. Wrap it in <code>Prose</code>
              and it gets <a href="#prose">links</a>, <strong>emphasis</strong>, lists and quotes in the library's
              rhythm.
            </p>
            <ul>
              <li>Lists keep their bullets inside prose.</li>
              <li>Nested <em>inline</em> styles stay readable.</li>
            </ul>
            <blockquote>A quote sits on the accent rule.</blockquote>
            <p>Press ${Kbd({ keys: ["⌘", "K"] })} to open a palette.</p>
          `,
        }),
      }),
    )
  }`;
}

/* ------------------------------------------------------------- icons */

export function iconsPage(page: SitePage): Html {
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}
    ${
    section(
      "set",
      `The set — ${iconNames.length} icons`,
      html`<ul class="site-icons">${
        iconNames.map((name) =>
          html`<li class="site-icon">${Icon(name, { size: 24 })}<code class="text-2xs">${name}</code></li>`
        )
      }</ul>`,
      "Stroke-based, currentColor, drawn from primitive shapes only — they take the colour and size of their context.",
    )
  }
    ${
    section(
      "use",
      "Using them",
      Grid({
        items: [
          GridCol({
            span: 6,
            content: CodeBlock({
              title: "In a template",
              language: "ts",
              code:
                `import { Icon } from "@tundralibs/ui/shared/icons";\n\nIcon("search", { size: 16 });\nButton({ label: "Search", iconStart: Icon("search") });`,
            }),
          }),
          GridCol({
            span: 6,
            content: CodeBlock({
              title: "In plain HTML",
              language: "html",
              code:
                `<!-- dist/icons.svg, same origin -->\n<svg class="icon" width="16" height="16" aria-hidden="true">\n  <use href="/ui/icons.svg#icon-search"></use>\n</svg>`,
            }),
          }),
        ],
      }),
    )
  }`;
}

/* --------------------------------------------------------- utilities */

export async function utilitiesPage(page: SitePage): Promise<Html> {
  const css = await readTextFile("styles/utilities.css");
  const parts = css.split(/\/\* -+ ([a-z ]+) \*\//).slice(1);
  const groups: { label: string; classes: string[] }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const classes = [...new Set([...parts[i + 1]!.matchAll(/^\s*\.([a-z0-9-]+)/gm)].map((m) => `.${m[1]}`))];
    groups.push({ label: parts[i]!.trim(), classes });
  }
  const cell = (label: string) => html`<div class="site-cell">${label}</div>`;
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}
    ${
    section(
      "grid",
      "Grid",
      html`
        <h3 class="site-subtitle">Fixed spans (from 768px)</h3>
        ${Grid({ items: [3, 3, 6, 4, 8, 12].map((n) => GridCol({ span: n as 3, content: cell(`span ${n}`) })) })}
        <h3 class="site-subtitle">A span per breakpoint</h3>
        ${Grid({
          gap: "sm",
          items: Array.from(
            { length: 4 },
            (_, i) => GridCol({ span: { xs: 12, sm: 6, lg: 3 }, content: cell(`xs 12 · sm 6 · lg 3 (#${i + 1})`) }),
          ),
        })}
        <h3 class="site-subtitle">Two-up on a phone, gap scale</h3>
        ${Grid({
          phoneColumns: "2",
          gap: "lg",
          items: Array.from({ length: 4 }, (_, i) => GridCol({ span: 3, content: cell(`tile ${i + 1}`) })),
        })}
      `,
      "Twelve minmax(0, 1fr) tracks; resize the window to watch the breakpoints (sm 576, md 768, lg 992, xl 1400).",
    )
  }
    ${
    section(
      "compose",
      "Composing with utilities",
      html`
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 p-4 border rounded-md bg-surface">
          <div class="d-flex align-items-center gap-2"><span class="site-dot"></span><strong>d-flex · gap-3 · p-4</strong></div>
          <div class="d-flex gap-2">${Button({ label: "Cancel", variant: "outline", size: "sm" })}${Button({
            label: "Save",
            size: "sm",
          })}</div>
        </div>
        <p class="mt-3 text-muted text-sm">
          <span class="hide-md">Shown below 768px (<code>.hide-md-up</code> twin hidden).</span><span class="hide-md-up"
          >Hidden below 768px with <code>.hide-md</code>.</span>
        </p>
      `,
      "Bootstrap-shaped names, token values, in their own cascade layer after components — so a utility beats a component rule and a theme beats both.",
    )
  }
    ${
    section(
      "classes",
      "Every utility class",
      html`${
        groups.map((g) =>
          html`
            <h3 class="site-subtitle">${g.label[0]!.toUpperCase()}${g.label.slice(
              1,
            )} <span class="text-muted text-sm">${String(
              g.classes.length,
            )}</span></h3>${chips(g.classes)}
          `
        )
      }`,
    )
  }`;
}

/* ------------------------------------------------------------ motion */

const KEYFRAMES = [
  "ui-float-in",
  "ui-float-up-in",
  "ui-scale-in",
  "ui-rise-in",
  "ui-fade-in",
  "ui-slide-in-start",
  "ui-slide-in-end",
  "ui-drop-in",
  "ui-slide-in-bottom",
  "ui-reveal",
] as const;

export async function motionKeyframes(): Promise<string[]> {
  const css = await readTextFile("styles/motion.css");
  const names = [...css.matchAll(/@keyframes ([a-z-]+)/g)].map((m) => m[1]!);
  return KEYFRAMES.filter((k) => names.includes(k));
}

export function motionPage(page: SitePage, tokens: Token[], keyframes: string[]): Html {
  const durations = tokens.filter((t) => has(t, "--duration-"));
  const eases = tokens.filter((t) => has(t, "--ease-"));
  const lane = (t: Token) =>
    html`
      <li class="site-ease tk-${slug(t.name)}" data-motion-lane>
        <span class="site-ease__track"><span class="site-ease__dot"></span></span>
        <span class="site-token__meta"><code>${t.name}</code>${liveValue(t)}</span>
      </li>
    `;
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}
    ${
    Alert({
      variant: "neutral",
      title: "Reduced motion",
      body:
        "With prefers-reduced-motion: reduce every animation here is off, panels appear at once and scroll effects stay still — spinners keep turning, slowly, because a frozen ring is not a loading state.",
    })
  }
    ${
    section(
      "curves",
      "Durations and easings",
      html`
        <div class="d-flex gap-2 mb-3">${Button({
          label: "Play",
          iconStart: Icon("play", { size: 14 }),
          attrs: { "data-motion-lanes": "" },
        })}</div>
        <h3 class="site-subtitle">Durations (on --ease-out)</h3>
        <ul class="site-eases">${durations.map(lane)}</ul>
        <h3 class="site-subtitle">Easings (over --duration-slow)</h3>
        <ul class="site-eases">${eases.map(lane)}</ul>
      `,
    )
  }
    ${
    section(
      "keyframes",
      "Shared keyframes",
      html`<div class="site-motion-grid">${
        keyframes.map((k) =>
          html`
            <div class="site-motion">
              <div class="site-motion__stage"><div class="site-motion__box" id="motion-${k}"></div></div>
              ${Button({
                label: k,
                variant: "outline",
                size: "sm",
                attrs: { "data-motion-play": k, "data-motion-target": `#motion-${k}` },
              })}
            </div>
          `
        )
      }</div>`,
      html`
        Showing is free — clearing <code>hidden</code> starts a panel's <code>*-in</code> keyframes. Hiding goes through <code
        >uiMotion.exit(el, done)</code>, which plays the <code>*-out</code> pair and then runs <code>done</code>.
      `,
    )
  }`;
}

/* ----------------------------------------------------------- theming */

export function themingPage(page: SitePage): Html {
  const densityDemo = (d: string, label: string) =>
    html`
      <div class="site-density" data-density="${d}">
        <p class="site-density__label">${label}</p>
        ${Input({ id: `density-${d}`, placeholder: "Search…", attrs: { "aria-label": `${label} input` } })}
        ${Select({
          id: `density-${d}-select`,
          searchable: false,
          options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }],
          attrs: { "aria-label": `${label} select` },
        })}
        <div class="d-flex gap-2">${Button({ label: "Save" })}${Button({ label: "Cancel", variant: "outline" })}</div>
      </div>
    `;
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}
    ${
    section(
      "themes",
      "Sample themes",
      Grid({
        items: THEMES.map((t) =>
          GridCol({
            span: { xs: 12, sm: 6, lg: 4 },
            content: Card({
              title: t.label,
              subtitle: t.id ? `examples/themes/${t.id}.css` : "tokens/default.css only",
              body: html`<p>${t.blurb}</p>`,
              footer: Button({
                label: "Apply",
                variant: "outline",
                size: "sm",
                attrs: { "data-site-apply-theme": t.id || "base", "aria-pressed": t.id ? "false" : "true" },
              }),
            }),
          })
        ),
      }),
      "A theme is one stylesheet loaded after the bundle: new token values, optionally its own partials outside any layer. The header switch applies one to the whole site.",
    )
  }
    ${
    section(
      "dark",
      "Dark mode",
      html`
        <div
          class="d-flex flex-wrap align-items-center gap-3 mb-3">${Button({
            label: "Toggle dark mode",
            iconStart: Icon("moon", { size: 14 }),
            attrs: { "data-theme-toggle": "" },
          })}<span class="text-muted">Current: <strong data-site-mode>light</strong></span></div>
        ${CodeBlock({
          title: "A theme's two dark blocks",
          language: "css",
          code: `:root { --color-canvas: #fafaf7; /* light */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme-default="light"]) {
    --color-canvas: #141311;
  }
}

:root[data-theme="dark"],
:root[data-theme-default="dark"]:not([data-theme="light"]) {
  --color-canvas: #141311;
}`,
        })}
      `,
      html`
        Dark mode is a token capability: the system preference applies until someone chooses, an explicit <code
        >data-theme</code> wins either way, and <code>data-theme-default</code> on <code>&lt;html&gt;</code> sets the site's own default.
      `,
    )
  }
    ${
    section(
      "density",
      "Density",
      html`<div class="site-densities">${DENSITIES.map((d) => densityDemo(d.id, d.label))}</div>`,
      html`<code>data-density</code> on any ancestor rescales the control heights inside it (0.85 / 1 / 1.15). The header sets it on the whole page.`,
    )
  }
    ${
    section(
      "switches",
      "Per-viewer preferences",
      html`<div class="d-flex flex-column gap-3">${
        Switch({
          id: "pref-motion",
          label: "This page respects prefers-reduced-motion",
          checked: true,
          disabled: true,
          hint: "There is no switch to override it — the operating system setting decides.",
        })
      }</div>`,
    )
  }`;
}

/* ------------------------------------------------------ theme builder */

export function themeBuilderPage(page: SitePage): Html {
  return html`${PageHeader({ title: page.label, subtitle: page.blurb })}${themeBuilderContent()}`;
}
