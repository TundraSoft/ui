/** Catalogue cases for components/tree — see examples/shared/catalogue.ts. */
import { Tree, type TreeNode } from "../../../components/tree/tree.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const folder = Icon("folder", { size: 16 });
const file = Icon("file", { size: 16 });

const files: TreeNode[] = [
  {
    label: "components",
    icon: folder,
    expanded: true,
    children: [
      {
        label: "calendar",
        icon: folder,
        expanded: true,
        children: [
          { label: "calendar.ts", icon: file, href: "#calendar-ts", selected: true },
          { label: "calendar.css", icon: file, href: "#calendar-css" },
          { label: "calendar.js", icon: file, href: "#calendar-js" },
        ],
      },
      {
        label: "tree",
        icon: folder,
        children: [{ label: "tree.ts", icon: file, href: "#tree-ts" }, {
          label: "tree.css",
          icon: file,
          href: "#tree-css",
        }],
      },
      { label: "mod.ts", icon: file, href: "#mod" },
    ],
  },
  {
    label: "docs",
    icon: folder,
    children: [{ label: "UI-Components.md", icon: file, href: "#docs" }],
  },
  { label: "README.md", icon: file, href: "#readme" },
];

const checklist: TreeNode[] = [
  {
    label: "Onboarding",
    expanded: true,
    children: [{ label: "Create workspace" }, {
      label: "Invite team",
      children: [{ label: "Send invites" }, {
        label: "Assign roles",
      }],
    }],
  },
  { label: "Billing", children: [{ label: "Add card" }] },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "tree",
    cases: [
      caseOf(
        "a file tree — links, icons, one branch collapsed (#cat-tree-files: ↑↓←→ Home End Enter, type-ahead)",
        Tree({ id: "cat-tree-files", label: "Files", items: files }),
      ),
      caseOf(
        "no links — rows select, parents toggle on click",
        Tree({ id: "cat-tree-list", label: "Checklist", items: checklist }),
      ),
    ],
  };
}
