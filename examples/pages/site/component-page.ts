/**
 * One component's page: what it is, how to import it, every catalogued
 * case live (the exhaustive inventory from examples/shared/catalogue.ts),
 * the usage examples as TypeScript and the HTML they render, and its API
 * surface — the exported template functions, the CSS class hooks a theme
 * can target and the data-* attributes and events its script uses.
 */
import { type Html, html, render } from "@tundralibs/rapid/ui";
import { pathExists, readTextFile } from "@tundralibs/compat/file";
import { Badge } from "../../../components/badge/badge.ts";
import { CodeBlock } from "../../../components/code/code.ts";
import { DescriptionList } from "../../../components/description-list/description-list.ts";
import { PageHeader } from "../../../components/page-header/page-header.ts";
import { Tabs } from "../../../components/tabs/tabs.ts";
import type { CatalogueEntry } from "../../shared/catalogue.ts";
import type { UsageExample } from "../../docs/usage.ts";
import { prettyHtml } from "../../docs/pretty-html.ts";
import { COMPONENTS } from "./nav.ts";

/** A section with an anchored heading — the building block of every page. */
export const section = (id: string, title: string, body: Html, intro?: string | Html): Html =>
  html`
    <section class="site-section" id="${id}">
      <h2 class="site-section__title">${title}</h2>${intro
        ? html`<p class="site-section__intro">${intro}</p>`
        : ""}${body}
    </section>
  `;

/** A wrapping row of code-styled chips (class names, attributes, events). */
export const chips = (items: string[]): Html =>
  html`<div class="site-chips">${items.map((label) => Badge({ label, variant: "code" }))}</div>`;

type Fn = { name: string; doc: string };

/** Every `export function Name(` in a module, with the first paragraph of its JSDoc. */
async function exportedFunctions(file: string): Promise<Fn[]> {
  const src = await readTextFile(file);
  const out: Fn[] = [];
  // A comment body that cannot contain "*/", so a match never spans two comments.
  for (const m of src.matchAll(/(?:\/\*\*([^*]*(?:\*(?!\/)[^*]*)*)\*\/\s*)?export function ([A-Za-z]\w*)[<(]/g)) {
    const raw = (m[1] ?? "").split("\n").map((l) => l.replace(/^\s*\*\s?/, "")).join("\n").trim();
    const doc = raw.split(/\n\s*\n/)[0]!.replace(/\s+/g, " ").replace(/\{@link (\w+)[^}]*\}/g, "$1");
    out.push({ name: m[2]!, doc });
  }
  return out;
}

async function cssHooks(path: string): Promise<string[]> {
  if (!(await pathExists(path))) return [];
  const css = await readTextFile(path);
  const out = new Set<string>();
  for (const m of css.matchAll(/(?:^|[\s,>+~(])\.([a-z][a-z0-9_-]*)/gm)) out.add(`.${m[1]}`);
  return [...out].sort();
}

async function jsHooks(path: string): Promise<{ attrs: string[]; events: string[] }> {
  if (!(await pathExists(path))) return { attrs: [], events: [] };
  const js = await readTextFile(path);
  const attrs = new Set<string>();
  for (const m of js.matchAll(/data-[a-z][a-z0-9-]*/g)) attrs.add(m[0]);
  const events = new Set<string>();
  for (const m of js.matchAll(/["'`]([a-z]+:[a-z-]+)["'`]/g)) events.add(m[1]!);
  return { attrs: [...attrs].sort(), events: [...events].sort() };
}

/** The live cases. Ids and data-* hooks are what examples/tests/test-catalogue.ts drives. */
function casesHtml(entry: CatalogueEntry): Html {
  return html`
    <section class="site-section cat-section" id="cat-${entry.name}" data-catalogue="${entry.name}">
      <h2 class="site-section__title">Examples</h2>
      <p class="site-section__intro">Every variant, size and state the component declares — ${String(
        entry.cases.length,
      )} cases.</p>${entry.cases.map((k) =>
        html`
          <div class="cat-case" data-case="${k.label}">
            <p class="cat-case__label">${k.label}</p>
            <div class="cat-case__body">${k.html}</div>
          </div>
        `
      )}
    </section>
  `;
}

function usageHtml(name: string, examples: UsageExample[], snippets: string[]): Html {
  if (!examples.length) return html``;
  return section(
    "usage",
    "Usage",
    html`${
      examples.map((ex, i) => {
        const id = `usage-${name}-${i}`;
        return html`
          <div class="site-usage">
            <h3 class="site-usage__title">${ex.title}</h3>${ex.note
              ? html`<p class="text-muted">${ex.note}</p>`
              : ""}${Tabs({
                id,
                items: [
                  {
                    id: `${id}-ts`,
                    label: "TypeScript",
                    content: CodeBlock({ code: snippets[i] ?? "", language: "ts", maxHeight: "md" }),
                  },
                  {
                    id: `${id}-html`,
                    label: "HTML",
                    content: CodeBlock({ code: prettyHtml(render(ex.render())), language: "html", maxHeight: "md" }),
                  },
                ],
              })}
          </div>
        `;
      })
    }`,
    "Real call sites: the template call in a rAPId route, and the markup it renders for a plain HTML page.",
  );
}

async function apiHtml(name: string): Promise<Html> {
  const dir = `components/${name}`;
  const fns = await exportedFunctions(`${dir}/${name}.ts`);
  const css = await cssHooks(`${dir}/${name}.css`);
  const js = await jsHooks(`${dir}/${name}.js`);
  const items = [
    ...fns.map((f) => ({ term: html`<code>${f.name}()</code>`, description: f.doc || "Template function." })),
    css.length ? { term: "CSS hooks", description: chips(css) } : undefined,
    js.attrs.length ? { term: "Script attributes", description: chips(js.attrs) } : undefined,
    js.events.length ? { term: "Events", description: chips(js.events) } : undefined,
  ].filter((x) => x !== undefined);
  return section(
    "api",
    "API",
    DescriptionList({ items, layout: "inline", divided: true }),
    html`Props are documented on their types — see the generated reference, <code>docs/reference/components-${name}.md</code>.`,
  );
}

export async function componentPage(
  entry: CatalogueEntry,
  context: { group: string },
  usage: UsageExample[],
  snippets: string[],
): Promise<Html> {
  const info = COMPONENTS[entry.name]!;
  const fns = (await exportedFunctions(`components/${entry.name}/${entry.name}.ts`)).map((f) => f.name);
  const importLine = `import { ${fns.join(", ")} } from "@tundralibs/ui/${entry.name}";`;
  return html`${
    PageHeader({
      title: info.label,
      subtitle: info.blurb,
      badge: Badge({ label: context.group, variant: "neutral" }),
    })
  }${CodeBlock({ code: importLine, language: "ts", attrs: { class: "site-import" } })}${casesHtml(entry)}${
    usageHtml(entry.name, usage, snippets)
  }${await apiHtml(entry.name)}`;
}
