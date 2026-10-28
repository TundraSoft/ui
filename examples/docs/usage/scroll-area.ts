/** Usage examples for components/scroll-area — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { ScrollArea } from "../../../components/scroll-area/scroll-area.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/scroll-area": [
    {
      title: "A capped list",
      note: "Edge shadows appear only where there is more to scroll — pure CSS, no script.",
      render: () =>
        ScrollArea({
          maxHeight: "sm",
          content: html`
            <ul class="menu__list">
              <li><a class="menu__link" href="/tags/ui">ui</a></li>
            </ul>
          `,
        }),
    },
    {
      title: "A wide table",
      note:
        "Give an area whose content has nothing focusable a `label`: it becomes a named region the keyboard can scroll.",
      render: () =>
        ScrollArea({
          axis: "x",
          label: "Monthly figures",
          content: html`
            <table>
              <tr>
                <td>Jan</td>
                <td>Feb</td>
                <td>Mar</td>
              </tr>
            </table>
          `,
        }),
    },
  ],
};
