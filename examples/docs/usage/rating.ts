/** Usage examples for components/rating — merged into examples/docs/usage.ts. */
import { Rating } from "../../../components/rating/rating.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/rating": [
    {
      title: "Ask for a rating in a form",
      note:
        "A real radio group: arrows move the pick, the form posts `score=4`. `clearable` lets a second click on the picked star clear it.",
      render: () => Rating({ id: "score", name: "score", label: "Your rating", value: 4, clearable: true }),
    },
    {
      title: "Show an average",
      note: "Read-only renders an image named with the value; halves are drawn.",
      render: () => Rating({ id: "avg", label: "Average rating", value: 4.5, readOnly: true, size: "sm" }),
    },
  ],
};
