/**
 * demo/theme-builder.html — live token controls with a preview made of
 * real components, and an export of the changed tokens as a theme file.
 * See examples/shared/theme-builder.ts. Runtime-agnostic via compat.
 */
import { render } from "@tundralibs/rapid/ui";
import { ensureDir, writeTextFile } from "@tundralibs/compat/file";
import { themeBuilderCss, themeBuilderJs, themeBuilderPage } from "../shared/theme-builder.ts";

await ensureDir("demo");
await writeTextFile("demo/theme-builder.html", render(themeBuilderPage()));
await writeTextFile("demo/theme-builder.css", themeBuilderCss);
await writeTextFile("demo/theme-builder.js", themeBuilderJs);
console.log("Built demo/theme-builder.html");
