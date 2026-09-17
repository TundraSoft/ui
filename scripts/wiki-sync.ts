/**
 * Flattens docs/ into a GitHub wiki checkout: every docs/*.md and
 * docs/reference/*.md becomes one wiki page (the wiki namespace is flat,
 * so reference pages keep their `components-button` style names), links
 * between docs are rewritten to wiki page names, links to anything else
 * in the repository become GitHub blob URLs, and Home.md + _Sidebar.md
 * are generated. Fails on a link to a doc page that does not exist, so
 * doc rot is caught here rather than shipped.
 *
 *   deno run -A scripts/wiki-sync.ts --out=wiki --repo=TundraSoft/ui --ref=main
 *
 * Runtime-agnostic via @tundralibs/compat (the workflow runs it on Deno).
 */
import { ensureDir, readDir, readTextFile, writeTextFile } from "@tundralibs/compat/file";
import { exit, getEnv } from "@tundralibs/compat/runtime";

const args = Object.fromEntries(
  (getEnv().WIKI_ARGS ?? "").split(" ").concat(argv()).filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.slice(2).split("=");
    return [k, v.join("=")];
  }),
);
function argv(): string[] {
  // Deno.args / process.argv without touching either global directly.
  const g = globalThis as unknown as { Deno?: { args: string[] }; process?: { argv: string[] } };
  return g.Deno?.args ?? g.process?.argv.slice(2) ?? [];
}
const out = args.out ?? "wiki";
const repo = args.repo ?? "TundraSoft/ui";
const ref = args.ref ?? "main";
const blob = `https://github.com/${repo}/blob/${ref}/`;

type Page = { name: string; source: string; title: string; body: string };
const pages: Page[] = [];

async function collect(dir: string) {
  for await (const e of readDir(dir, { includeDirs: false, exts: [".md"] })) {
    const source = `${dir}/${e.name}`;
    const body = await readTextFile(source);
    const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? e.name.replace(/\.md$/, "");
    pages.push({ name: e.name.replace(/\.md$/, ""), source, title, body });
  }
}
await collect("docs");
await collect("docs/reference");
const names = new Set(pages.map((p) => p.name));
const errors: string[] = [];

/** Rewrite one markdown link target for the wiki. */
function rewrite(target: string, from: Page): string {
  if (/^(https?:|mailto:|#)/.test(target)) return target;
  const [path, hash] = target.split("#");
  const file = path.split("/").pop() ?? "";
  if (file.endsWith(".md")) {
    const name = file.replace(/\.md$/, "");
    if (!names.has(name)) errors.push(`${from.source}: link to missing doc page "${target}"`);
    return hash ? `${name}#${hash}` : name;
  }
  // Something else in the repo (a source file, a folder): deep-link to GitHub.
  const base = from.source.split("/").slice(0, -1);
  for (const seg of path.split("/")) {
    if (seg === "..") base.pop();
    else if (seg !== ".") base.push(seg);
  }
  return blob + base.join("/") + (hash ? `#${hash}` : "");
}

await ensureDir(out);
for (const p of pages) {
  const body = p.body
    .replace(/<!-- GENERATED[^>]*-->\n?/g, "")
    .replace(/\]\(([^)\s]+)\)/g, (_m, t: string) => `](${rewrite(t, p)})`);
  await writeTextFile(`${out}/${p.name}.md`, body);
}

const guides = pages.filter((p) => p.name.startsWith("UI-")).sort((a, b) => a.name.localeCompare(b.name));
const order = ["UI-Getting-Started", "UI-Components", "UI-Layouts", "UI-Rapid", "UI-Theming", "UI-Charts"];
guides.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
const refs = pages.filter((p) => p.source.startsWith("docs/reference/")).sort((a, b) => a.name.localeCompare(b.name));

const home = [
  "# @tundralibs/ui",
  "",
  `Mirrored from [docs/](${blob}docs) on every push to \`${ref}\` — edit there, not here.`,
  "",
  "## Guides",
  "",
  ...guides.map((p) => `- [${p.title}](${p.name})`),
  "",
  "## Reference",
  "",
  "Every export, generated from the sources — see [Reference](Reference).",
  "",
  ...["components", "layouts", "templates", "package"].flatMap((g) => {
    const of = refs.filter((p) => p.name.startsWith(`${g}-`));
    return of.length ? [`### ${g}`, "", ...of.map((p) => `- [${p.name.slice(g.length + 1)}](${p.name})`), ""] : [];
  }),
];
await writeTextFile(`${out}/Home.md`, home.join("\n"));

const sidebar = [
  "**Guides**",
  "",
  ...guides.map((p) => `- [${p.title}](${p.name})`),
  "",
  "**Reference**",
  "",
  "- [Index](Reference)",
  ...["components", "layouts", "templates", "package"].map((g) => `- [${g}](Reference#${g})`),
];
await writeTextFile(`${out}/_Sidebar.md`, sidebar.join("\n"));

console.log(`Wrote ${pages.length + 2} wiki pages to ${out}/`);
if (errors.length) {
  console.log(errors.map((e) => `  - ${e}`).join("\n"));
  exit(1);
}
