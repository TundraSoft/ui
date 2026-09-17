import {
  type Html,
  html,
  htmlDocument,
  type RapidCoreData,
  type RapidTemplate,
  type RapidView,
  raw,
  template,
} from "@tundralibs/rapid/ui";
import { ToastRegion } from "../components/toast/toast.ts";
import { renderAttrs } from "../shared/attrs.ts";
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
};

const HISTORY_PATH = "/__rapid/history.js";
const LIVE_PATH = "/__rapid/live.js";

const href = (path: string, view: RapidView): string => path.startsWith("/") ? view.asset(path) : path;

/**
 * Builds the document shell — `Application.initialize({ ui: { core:
 * createCoreTemplate({...}) } })`. Head/meta/viewport, this library's
 * assets (CDN or self-hosted), a skip-link and the toast region.
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

    return htmlDocument({
      lang: options.lang ?? "en",
      title: data.title,
      meta: data.meta,
      head: html`${css}${extraCss.map((s) => html`<link rel="stylesheet" href="${href(s, view)}">`)}${
        options.head ?? ""
      }`,
      // rAPId's swap runtime first (it owns `window.rapid`, which
      // combobox/command call), then this library's behaviours, then
      // the app's own — all deferred, so `<body data-*>` overrides are
      // in place before any of them evaluate.
      body: html`${raw('<a class="skip-link" href="#main-content">Skip to content</a>')}${data.body}${
        options.toastRegion === false ? "" : ToastRegion()
      }<script src="${view.runtimePath}" defer></script>${
        options.history ? html`<script src="${HISTORY_PATH}" defer></script>` : ""
      }${options.live ? html`<script src="${LIVE_PATH}" defer></script>` : ""}${js}${
        extraJs.map((s) =>
          typeof s === "string" ? html`<script src="${href(s, view)}" defer></script>` : html`
            <script src="${href(s.src, view)}" ${renderAttrs({
              integrity: s.integrity,
              crossorigin: s.integrity ? "anonymous" : undefined,
            })} defer></script>
          `
        )
      }`,
    });
  }, "core");
}

/** The zero-config shell: assets from the versioned CDN. */
export const CoreTemplate: RapidTemplate<RapidCoreData> = createCoreTemplate();
