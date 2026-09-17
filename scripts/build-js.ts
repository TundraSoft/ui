/**
 * Concatenates every behaviour script into dist/ui.js: shared/js/*.js
 * first (sorted), then components/<name>/<name>.js for every component
 * that has one (sorted). Each file is an IIFE, so order only matters for
 * the shared helpers loading before anything that relies on them. The
 * concatenation is minified (scripts/minify.ts) before it is written.
 * Runtime-agnostic via @tundralibs/compat.
 */
import { ensureDir, pathExists, readDir, readTextFile, writeTextFile } from "@tundralibs/compat/file";
import { minify } from "./minify.ts";

const outDir = "dist";
const outFile = `${outDir}/ui.js`;

const files: string[] = [];

for await (const entry of readDir("shared/js", { includeDirs: false, exts: [".js"] })) {
  files.push(`shared/js/${entry.name}`);
}
files.sort((a, b) => a.localeCompare(b));

const componentNames: string[] = [];
for await (const entry of readDir("components", { includeFiles: false })) {
  componentNames.push(entry.name);
}
componentNames.sort((a, b) => a.localeCompare(b));

for (const name of componentNames) {
  const behaviorPath = `components/${name}/${name}.js`;
  if (await pathExists(behaviorPath)) files.push(behaviorPath);
}

const chunks = await Promise.all(
  files.map(async (path) => `/* ${path} */\n${await readTextFile(path)}`),
);

await ensureDir(outDir);
await writeTextFile(outFile, await minify(chunks.join("\n"), "js"));
console.log(`Built ${outFile} (${files.length} files)`);
