/** Usage examples for components/figure — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Figure } from "../../../components/figure/figure.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/figure": [
    {
      title: "A captioned screenshot, centred",
      render: () =>
        Figure({
          align: "center",
          size: "md",
          media: html`<img src="/media/docs/billing.png" alt="The billing page" width="800" height="450">`,
          caption: html`<strong>Figure 2.</strong> The billing page after the redesign.`,
        }),
    },
    {
      title: "A full-width chart",
      note: "`wide` drops the rounded corners so the media meets the container's edges.",
      render: () =>
        Figure({
          align: "wide",
          media: html`<img src="/media/reports/q3.svg" alt="Revenue by month, Q3" width="1200" height="400">`,
          caption: "Revenue by month, Q3.",
        }),
    },
  ],
};
