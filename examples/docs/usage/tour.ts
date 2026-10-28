/** Usage examples for components/tour — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { Tour } from "../../../components/tour/tour.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/tour": [
    {
      title: "A first-run tour that plays once",
      note:
        '`startOn: "load"` starts it when the page is ready; `storageKey` records that it was finished or skipped so it does not come back. Each step points at an element by selector — a step whose target is not on the page is skipped.',
      render: () =>
        Tour({
          id: "first-run",
          startOn: "load",
          storageKey: "tour:first-run",
          label: "Welcome tour",
          steps: [
            { target: "#new-project", title: "Create a project", body: "Everything starts here." },
            { target: "#search", placement: "end", title: "Find anything", body: "Or press ⌘K anywhere." },
            { title: "That is it", body: "Replay this tour from the help menu at any time." },
          ],
        }),
    },
    {
      title: "Replay it from a help menu",
      note: 'Any element with `data-tour-start="#<id>"` starts the tour; focus returns to it at the end.',
      render: () =>
        html`
          ${Button({ label: "Take the tour", variant: "ghost", attrs: { "data-tour-start": "#first-run" } })}
        `,
    },
  ],
};
