/** Usage examples for components/fab — merged into examples/docs/usage.ts. */
import { Fab } from "../../../components/fab/fab.ts";
import { Icon } from "../../../shared/icons.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/fab": [
    {
      title: "A compose button that gets out of the way",
      note: "Fixed to the bottom end; `hideOnScroll` tucks it away while the page scrolls down.",
      render: () =>
        Fab({
          id: "compose",
          icon: Icon("edit", { size: 24 }),
          label: "Compose",
          href: "/mail/new",
          hideOnScroll: true,
        }),
    },
    {
      title: "Extended, with the label showing",
      render: () =>
        Fab({
          id: "new-project",
          icon: Icon("plus", { size: 20 }),
          label: "New project",
          extended: true,
          variant: "accent",
        }),
    },
  ],
};
