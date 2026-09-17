/**
 * Self-hosting helpers for the compiled bundle (`dist/ui.css`,
 * `dist/ui.js`). The default core template loads both from the versioned
 * CDN; an app that wants to serve them itself (air-gapped, strict CSP
 * allow-list, no third-party origins) copies them into its own static
 * directory once at boot and points the core at that mount:
 *
 * ```ts ignore
 * import { copyUiAssets } from "@tundralibs/ui/assets";
 * import { createCoreTemplate } from "@tundralibs/ui/templates/core";
 *
 * await copyUiAssets("./static/ui");
 * const app = await Application.initialize({
 *   name: "my-app",
 *   server: { static: { "/ui": { root: "./static/ui", fingerprint: true } } },
 *   ui: { core: createCoreTemplate({ assets: "/ui" }) },
 * });
 * ```
 *
 * Works however the package was installed: from a local checkout or npm
 * (`file:` URLs — read from disk) or from JSR under Deno (`https:` URLs —
 * fetched from the module cache). Runtime-agnostic via @tundralibs/compat.
 */
import { ensureDir, readFile, writeFile } from "@tundralibs/compat/file";
import { UI_ASSETS, type UiAsset } from "./version.ts";

export type { UiAsset };

/** Resolved location of one distributable, as a URL string (`file:` or `https:`). */
export function uiAssetUrl(asset: UiAsset): string {
  return import.meta.resolve(`./dist/${asset.file}`);
}

/**
 * Absolute path of the package's `dist/` directory when it is on disk
 * (local checkout, npm install), else `undefined` (JSR under Deno serves
 * modules from its cache — use `copyUiAssets()` there).
 */
export function uiAssetsDir(): string | undefined {
  // Resolve a concrete file, never the directory: Node's resolver (tsx
  // included) turns `./dist/` into `dist/index.ts`, Deno keeps the slash.
  const url = new URL(uiAssetUrl(UI_ASSETS[0]));
  if (url.protocol !== "file:") return undefined;
  const path = filePath(url);
  return path.slice(0, path.lastIndexOf("/"));
}

/** `file:` URL → OS path (`file:///C:/x` → `C:/x` on Windows). */
function filePath(url: URL): string {
  const path = decodeURIComponent(url.pathname);
  return /^\/[A-Za-z]:\//.test(path) ? path.slice(1) : path;
}

async function readAsset(asset: UiAsset): Promise<Uint8Array> {
  const url = new URL(uiAssetUrl(asset));
  if (url.protocol === "file:") return await readFile(filePath(url));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Copies `ui.css` and `ui.js` into `toDir` (created if missing) and
 * returns the files written. Idempotent — call it at every boot.
 */
export async function copyUiAssets(toDir: string): Promise<string[]> {
  await ensureDir(toDir);
  const dir = toDir.replace(/\/$/, "");
  const written: string[] = [];
  for (const asset of UI_ASSETS) {
    const target = `${dir}/${asset.file}`;
    await writeFile(target, await readAsset(asset));
    written.push(target);
  }
  return written;
}
