/** Usage examples for components/prose — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Prose, proseHtml } from "../../../components/prose/prose.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/prose": [
    {
      title: "A help article the server rendered from Markdown",
      note:
        "`proseHtml` wraps HTML your renderer already sanitised — never a user's raw input. The result is the editor preview's natural home.",
      render: () =>
        Prose({
          measure: true,
          content: proseHtml("<h2>Refunds</h2><p>A refund reaches the card within <strong>5 days</strong>.</p>"),
        }),
    },
    {
      title: "Content built with the template",
      render: () =>
        Prose({
          size: "sm",
          content: html`
            <p>Escaped like any other markup: ${"<b>not bold</b>"}</p>
          `,
        }),
    },
  ],
};
