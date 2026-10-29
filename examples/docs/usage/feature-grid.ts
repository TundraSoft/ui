/** Usage examples for components/feature-grid — merged into examples/docs/usage.ts. */
import { FeatureGrid } from "../../../components/feature-grid/feature-grid.ts";
import { Icon } from "../../../shared/icons.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/feature-grid": [
    {
      title: "Three reasons, with icons",
      render: () =>
        FeatureGrid({
          title: "Everything a month end needs",
          items: [
            { icon: Icon("send"), title: "Send in seconds", text: "Pick a customer, add the lines, send." },
            { icon: Icon("clock"), title: "Chases itself", text: "Reminders go out until it is paid." },
            { icon: Icon("shield"), title: "Bank-grade safety", text: "Payments run through a regulated provider." },
          ],
        }),
    },
    {
      title: "Linked cards",
      note: "A linked item is clickable as a whole; the title carries the link.",
      render: () =>
        FeatureGrid({
          variant: "cards",
          columns: "2",
          items: [
            { title: "Docs", text: "Every endpoint, every field.", href: "/docs" },
            { title: "Changelog", text: "What shipped this week.", href: "/changelog" },
          ],
        }),
    },
  ],
};
