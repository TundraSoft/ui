/** Usage examples for components/menubar — merged into examples/docs/usage.ts. */
import { Menubar } from "../../../components/menubar/menubar.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/menubar": [
    {
      title: "An editor's menu bar",
      note: "Each entry's `items` is a `Menu` — links, or parents with `children` for a submenu.",
      render: () =>
        Menubar({
          id: "editor-menu",
          label: "Editor",
          items: [
            {
              label: "File",
              items: [
                { label: "New", href: "/docs/new" },
                { label: "Open…", href: "/docs" },
                {
                  label: "Export",
                  children: [{ label: "PDF", href: "/docs/1.pdf" }, { label: "Markdown", href: "/docs/1.md" }],
                },
              ],
            },
            { label: "Edit", items: [{ label: "Undo", href: "#" }, { label: "Redo", href: "#" }] },
            { label: "Help", items: [{ label: "Documentation", href: "/help" }] },
          ],
        }),
    },
  ],
};
