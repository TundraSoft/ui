/** Catalogue cases for components/code — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Badge } from "../../../components/badge/badge.ts";
import { CodeBlock, codeHtml } from "../../../components/code/code.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const TS = `import { Card } from "@tundralibs/ui/card";

/** A card for every project, newest first. */
export function ProjectCards(projects: Project[]): Html {
  const sorted = [...projects].sort((a, b) => b.updated - a.updated);
  return html\`<div class="grid">\${sorted.map((p) => Card({ title: p.name, body: p.summary }))}</div>\`;
}
`;

const JSON_SAMPLE = `{
  "name": "@tundralibs/ui",
  "version": "0.24.0",
  "exports": { ".": "./mod.ts", "./card": "./components/card/card.ts" },
  "private": false,
  "retries": 3,
  "ratio": 0.75,
  "deprecated": null
}
`;

const BASH = `# Build the bundle, then the demo pages
deno task build && deno task build:demos
export CHROME_PATH=/usr/bin/google-chrome
CI=1 HERMETIC=1 deno task test:catalogue --filter "code" | tail -n 20
`;

const HTML_SAMPLE = `<!doctype html>
<!-- The shell a plain page needs -->
<link rel="stylesheet" href="/ui/ui.css">
<figure class="code code--numbered" data-code>
  <pre class="code__pre"><code class="code__body language-css">…</code></pre>
</figure>
<script src="/ui/ui.js" defer></script>
`;

const CSS_SAMPLE = `/* A theme retunes the block through its own tokens,
   never by editing code.css */
.code {
  --code-kw: var(--color-accent);
  --code-str: #2f855a;
  border-radius: 0;
}

@media (prefers-color-scheme: dark) {
  .code { --code-com: var(--color-text-muted); }
}
`;

const LONG = Array.from(
  { length: 40 },
  (_, i) => `const line${i + 1} = ${i + 1}; // a filler line to make the block tall enough to scroll inside itself`,
).join("\n");

/* What a server-side highlighter hands over: Prism's class names here. */
const PRISM = `<span class="token keyword">const</span> total <span class="token operator">=</span> items
  <span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token punctuation">(</span>i<span class="token punctuation">)</span> <span class="token operator">=></span> i<span class="token punctuation">.</span>price<span class="token punctuation">)</span>
  <span class="token punctuation">.</span><span class="token function">reduce</span><span class="token punctuation">(</span><span class="token punctuation">(</span>a<span class="token punctuation">,</span> b<span class="token punctuation">)</span> <span class="token operator">=></span> a <span class="token operator">+</span> b<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">/* a comment that
   spans two lines */</span>`;

const PYTHON = `import hmac

@webhook
def verify(self, body: bytes, sig: str) -> bool:
    """Compare in constant time.

    Never with ==."""
    expected = hmac.new(SECRET, body, "sha256").hexdigest()  # hex
    return hmac.compare_digest(expected, sig)
`;

const PHP = `<?php
function verify(string $body, string $sig): bool {
    /* constant time,
       never === */
    $expected = hash_hmac('sha256', $body, SECRET);
    return hash_equals($expected, $sig); // true when it matches
}
`;

const JAVA = `@Override
public boolean verify(byte[] body, String sig) throws Exception {
    // constant time
    Mac mac = Mac.getInstance("HmacSHA256");
    String doc = """
        multi-line text
        """;
    return MessageDigest.isEqual(mac.doFinal(body), sig.getBytes());
}
`;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "code",
    cases: [
      caseOf(
        "TypeScript — title, language chip, copy button, line numbers, highlighted lines 4–5 (#cat-code-ts)",
        CodeBlock({
          id: "cat-code-ts",
          title: "routes/projects.ts",
          language: "ts",
          code: TS,
          lineNumbers: true,
          highlightLines: [4, 5],
        }),
      ),
      caseOf(
        "json / bash / html / css — coloured on the page by code.js (#cat-code-json)",
        html`
          <div class="stack">${CodeBlock({ id: "cat-code-json", language: "json", code: JSON_SAMPLE })}${CodeBlock({
            language: "bash",
            code: BASH,
            copyLabel: "Copy commands",
          })}${CodeBlock({ language: "html", code: HTML_SAMPLE, lineNumbers: true })}${CodeBlock({
            language: "css",
            code: CSS_SAMPLE,
          })}</div>
        `,
      ),
      caseOf(
        "a server highlighter's markup (Prism classes) through codeHtml() — the multi-line comment survives the line split (#cat-code-prism)",
        CodeBlock({ id: "cat-code-prism", language: "js", highlighted: codeHtml(PRISM), lineNumbers: true }),
      ),
      caseOf(
        "unknown language (plain) · no header (copy: false, no title, no language)",
        caseRow(
          CodeBlock({
            language: "rust",
            code: `fn main() {\n    println!("hello");\n}\n`,
            attrs: { class: "cat-narrow" },
          }),
          CodeBlock({ code: "plain text, no chrome at all", copy: false, attrs: { class: "cat-narrow" } }),
        ),
      ),
      caseOf(
        "wrap: true against a long line · the same line scrolling (#cat-code-wrap)",
        html`
          <div class="stack">${CodeBlock({
            id: "cat-code-wrap",
            language: "bash",
            wrap: true,
            code:
              "curl -X POST https://api.example.com/v1/projects --header 'authorization: Bearer token' --data '{\"name\":\"A very long command line that would otherwise scroll sideways for quite a while\"}'",
          })}${CodeBlock({
            language: "bash",
            code:
              "curl -X POST https://api.example.com/v1/projects --header 'authorization: Bearer token' --data '{\"name\":\"A very long command line that would otherwise scroll sideways for quite a while\"}'",
          })}</div>
        `,
      ),
      caseOf(
        "the same signature check in Python, PHP and Java, coloured by code.js (#cat-code-langs)",
        html`
          <div class="stack" id="cat-code-langs">${CodeBlock({
            language: "python",
            code: PYTHON,
          })}${CodeBlock({ language: "php", code: PHP })}${CodeBlock({ language: "java", code: JAVA })}</div>
        `,
      ),
      caseOf(
        "aside in the header, a run marked and quietened inside a line (#cat-code-aside)",
        CodeBlock({
          id: "cat-code-aside",
          title: "POST /v1/links",
          aside: Badge({ variant: "success", label: "201 Created" }),
          highlighted: codeHtml(
            `{
  "id": <span class="tok-mark">"lnk_8Hq2"</span>,
  "short_url": "https://brv.ly/8Hq2", <span class="tok-quiet">// the one to share</span>
}`,
          ),
        }),
      ),
      caseOf(
        "blank lines keep their height: plain, numbered, tokenised inside a comment, a highlighter's split comment (#cat-code-blank)",
        html`
          <div class="stack" id="cat-code-blank">${CodeBlock({
            code: "first paragraph\n\nsecond paragraph",
          })}${CodeBlock({
            code: "first paragraph\n\nsecond paragraph",
            lineNumbers: true,
          })}${CodeBlock({
            language: "js",
            code: "/* a comment\n\n   with a gap */",
          })}${CodeBlock({
            highlighted: codeHtml('<span class="token comment">/* a comment\n\n   with a gap */</span>'),
          })}</div>
        `,
      ),
      caseOf(
        "maxHeight sm / md / lg — the block scrolls inside itself (#cat-code-sm)",
        html`
          <div class="stack">${CodeBlock({
            id: "cat-code-sm",
            title: "sm",
            language: "js",
            code: LONG,
            maxHeight: "sm",
            lineNumbers: true,
          })}${CodeBlock({ title: "md", language: "js", code: LONG, maxHeight: "md" })}${CodeBlock({
            title: "lg",
            language: "js",
            code: LONG,
            maxHeight: "lg",
          })}</div>
        `,
      ),
    ],
  };
}
