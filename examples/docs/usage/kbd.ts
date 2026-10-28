/** Usage examples for components/kbd — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Kbd } from "../../../components/kbd/kbd.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/kbd": [
    {
      title: "A shortcut in a sentence",
      render: () =>
        html`
          <p>Press ${Kbd({ keys: ["⌘", "K"] })} to search.</p>
        `,
    },
    {
      title: "A single key, small",
      render: () => Kbd({ keys: "Esc", size: "sm" }),
    },
  ],
};
