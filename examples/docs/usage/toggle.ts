/** Usage examples for components/toggle — merged into examples/docs/usage.ts. */
import { Toggle, ToggleGroup } from "../../../components/toggle/toggle.ts";
import { Icon } from "../../../shared/icons.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/toggle": [
    {
      title: "Grid or list view",
      note: "`exclusive` makes the group radio-like; the pressed toggle's hidden input submits `view=grid`.",
      render: () =>
        ToggleGroup({
          id: "view",
          label: "View",
          exclusive: true,
          items: [
            {
              label: "Grid",
              icon: Icon("dashboard", { size: 16 }),
              iconOnly: true,
              pressed: true,
              name: "view",
              value: "grid",
            },
            { label: "List", icon: Icon("list", { size: 16 }), iconOnly: true, name: "view", value: "list" },
          ],
        }),
    },
    {
      title: "A single toggle with a visible label",
      note: "Listen for `toggle:change` (`detail.pressed`) to react without a form.",
      render: () =>
        Toggle({ id: "watch", label: "Watching", icon: Icon("eye", { size: 16 }), variant: "outline", pressed: true }),
    },
  ],
};
