/** Usage examples for components/scrollspy — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { ScrollSpy } from "../../../components/scrollspy/scrollspy.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/scrollspy": [
    {
      title: "On this page, beside an article",
      note:
        "Links to section ids; the section being read gets `aria-current` and `.is-active`, a sub-section marks its parent.",
      render: () =>
        ScrollSpy({
          id: "guide-toc",
          items: [
            { label: "Overview", href: "#overview" },
            {
              label: "Install",
              href: "#install",
              children: [{ label: "Deno", href: "#install-deno" }, { label: "npm", href: "#install-npm" }],
            },
            { label: "Usage", href: "#usage" },
          ],
        }),
    },
    {
      title: "Any list of hash links can be a spy",
      note: "Add `data-scrollspy` to the element around the links — the DocsLayout table of contents is one.",
      render: () =>
        html`
          <nav aria-label="Chapters" data-scrollspy data-scrollspy-offset="80">
            <a href="#one">One</a> <a href="#two">Two</a> <a href="#three">Three</a>
          </nav>
        `,
    },
  ],
};
