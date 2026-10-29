/** Usage examples for components/separator — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { Separator } from "../../../components/separator/separator.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/separator": [
    {
      title: '"or" between two ways to sign in',
      render: () =>
        html`
          ${Button({ label: "Continue with Google", variant: "outline", block: true })}${Separator({
            label: "or",
          })}${Button({ label: "Email me a link", variant: "primary", block: true })}
        `,
    },
    {
      title: "A vertical rule in a toolbar",
      note: "`decorative` hides it from assistive tech; the buttons already read as groups.",
      render: () =>
        html`
          ${Button({ label: "Undo", variant: "ghost", size: "sm" })}${Separator({
            orientation: "vertical",
            spacing: "sm",
            decorative: true,
          })}${Button({ label: "Redo", variant: "ghost", size: "sm" })}
        `,
    },
  ],
};
