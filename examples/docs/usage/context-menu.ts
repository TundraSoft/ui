/** Usage examples for components/context-menu — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Card } from "../../../components/card/card.ts";
import { ContextMenu } from "../../../components/context-menu/context-menu.ts";
import { Menu } from "../../../components/menu/menu.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/context-menu": [
    {
      title: "Actions on a file card",
      note:
        'Any element with `data-context-menu="#<id>"` opens the menu at the pointer (right-click, long press, Shift+F10). Give it `tabindex="0"` so the keyboard can reach it.',
      render: () =>
        html`
          ${Card({
            title: "Quarterly report.pdf",
            body: html`<p>2.4 MB</p>`,
            attrs: { "data-context-menu": "#file-menu", tabindex: "0" },
          })}${ContextMenu({
            id: "file-menu",
            label: "File actions",
            content: Menu({
              items: [
                { label: "Open", href: "/files/42" },
                { label: "Rename", href: "/files/42/rename" },
                { label: "Move to trash", href: "/files/42/trash" },
              ],
            }),
          })}
        `,
    },
  ],
};
