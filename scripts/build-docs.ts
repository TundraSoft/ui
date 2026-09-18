/**
 * Generates docs/reference/*.md — one page per component, layout and
 * template module — from `deno doc --json` output (.docs-api.json, written
 * by the `docs` task) plus the module's own CSS and JS: every exported
 * function with its signature and JSDoc, every exported type with its
 * properties (JSDoc per prop) or union members, constants, the CSS class
 * hooks a theme can target, and the data-* attributes / events the
 * behaviour script uses. Committed, and checked for drift in CI, so the
 * reference can never lag the code.
 *
 * Runtime-agnostic via @tundralibs/compat (the `deno doc` step itself is
 * Deno-only — it is the one dev tool that needs Deno; the generated files
 * are what ship).
 */
import { ensureDir, pathExists, readTextFile, writeTextFile } from "@tundralibs/compat/file";
import { render } from "@tundralibs/rapid/ui";
import { usage } from "../examples/docs/usage.ts";
import { prettyHtml } from "../examples/docs/pretty-html.ts";

type TsType = { repr?: string; kind?: string; value?: unknown };
type JsDoc = { doc?: string };
type Prop = { name: string; optional?: boolean; tsType?: TsType; jsDoc?: JsDoc };
type Param = { kind: string; name?: string; optional?: boolean; tsType?: TsType; left?: Param };
type Decl = {
  kind: string;
  declarationKind?: string;
  jsDoc?: JsDoc;
  def?: {
    tsType?: TsType;
    typeParams?: { name: string }[];
    params?: Param[];
    returnType?: TsType;
    kind?: string;
  };
};
type Symbol = { name: string; declarations: Decl[] };
type Api = { nodes: Record<string, { symbols: Symbol[] }> };

const api = JSON.parse(await readTextFile(".docs-api.json")) as Api;
const files = Object.keys(api.nodes);
const rootUrl = (() => {
  const f = files.find((k) => k.includes("/components/")) ?? files[0] ?? "";
  return f.slice(0, f.indexOf("/components/"));
})();
const rel = (fileUrl: string) => fileUrl.replace(rootUrl + "/", "");
const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
const code = (s: string) => `\`${s.replace(/`/g, "'")}\``;

// deno-lint-ignore no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;

function typeRepr(t?: TsType): string {
  if (!t) return "unknown";
  if (t.repr && ANSI.test(t.repr)) return t.repr.replace(ANSI, "");
  if (t.kind === "union" && Array.isArray(t.value)) return (t.value as TsType[]).map(typeRepr).join(" | ");
  if (t.kind === "intersection" && Array.isArray(t.value)) return (t.value as TsType[]).map(typeRepr).join(" & ");
  if (t.kind === "typeLiteral") {
    const props = (t.value as { properties?: Prop[] })?.properties ?? [];
    return `{ ${props.map((p) => `${p.name}${p.optional ? "?" : ""}: ${typeRepr(p.tsType)}`).join("; ")} }`;
  }
  if (t.kind === "array") return `${typeRepr(t.value as TsType)}[]`;
  if (t.kind === "fnOrConstructor") {
    const f = t.value as { params?: Param[]; tsType?: TsType };
    return `(${(f.params ?? []).map((p) => `${paramName(p)}: ${typeRepr(p.tsType)}`).join(", ")}) => ${
      typeRepr(f.tsType)
    }`;
  }
  if (t.kind === "parenthesized") return `(${typeRepr(t.value as TsType)})`;
  if (t.kind === "literal" && t.repr !== undefined) return JSON.stringify(t.repr);
  if (t.repr) return t.repr;
  return t.kind ?? "unknown";
}

/** Properties of a type literal, or of every literal member of an intersection. */
function propsOf(t?: TsType): { props: Prop[]; extends: string[] } {
  if (!t) return { props: [], extends: [] };
  if (t.kind === "typeLiteral") return { props: (t.value as { properties?: Prop[] })?.properties ?? [], extends: [] };
  if (t.kind === "intersection" && Array.isArray(t.value)) {
    const out = { props: [] as Prop[], extends: [] as string[] };
    for (const m of t.value as TsType[]) {
      if (m.kind === "typeLiteral") out.props.push(...propsOf(m).props);
      else out.extends.push(typeRepr(m));
    }
    return out;
  }
  return { props: [], extends: [] };
}

function paramName(p: Param): string {
  if (p.kind === "identifier") return p.name ?? "arg";
  if (p.kind === "assign" && p.left) return `${paramName(p.left)} = …`;
  if (p.kind === "object") return "{ … }";
  if (p.kind === "array") return "[ … ]";
  return p.name ?? "arg";
}

function signature(name: string, d: Decl): string {
  const f = d.def ?? {};
  const tp = f.typeParams?.length ? `<${f.typeParams.map((t) => t.name).join(", ")}>` : "";
  const params = (f.params ?? []).map((p) => {
    const t = p.kind === "assign" && p.left ? p.left.tsType : p.tsType;
    return `${paramName(p)}${p.optional ? "?" : ""}: ${typeRepr(t)}`;
  }).join(", ");
  return `${name}${tp}(${params}): ${typeRepr(f.returnType)}`;
}

function propsTable(props: Prop[]): string {
  const rows = props.map((p) =>
    `| ${code(p.name)} | ${code(typeRepr(p.tsType))} | ${p.optional ? "" : "yes"} | ${esc(p.jsDoc?.doc ?? "")} |`
  );
  return ["| Prop | Type | Required | Description |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

/** CSS class hooks: every class selector the stylesheet defines. */
/**
 * The examples' own source, in file order: `Function.toString()` would
 * hand back Deno's re-emitted JavaScript (types and formatting gone), so
 * the snippets are cut from examples/docs/usage.ts as written — every
 * `render: () =>` arrow body, found by bracket balance, strings and
 * template literals respected.
 */
const usageSource = await readTextFile("examples/docs/usage.ts");
const snippets: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  const keys = [...usageSource.matchAll(/^  "((?:components|layouts)\/[a-z-]+)": \[/gm)].map((m) => ({
    key: m[1]!,
    at: m.index!,
  }));
  const marker = "render: () =>";
  let from = 0;
  while (true) {
    const at = usageSource.indexOf(marker, from);
    if (at < 0) break;
    const key = keys.filter((k) => k.at < at).pop()?.key ?? "";
    let i = at + marker.length;
    while (/\s/.test(usageSource[i]!)) i++;
    const begin = i;
    // Walk to the end of the expression: the first `,` or `}` at depth 0.
    const stack: string[] = []; // open brackets and quote kinds
    while (i < usageSource.length) {
      const ch = usageSource[i]!;
      const top = stack[stack.length - 1];
      if (top === '"' || top === "'") {
        if (ch === "\\") i++;
        else if (ch === top) stack.pop();
      } else if (top === "`") {
        if (ch === "\\") i++;
        else if (ch === "`") stack.pop();
        else if (ch === "$" && usageSource[i + 1] === "{") {
          stack.push("{");
          i++;
        }
      } else {
        if (ch === '"' || ch === "'" || ch === "`") stack.push(ch);
        else if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
        else if (ch === ")" || ch === "]" || ch === "}") {
          if (!stack.length) break; // the closing brace of the example object
          stack.pop();
        } else if (ch === "," && !stack.length) break;
      }
      i++;
    }
    (out[key] ??= []).push(dedentBody(usageSource.slice(begin, i).trim()));
    from = i;
  }
  return out;
})();

function dedentBody(src: string): string {
  if (src.startsWith("{") && src.endsWith("}")) src = src.slice(1, -1).replace(/^\n|\n\s*$/g, "");
  const lines = src.split("\n");
  const rest = lines.slice(1).filter((l) => l.trim());
  const n = rest.length ? Math.min(...rest.map((l) => l.match(/^\s*/)![0].length)) : 0;
  return [lines[0]!.trim(), ...lines.slice(1).map((l) => l.slice(n))].join("\n");
}
async function cssHooks(path: string): Promise<string[]> {
  if (!(await pathExists(path))) return [];
  const css = await readTextFile(path);
  const out = new Set<string>();
  for (const m of css.matchAll(/(?:^|[\s,>+~(])\.([a-z][a-z0-9_-]*)/gm)) out.add(m[1]);
  return [...out].sort();
}

/** Behaviour hooks: data-* attributes and custom events the script reads or fires. */
async function jsHooks(path: string): Promise<{ attrs: string[]; events: string[] }> {
  if (!(await pathExists(path))) return { attrs: [], events: [] };
  const js = await readTextFile(path);
  const attrs = new Set<string>();
  for (const m of js.matchAll(/data-[a-z][a-z0-9-]*/g)) attrs.add(m[0]);
  const events = new Set<string>();
  for (const m of js.matchAll(/["'`]([a-z]+:[a-z-]+)["'`]/g)) events.add(m[1]);
  return { attrs: [...attrs].sort(), events: [...events].sort() };
}

type Entry = { name: string; decl: Decl };
type Module = {
  id: string;
  file: string;
  entries: Entry[];
  css?: string;
  js?: string;
  group: "components" | "layouts" | "templates" | "package";
};

const modules: Module[] = [];
for (const [fileUrl, { symbols }] of Object.entries(api.nodes)) {
  const file = rel(fileUrl);
  const entries: Entry[] = [];
  for (const s of symbols) {
    for (const d of s.declarations) {
      if (d.declarationKind === "export" && ["function", "typeAlias", "variable"].includes(d.kind)) {
        entries.push({ name: s.name, decl: d });
      }
    }
  }
  if (!entries.length) continue;
  const m = file.match(/^(components|layouts)\/([a-z-]+)\/[a-z-]+\.ts$/);
  if (m) {
    modules.push({
      id: m[2],
      file,
      entries,
      css: `${m[1]}/${m[2]}/${m[2]}.css`,
      js: `${m[1]}/${m[2]}/${m[2]}.js`,
      group: m[1] as Module["group"],
    });
  } else if (/^layouts\/mod\.ts$/.test(file)) {
    continue; // the barrel re-exports what the per-layout pages document
  } else if (/^templates\/[a-z]+\.ts$/.test(file)) {
    modules.push({ id: file.replace(/^templates\/|\.ts$/g, ""), file, entries, group: "templates" });
  } else if (/^(assets|version)\.ts$/.test(file) || /^shared\/[a-z]+\.ts$/.test(file)) {
    modules.push({ id: file.replace(/\.ts$/, "").replace("/", "-"), file, entries, group: "package" });
  }
}
modules.sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id));

const exportPath = (m: Module): string => {
  if (m.group === "components") return `@tundralibs/ui/${m.id}`;
  if (m.group === "layouts") return `@tundralibs/ui/layouts/${m.id}`;
  if (m.group === "templates") return `@tundralibs/ui/templates/${m.id}`;
  if (m.id === "assets" || m.id === "version") return `@tundralibs/ui/${m.id}`;
  return `@tundralibs/ui/${m.id.replace("-", "/")}`;
};

await ensureDir("docs/reference");
for (const m of modules) {
  const L: string[] = [];
  L.push(`# ${m.group}/${m.id}`, "");
  L.push(`<!-- GENERATED by scripts/build-docs.ts from ${m.file} — edit the source, then \`deno task docs\`. -->`, "");
  L.push(
    `Import: ${
      code(`import { ${
        m.entries.filter((e) => e.decl.kind === "function").map((e) =>
          e.name
        ).join(", ") || "…"
      } } from "${exportPath(m)}"`)
    }`,
    "",
  );
  if (m.group === "components" || m.group === "layouts") {
    L.push(
      `Rendered in every variant on the catalogue (\`deno task build:demos\`, then \`demo/index.html\`). Guides: [Getting started](../UI-Getting-Started.md) · [rAPId integration](../UI-Rapid.md) · [Theming](../UI-Theming.md).`,
      "",
    );
  }

  const fns = m.entries.filter((e) => e.decl.kind === "function");
  const types = m.entries.filter((e) => e.decl.kind === "typeAlias");
  const vars = m.entries.filter((e) => e.decl.kind === "variable");

  if (fns.length) {
    L.push("## Functions", "");
    for (const f of fns) {
      L.push(`### \`${f.name}\``, "", "```ts", signature(f.name, f.decl), "```", "");
      if (f.decl.jsDoc?.doc) L.push(f.decl.jsDoc.doc.trim(), "");
    }
  }
  if (types.length) {
    L.push("## Types", "");
    for (const t of types) {
      const tt = t.decl.def?.tsType;
      L.push(`### \`${t.name}\``, "");
      if (t.decl.jsDoc?.doc) L.push(t.decl.jsDoc.doc.trim(), "");
      const { props, extends: ext } = propsOf(tt);
      if (ext.length) L.push(`Extends ${ext.map(code).join(", ")}.`, "");
      if (props.length) L.push(propsTable(props), "");
      else if (tt?.kind === "union") L.push((tt.value as TsType[]).map((u) => `- ${code(typeRepr(u))}`).join("\n"), "");
      else if (!ext.length) L.push("```ts", `type ${t.name} = ${typeRepr(tt)}`, "```", "");
    }
  }
  if (vars.length) {
    L.push("## Constants", "");
    for (const v of vars) {
      L.push(
        `- ${code(v.name)}: ${code(typeRepr(v.decl.def?.tsType))}${
          v.decl.jsDoc?.doc ? ` — ${esc(v.decl.jsDoc.doc)}` : ""
        }`,
      );
    }
    L.push("");
  }
  if (m.group === "components" || m.group === "layouts") {
    // Usage: each example is real code (examples/docs/usage.ts) — the
    // snippet shown is that function's own source, the HTML its render.
    const examples = usage[`${m.group}/${m.id}`];
    if (!examples?.length) {
      throw new Error(`${m.group}/${m.id} has no usage examples — add them to examples/docs/usage.ts`);
    }
    L.push(
      "## Usage",
      "",
      "Each example as the rAPId call and the HTML it renders — the markup a plain page writes by hand. Icons are inline SVG in the real output; they are shortened to `<svg …>…</svg>` here.",
      "",
    );
    for (const [i, ex] of examples.entries()) {
      L.push(`### ${ex.title}`, "");
      if (ex.note) L.push(ex.note, "");
      L.push(
        "```ts",
        snippets[`${m.group}/${m.id}`]?.[i] ?? "",
        "```",
        "",
        "```html",
        prettyHtml(render(ex.render())),
        "```",
        "",
      );
    }
  }
  if (m.css) {
    const hooks = await cssHooks(m.css);
    if (hooks.length) {
      L.push(
        "## CSS hooks",
        "",
        `Classes defined by \`${m.css}\` — structural, token-driven; override from an unlayered stylesheet (see [Theming](../UI-Theming.md)):`,
        "",
      );
      L.push(hooks.map((h) => code(`.${h}`)).join(", "), "");
    }
  }
  if (m.js) {
    const { attrs, events } = await jsHooks(m.js);
    if (attrs.length || events.length) {
      L.push(
        "## Behaviour",
        "",
        `\`${m.js}\` ships in \`ui.js\` (delegated on \`document\`, re-initialised after a rAPId swap).`,
        "",
      );
      if (attrs.length) L.push(`Attributes it reads or writes: ${attrs.map(code).join(", ")}.`, "");
      if (events.length) L.push(`Events: ${events.map(code).join(", ")}.`, "");
    }
  }
  await writeTextFile(`docs/reference/${m.group}-${m.id}.md`, L.join("\n").replace(/\n{3,}/g, "\n\n"));
}

const groups: Module["group"][] = ["components", "layouts", "templates", "package"];
const I = [
  "# Reference",
  "",
  "<!-- GENERATED by scripts/build-docs.ts — edit the sources, then `deno task docs`. -->",
  "",
  "Every exported function, type and constant, one page per module. Guides: [Getting started](UI-Getting-Started.md) · [rAPId integration](UI-Rapid.md) · [Layouts](UI-Layouts.md) · [Theming](UI-Theming.md) · [Charts](UI-Charts.md).",
  "",
];
for (const g of groups) {
  const of = modules.filter((m) => m.group === g);
  if (!of.length) continue;
  I.push(`## ${g}`, "");
  for (const m of of) {
    const names = m.entries.filter((e) => e.decl.kind === "function").map((e) => code(e.name)).join(", ");
    I.push(`- [${m.id}](reference/${m.group}-${m.id}.md)${names ? ` — ${names}` : ""}`);
  }
  I.push("");
}
await writeTextFile("docs/Reference.md", I.join("\n"));
console.log(`Built docs/reference/*.md for ${modules.length} modules and docs/Reference.md`);
