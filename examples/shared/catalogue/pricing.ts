/** Catalogue cases for components/pricing — see examples/shared/catalogue.ts. */
import { Button } from "../../../components/button/button.ts";
import { type PricingPlan, PricingTable } from "../../../components/pricing/pricing.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const plans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$0",
    priceYearly: "$0",
    period: "per month",
    description: "For the first ten invoices.",
    features: ["10 invoices a month", "One user", { label: "Automatic reminders", included: false }, {
      label: "Card payments",
      included: false,
    }],
    action: Button({ label: "Start free", variant: "outline", href: "#" }),
  },
  {
    name: "Team",
    price: "$24",
    priceYearly: "$19",
    period: "per seat / month",
    description: "Invoicing that chases itself.",
    features: ["Unlimited invoices", "Up to 10 users", "Automatic reminders", "Card payments", {
      label: "Multi-currency",
      included: false,
    }],
    action: Button({ label: "Start 14-day trial", href: "#" }),
    featured: true,
    badge: "Most popular",
  },
  {
    name: "Business",
    price: "$59",
    priceYearly: "$49",
    period: "per seat / month",
    description: "For finance teams.",
    features: ["Everything in Team", "Unlimited users", "Multi-currency", "Approvals", "Priority support"],
    action: Button({ label: "Talk to sales", variant: "outline", href: "#" }),
  },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "pricing",
    cases: [
      caseOf(
        "columns 3 · monthly/yearly toggle · a featured plan (#cat-pricing-3)",
        PricingTable({
          plans,
          columns: "3",
          toggle: { monthly: "Monthly", yearly: "Yearly", note: "save 20%", name: "cat-billing" },
          attrs: { id: "cat-pricing-3" },
        }),
      ),
      caseOf("columns 2 · no toggle", PricingTable({ plans: plans.slice(0, 2), columns: "2" })),
      caseOf(
        "columns 4",
        PricingTable({
          plans: [...plans, {
            ...plans[2],
            name: "Enterprise",
            price: "Let's talk",
            period: undefined,
            featured: false,
          }],
          columns: "4",
        }),
      ),
    ],
  };
}
