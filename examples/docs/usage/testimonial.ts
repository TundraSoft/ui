/** Usage examples for components/testimonial — merged into examples/docs/usage.ts. */
import { Avatar } from "../../../components/avatar/avatar.ts";
import { Testimonial, TestimonialGrid } from "../../../components/testimonial/testimonial.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/testimonial": [
    {
      title: "One large quote",
      render: () =>
        Testimonial({
          quote: "We stopped chasing. The reminders go out, the money comes in.",
          name: "Priya Natarajan",
          role: "Founder, Northwind Traders",
          avatar: Avatar({ initials: "PN", size: "sm" }),
          variant: "large",
        }),
    },
    {
      title: "Three customers in a row",
      render: () =>
        TestimonialGrid({
          items: [
            {
              quote: "Days-sales-outstanding went from 41 to 19.",
              name: "Marcus Thorne",
              role: "CFO, Contoso",
              rating: 5,
            },
            {
              quote: "The first tool our accountant kept.",
              name: "Jamie Sun",
              role: "Operations, Fabrikam",
              rating: 4,
            },
            { quote: "Set up in an afternoon.", name: "Alex Rivera", role: "Owner, Globex", rating: 5 },
          ],
        }),
    },
  ],
};
