/** Catalogue cases for components/feature-grid — see examples/shared/catalogue.ts. */
import { FeatureGrid, type FeatureItem } from "../../../components/feature-grid/feature-grid.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const items: FeatureItem[] = [
  {
    icon: Icon("send"),
    title: "Send in seconds",
    text: "Pick a customer, add the lines, send. The PDF is made for you.",
  },
  {
    icon: Icon("clock"),
    title: "Chases itself",
    text: "Reminders go out on your schedule, in your tone, until it is paid.",
  },
  {
    icon: Icon("shield"),
    title: "Bank-grade safety",
    text: "Every payment runs through a regulated provider; we never hold funds.",
  },
  { icon: Icon("globe"), title: "Any currency", text: "Bill in theirs, settle in yours, at the day's rate." },
];
const linked = items.map((i) => ({ ...i, href: "#" }));

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "feature-grid",
    cases: [
      caseOf(
        "variant plain · columns 4 · with heading",
        FeatureGrid({
          title: "Everything a month end needs",
          text: "Four things, done properly.",
          items,
          columns: "4",
          variant: "plain",
        }),
      ),
      caseOf(
        "variant cards · columns 3 · linked items",
        FeatureGrid({ items: linked.slice(0, 3), columns: "3", variant: "cards", attrs: { id: "cat-features-cards" } }),
      ),
      caseOf(
        "columns 2 · align center",
        FeatureGrid({ title: "Two across", items: items.slice(0, 2), columns: "2", align: "center" }),
      ),
    ],
  };
}
