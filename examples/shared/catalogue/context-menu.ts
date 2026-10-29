/** Catalogue cases for components/context-menu — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Card } from "../../../components/card/card.ts";
import { ContextMenu } from "../../../components/context-menu/context-menu.ts";
import { DataTable } from "../../../components/data-table/data-table.ts";
import { Menu } from "../../../components/menu/menu.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const fileItems = [
  { label: "Open", href: "#", icon: Icon("externalLink", { size: 16 }) },
  { label: "Rename", href: "#", icon: Icon("edit", { size: 16 }) },
  { label: "Duplicate", href: "#", icon: Icon("copy", { size: 16 }) },
  { label: "Move to trash", href: "#", icon: Icon("trash", { size: 16 }) },
];

type FileRow = { name: string; owner: string; size: string };
const files: FileRow[] = [
  { name: "design-system.fig", owner: "Ada", size: "18 MB" },
  { name: "roadmap.md", owner: "Grace", size: "4 KB" },
  { name: "launch-video.mp4", owner: "Linus", size: "240 MB" },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "context-menu",
    cases: [
      caseOf(
        "right-click, long-press or Shift+F10 on the card — the menu opens at the pointer, flips near an edge (#cat-ctx-card)",
        html`
          ${Card({
            id: "cat-ctx-card",
            title: "Quarterly report.pdf",
            subtitle: "Right-click, long-press, or focus it and press Shift+F10",
            body: html`
              <p class="text-muted">2.4 MB · edited 2026-10-20</p>
            `,
            attrs: { "data-context-menu": "#cat-ctx-menu", tabindex: "0", class: "cat-narrow" },
          })}${ContextMenu({ id: "cat-ctx-menu", label: "File actions", content: Menu({ items: fileItems }) })}
        `,
      ),
      caseOf(
        "rows of a table sharing one menu — each row carries data-context-menu through rowAttrs (#cat-ctx-rows)",
        html`
          ${DataTable<FileRow>({
            id: "cat-ctx-rows",
            columns: [{ key: "name", label: "Name" }, { key: "owner", label: "Owner" }, {
              key: "size",
              label: "Size",
              numeric: true,
            }],
            rows: files,
            rowKey: (row) => row.name,
            rowAttrs: () => ({ "data-context-menu": "#cat-ctx-row-menu", tabindex: "0" }),
          })}${ContextMenu({ id: "cat-ctx-row-menu", label: "Row actions", content: Menu({ items: fileItems }) })}
        `,
      ),
    ],
  };
}
