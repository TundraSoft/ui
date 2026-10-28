/** Catalogue cases for components/description-list — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { DescriptionList } from "../../../components/description-list/description-list.ts";
import { Badge } from "../../../components/badge/badge.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const layouts = ["stacked", "inline", "columns"] as const;
const sizes = ["sm", "md"] as const;

const invoice = [
  { term: "Invoice", description: "INV-2048" },
  { term: "Client", description: "Northwind Traders" },
  { term: "Issued", description: "1 Sep 2026" },
  { term: "Status", description: Badge({ label: "Paid", variant: "success", dot: true }) },
  { term: "Total", description: "$12,400.00" },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "description-list",
    cases: [
      ...layouts.map((layout) =>
        caseOf(`layout ${layout}`, DescriptionList({ layout, items: invoice, attrs: { id: `cat-dl-${layout}` } }))
      ),
      caseOf(
        "sizes, divided",
        caseRow(
          ...sizes.map((size) =>
            html`
              <div class="cat-narrow">${DescriptionList({
                size,
                divided: true,
                layout: "inline",
                items: invoice.slice(0, 3),
              })}</div>
            `
          ),
        ),
      ),
    ],
  };
}
