/** Catalogue cases for components/prose — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Prose, proseHtml } from "../../../components/prose/prose.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const sizes = ["sm", "md", "lg"] as const;

/** What a Markdown renderer hands back — fixed, trusted sample markup. */
const article = `
<h1>Release notes</h1>
<p>Version <strong>0.25</strong> adds a <a href="#">calendar</a>, a tree view and <code>Prose</code>, the typography for content like this.</p>
<h2>Highlights</h2>
<ul><li>Every floating panel now enters and leaves with motion.</li><li>Tables fold into cards on a phone.<ul><li>Opt in per table.</li></ul></li><li>A <kbd>⌘K</kbd> palette on every catalogue page.</li></ul>
<blockquote><p>Motion should explain, never decorate.</p></blockquote>
<h3>Install</h3>
<pre><code>deno add jsr:@tundralibs/ui
import { Prose } from "@tundralibs/ui/prose";</code></pre>
<table><thead><tr><th>Package</th><th>Version</th><th>Size</th></tr></thead><tbody><tr><td>ui.css</td><td>0.25.0</td><td>18.6 KB</td></tr><tr><td>ui.js</td><td>0.25.0</td><td>25.0 KB</td></tr></tbody></table>
<ol><li>Build.</li><li>Ship.</li></ol>
<hr>
<figure><img src="https://picsum.photos/seed/prose/800/300" alt="A placeholder photograph" width="800" height="300" loading="lazy"><figcaption>A figure with its caption.</figcaption></figure>
<p>Done.</p>
`;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "prose",
    cases: [
      caseOf(
        "rendered Markdown — headings, lists, quote, code, table, figure (measure capped)",
        Prose({ content: proseHtml(article), measure: true, attrs: { id: "cat-prose-article" } }),
      ),
      ...sizes.map((size) =>
        caseOf(
          `size ${size}`,
          Prose({
            size,
            content: html`
              <h2>Heading</h2>
              <p>A paragraph at the ${size} size, with <code>code</code> and a <a href="#">link</a>.</p>
            `,
          }),
        )
      ),
    ],
  };
}
