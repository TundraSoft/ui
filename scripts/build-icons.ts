/**
 * Writes dist/icons.svg — the icon set as an SVG sprite of
 * `<symbol id="icon-<name>">`s — so a plain-HTML page that self-hosts the
 * bundle can draw any icon with `<use href="icons.svg#icon-search">`.
 * Runtime-agnostic via @tundralibs/compat.
 */
import { ensureDir, writeTextFile } from "@tundralibs/compat/file";
import { iconNames, spriteSvg } from "../shared/icons.ts";

await ensureDir("dist");
await writeTextFile("dist/icons.svg", spriteSvg());
console.log(`Built dist/icons.svg (${iconNames.length} icons)`);
