/** Usage examples for components/code — merged into examples/docs/usage.ts. */
import { CodeBlock, codeHtml } from "../../../components/code/code.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/code": [
    {
      title: "A snippet in the docs",
      note: "Numbered, with the two lines the text talks about emphasised; code.js colours `ts` on the page.",
      render: () =>
        CodeBlock({
          title: "routes/projects.ts",
          language: "ts",
          lineNumbers: true,
          highlightLines: [3, 4],
          code:
            'import { Card } from "@tundralibs/ui/card";\n\nexport const ProjectCard = (p: Project) =>\n  Card({ title: p.name, body: p.summary });\n',
        }),
    },
    {
      title: "A server highlighter's markup",
      note:
        "`codeHtml()` is `raw()`: only ever markup the server made from code it holds (Prism, highlight.js, Shiki with class themes).",
      render: () =>
        CodeBlock({
          language: "js",
          highlighted: codeHtml(
            '<span class="token keyword">const</span> n <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>',
          ),
        }),
    },
    {
      title: "A tall log, capped and wrapping",
      render: () =>
        CodeBlock({
          language: "bash",
          code: "deno task build\ndeno task build:demos\nCI=1 HERMETIC=1 deno task test\n",
          maxHeight: "sm",
          wrap: true,
          copyLabel: "Copy commands",
        }),
    },
  ],
};
