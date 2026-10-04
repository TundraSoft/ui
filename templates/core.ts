import {
  type Html,
  html,
  type RapidCoreData,
  type RapidTemplate,
  type RapidView,
  raw,
  template,
} from "@tundralibs/rapid/ui";
import { ConfirmModal } from "../components/modal/modal.ts";
import { ToastRegion } from "../components/toast/toast.ts";
import { type Attrs, renderAttrs } from "../shared/attrs.ts";
import { UI_CSS, UI_JS } from "../version.ts";

/**
 * Where the document shell loads `ui.css` / `ui.js` from.
 *
 * - `"cdn"` (default): the versioned jsDelivr URLs from version.ts, with
 *   subresource integrity — zero setup, one fewer thing to serve.
 * - A URL prefix such as `"/ui"`: self-hosted. The app mounts the
 *   package's `dist/` there (`server.static: { "/ui": { root, fingerprint:
 *   true } }`, see `copyUiAssets()` in `@tundralibs/ui/assets`) and every
 *   URL goes through `view.asset()` for cache-busting (§8).
 */
export type CoreAssets = "cdn" | `/${string}`;

/**
 * Attributes for `<html>` or `<body>`: fixed, or worked out per request
 * from the page's data and the view bag — a theme the person chose
 * (`data-theme` on `<html>`, so the first paint is already right), the
 * runtime's `<body data-*>` overrides, a page class.
 */
export type DocumentAttrs = Attrs | ((data: RapidCoreData, view: RapidView) => Attrs);

export type CoreOptions = {
  assets?: CoreAssets;
  /** `<html lang>`. @default "en" */
  lang?: string;
  /**
   * Extra stylesheets after ui.css — a theme override file, fonts. A
   * path starting with `/` is passed through `view.asset()`; anything
   * else (a full URL) is used verbatim.
   */
  stylesheets?: readonly string[];
  /**
   * Extra scripts after ui.js, same path rules as `stylesheets`. An
   * object form carries a subresource-integrity hash for a third-party
   * CDN script (e.g. `APEXCHARTS` from `@tundralibs/ui/chart`).
   */
  scripts?: readonly (string | { src: string; integrity?: string })[];
  /** Extra `<head>` markup (preconnects, icons) — constant, not per-request. */
  head?: Html;
  /** Render the shared `ToastRegion` every page gets. @default true */
  toastRegion?: boolean;
  /**
   * Also load rAPId's opt-in history module (`/__rapid/history.js`) —
   * pair with `ui: { history: true }`. @default false
   */
  history?: boolean;
  /** Also load rAPId's live bridge (`/__rapid/live.js`) — pair with `ui: { live: true }`. @default false */
  live?: boolean;
  /**
   * The viewport meta's content — `"width=device-width, initial-scale=1,
   * viewport-fit=cover"` for a layout that reads `env(safe-area-inset-*)`.
   * @default "width=device-width, initial-scale=1"
   */
  viewport?: string;
  /** Attributes on `<html>` (besides `lang`), see {@link DocumentAttrs}. */
  htmlAttrs?: DocumentAttrs;
  /** Attributes on `<body>`, see {@link DocumentAttrs}. */
  bodyAttrs?: DocumentAttrs;
  /**
   * Render the page's `ConfirmModal`, which every `data-confirm` trigger
   * asks in (without it modal.js uses the browser's `confirm()`).
   * @default true
   */
  confirmDialog?: boolean;
};

const HISTORY_PATH = "/__rapid/history.js";
const LIVE_PATH = "/__rapid/live.js";

const href = (path: string, view: RapidView): string => path.startsWith("/") ? view.asset(path) : path;

const resolve = (attrs: DocumentAttrs | undefined, data: RapidCoreData, view: RapidView): Attrs =>
  typeof attrs === "function" ? attrs(data, view) : attrs ?? {};

/**
 * Per-page metadata, as rAPId's `htmlDocument` writes it: `canonical` a
 * `<link rel="canonical">`, an `og:` / `twitter:` key a `<meta property>`,
 * any other key a `<meta name>` — every value escaped.
 */
function pageMeta(meta: Readonly<Record<string, string>> | undefined): Html[] {
  return Object.entries(meta ?? {}).map(([key, value]) =>
    key === "canonical"
      ? html`
        <link rel="canonical" ${renderAttrs({ href: value })}>
      `
      : key.startsWith("og:") || key.startsWith("twitter:")
      ? html`<meta${renderAttrs({ property: key, content: value })}>`
      : html`<meta${renderAttrs({ name: key, content: value })}>`
  );
}

/**
 * The document: rAPId's `htmlDocument` preamble (doctype, `lang`, charset,
 * viewport, title, page meta) plus what it has no hook for — attributes
 * on `<html>` and `<body>` and a configurable viewport. Built from short
 * constant pieces and escaped interpolations only.
 */
function htmlPage(p: {
  lang: string;
  title?: string;
  meta?: Readonly<Record<string, string>>;
  viewport: string;
  htmlAttrs: Attrs;
  bodyAttrs: Attrs;
  head: Html;
  body: Html;
}): Html {
  const { lang: _ignored, ...htmlRest } = p.htmlAttrs;
  return html`${raw("<!doctype html>")}<html${renderAttrs({ lang: p.lang, ...htmlRest })}>${
    raw('<head><meta charset="utf-8">')
  }<meta name="viewport"${renderAttrs({ content: p.viewport })}><title>${p.title ?? ""}</title>${
    pageMeta(p.meta)
  }${p.head}${raw("</head>")}<body${renderAttrs(p.bodyAttrs)}>${p.body}${raw("</body></html>")}`;
}

/**
 * Builds the document shell — `Application.initialize({ ui: { core:
 * createCoreTemplate({...}) } })`. Head/meta/viewport, this library's
 * assets (CDN or self-hosted), a skip-link, the toast region and the
 * confirmation dialog; `htmlAttrs` / `bodyAttrs` / `viewport` reach the
 * parts rAPId's `htmlDocument` keeps fixed.
 */
export function createCoreTemplate(options: CoreOptions = {}): RapidTemplate<RapidCoreData> {
  const assets = options.assets ?? "cdn";
  const prefix = assets === "cdn" ? "" : assets.replace(/\/$/, "");
  const extraCss = options.stylesheets ?? [];
  const extraJs = options.scripts ?? [];

  return template<RapidCoreData>((data, view) => {
    const css = assets === "cdn"
      ? html`<link rel="stylesheet" href="${UI_CSS.url}" integrity="${UI_CSS.integrity}" crossorigin="anonymous">`
      : html`<link rel="stylesheet" href="${view.asset(`${prefix}/${UI_CSS.file}`)}">`;
    const js = assets === "cdn"
      ? html`<script src="${UI_JS.url}" integrity="${UI_JS.integrity}" crossorigin="anonymous" defer></script>`
      : html`<script src="${view.asset(`${prefix}/${UI_JS.file}`)}" defer></script>`;

    return htmlPage({
      lang: options.lang ?? "en",
      title: data.title,
      meta: data.meta,
      viewport: options.viewport ?? "width=device-width, initial-scale=1",
      htmlAttrs: resolve(options.htmlAttrs, data, view),
      bodyAttrs: resolve(options.bodyAttrs, data, view),
      head: html`${css}${extraCss.map((s) => html`<link rel="stylesheet" href="${href(s, view)}">`)}${
        options.head ?? ""
      }`,
      // rAPId's swap runtime first (it owns `window.rapid`, which
      // combobox/command call), then this library's behaviours, then
      // the app's own — all deferred, so `<body data-*>` overrides are
      // in place before any of them evaluate.
      body: html`
        ${raw('<a class="skip-link" href="#main-content">Skip to content</a>')}${data
          .body}${options.toastRegion === false ? "" : ToastRegion()}${options.confirmDialog === false
          ? ""
          : ConfirmModal()}<script src="${view.runtimePath}"
          defer></script>${options.history ? html`<script src="${HISTORY_PATH}" defer></script>` : ""}${options.live
            ? html`<script src="${LIVE_PATH}" defer></script>`
            : ""}${js}${extraJs.map((s) =>
              typeof s === "string" ? html`<script src="${href(s, view)}" defer></script>` : html`
                <script src="${href(s.src, view)}" ${renderAttrs({
                  integrity: s.integrity,
                  crossorigin: s.integrity ? "anonymous" : undefined,
                })} defer></script>
              `
            )}
      `,
    });
  }, "core");
}

/** The zero-config shell: assets from the versioned CDN. */
export const CoreTemplate: RapidTemplate<RapidCoreData> = createCoreTemplate();
