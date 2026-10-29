/** Catalogue cases for components/menubar — see examples/shared/catalogue.ts. */
import { Menubar } from "../../../components/menubar/menubar.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "menubar",
    cases: [
      caseOf(
        "File · Edit · View · Help — click opens, hover switches while open, ← → ↓ Escape from the keyboard (#cat-menubar-1)",
        Menubar({
          id: "cat-menubar-1",
          label: "Editor",
          items: [
            {
              label: "File",
              items: [
                { label: "New", href: "#" },
                { label: "Open…", href: "#" },
                { label: "Save", href: "#" },
                { label: "Export", children: [{ label: "PDF", href: "#" }, { label: "Markdown", href: "#" }] },
              ],
            },
            {
              label: "Edit",
              items: [{ label: "Undo", href: "#" }, { label: "Redo", href: "#" }, { label: "Find…", href: "#" }],
            },
            {
              label: "View",
              items: [{ label: "Zoom in", href: "#" }, { label: "Zoom out", href: "#" }, {
                label: "Full screen",
                href: "#",
              }],
            },
            { label: "Window", disabled: true, items: [{ label: "Minimise", href: "#" }] },
            { label: "Help", items: [{ label: "Documentation", href: "#" }, { label: "About", href: "#" }] },
          ],
        }),
      ),
      caseOf(
        "many menus — the bar scrolls sideways below 768px instead of wrapping (#cat-menubar-wide)",
        Menubar({
          id: "cat-menubar-wide",
          label: "Workspace",
          items: ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Window", "Help"].map((label) => ({
            label,
            items: [{ label: `${label} action one`, href: "#" }, { label: `${label} action two`, href: "#" }],
          })),
        }),
      ),
    ],
  };
}
