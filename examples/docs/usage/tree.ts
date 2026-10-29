/** Usage examples for components/tree — merged into examples/docs/usage.ts. */
import { Tree } from "../../../components/tree/tree.ts";
import { Icon } from "../../../shared/icons.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/tree": [
    {
      title: "A project's files",
      render: () =>
        Tree({
          id: "files",
          label: "Files",
          items: [
            {
              label: "src",
              icon: Icon("folder", { size: 16 }),
              expanded: true,
              children: [
                { label: "app.ts", icon: Icon("file", { size: 16 }), href: "/files/src/app.ts", selected: true },
                { label: "routes.ts", icon: Icon("file", { size: 16 }), href: "/files/src/routes.ts" },
              ],
            },
            { label: "README.md", icon: Icon("file", { size: 16 }), href: "/files/README.md" },
          ],
        }),
    },
  ],
};
