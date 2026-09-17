/**
 * styles/index.css → dist/ui.css through PostCSS (imports inlined,
 * mixins expanded, nesting downlevelled — see CLAUDE.md "Styling
 * approach"), then minified (scripts/minify.ts). Runs unchanged under Deno, Node (tsx) and Bun: file
 * access goes through @tundralibs/compat, dependencies are bare
 * specifiers resolved by deno.json (Deno) or package.json (Node/Bun).
 */
import postcss from "postcss";
import postcssImport from "postcss-import";
import postcssMixins from "postcss-mixins";
import postcssNesting from "postcss-nesting";
import { ensureDir, readTextFile, writeTextFile } from "@tundralibs/compat/file";
import { minify } from "./minify.ts";

const entry = "styles/index.css";
const outDir = "dist";
const outFile = `${outDir}/ui.css`;

const input = await readTextFile(entry);

const result = await postcss([
  postcssImport(),
  postcssMixins(),
  postcssNesting(),
]).process(input, { from: entry, to: outFile });

await ensureDir(outDir);
await writeTextFile(outFile, await minify(result.css, "css"));

console.log(`Built ${outFile}`);
