/** Usage examples for components/description-list — merged into examples/docs/usage.ts. */
import { DescriptionList } from "../../../components/description-list/description-list.ts";
import { Badge } from "../../../components/badge/badge.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/description-list": [
    {
      title: "An invoice's details panel",
      render: () =>
        DescriptionList({
          layout: "inline",
          divided: true,
          items: [
            { term: "Invoice", description: "INV-2048" },
            { term: "Client", description: "Northwind Traders" },
            { term: "Status", description: Badge({ label: "Paid", variant: "success", dot: true }) },
            { term: "Total", description: "$12,400.00" },
          ],
        }),
    },
    {
      title: "Billed from / billed to, side by side",
      render: () =>
        DescriptionList({
          layout: "columns",
          items: [
            { term: "Billed from", description: "Acme Inc., 500 Market St, San Francisco" },
            { term: "Billed to", description: "Blue Bottle Co., 12 Ferry Building, San Francisco" },
          ],
        }),
    },
  ],
};
