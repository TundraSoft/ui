/** Usage examples for components/banner — merged into examples/docs/usage.ts. */
import { Banner } from "../../../components/banner/banner.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/banner": [
    {
      title: "An announcement people can dismiss for good",
      note: "`storageKey` remembers the dismissal in the browser; change the key for the next announcement.",
      render: () =>
        Banner({
          variant: "accent",
          body: "Workspaces are here: one account, every team.",
          action: { label: "See what changed", href: "/changelog/workspaces" },
          dismissible: true,
          storageKey: "workspaces-launch",
        }),
    },
    {
      title: "A maintenance notice that stays in view",
      render: () =>
        Banner({
          variant: "warning",
          sticky: true,
          body: "Read-only until 03:00 UTC while we move the database.",
          action: { label: "Status page", href: "https://status.acme.com" },
        }),
    },
  ],
};
