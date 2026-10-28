/** Usage examples for components/pricing — merged into examples/docs/usage.ts. */
import { Button } from "../../../components/button/button.ts";
import { PricingTable } from "../../../components/pricing/pricing.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/pricing": [
    {
      title: "Three plans with a yearly toggle",
      note:
        "The toggle is a pair of radios: it submits and works without JS; pricing.js only switches which price shows.",
      render: () =>
        PricingTable({
          toggle: { monthly: "Monthly", yearly: "Yearly", note: "save 20%" },
          plans: [
            {
              name: "Starter",
              price: "$0",
              period: "per month",
              features: ["10 invoices a month", { label: "Reminders", included: false }],
              action: Button({ label: "Start free", variant: "outline", href: "/signup" }),
            },
            {
              name: "Team",
              price: "$24",
              priceYearly: "$19",
              period: "per seat / month",
              features: ["Unlimited invoices", "Reminders", "Card payments"],
              action: Button({ label: "Start trial", href: "/signup?plan=team" }),
              featured: true,
              badge: "Most popular",
            },
            {
              name: "Business",
              price: "$59",
              priceYearly: "$49",
              period: "per seat / month",
              features: ["Everything in Team", "Approvals", "Priority support"],
              action: Button({ label: "Talk to sales", variant: "outline", href: "/sales" }),
            },
          ],
        }),
    },
  ],
};
