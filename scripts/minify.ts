/**
 * Last step of the CSS and JS builds: esbuild's minifier, plus a license
 * banner (the only comment that survives). Sources stay readable in the
 * repo; what ships — and what the version manifest hashes — is minified.
 * esbuild keeps CSS fallback declarations (the `color-mix()` rule) and
 * cascade layers, and leaves the JS IIFEs as they are.
 */
import * as esbuild from "esbuild";

export async function minify(source: string, loader: "css" | "js"): Promise<string> {
  // No version in the banner: version.ts hashes the built files, and the
  // release PR bumps the version without rebuilding — the bytes must not
  // depend on it.
  const banner = "/*! @tundralibs/ui — MIT — https://github.com/TundraSoft/ui */";
  const { code } = await esbuild.transform(source, {
    loader,
    minify: true,
    target: loader === "js" ? ["es2022"] : undefined,
    legalComments: "none",
  });
  await esbuild.stop();
  return `${banner}\n${code}`;
}
