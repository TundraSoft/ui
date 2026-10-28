/** Usage examples for components/back-to-top — merged into examples/docs/usage.ts. */
import { BackToTop } from "../../../components/back-to-top/back-to-top.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/back-to-top": [
    {
      title: "Once per page, in the layout's footer slot",
      note: "Hidden until 600px of scrolling; a click scrolls up and moves focus to `#main-content`.",
      render: () => BackToTop(),
    },
    {
      title: "Sooner, in the other corner",
      render: () => BackToTop({ threshold: 300, position: "start", label: "Top" }),
    },
  ],
};
