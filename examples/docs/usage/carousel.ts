/** Usage examples for components/carousel — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Card } from "../../../components/card/card.ts";
import { Carousel } from "../../../components/carousel/carousel.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/carousel": [
    {
      title: "Customer stories, three at a time",
      note: "The track snaps and scrolls by hand with no script; carousel.js adds the buttons, dots and keys.",
      render: () =>
        Carousel({
          id: "stories",
          label: "Customer stories",
          perView: "3",
          peek: true,
          items: ["Northwind", "Contoso", "Fabrikam", "Globex"].map((name) =>
            Card({
              title: name,
              body: html`
                <p>How ${name} cut its month end to an afternoon.</p>
              `,
            })
          ),
        }),
    },
    {
      title: "Screenshots that advance on their own",
      render: () =>
        Carousel({
          id: "shots",
          label: "Screenshots",
          loop: true,
          autoplay: 5000,
          items: [1, 2, 3].map((n) =>
            html`
              <img src="/img/shot-${String(n)}.png" width="960" height="540" alt="Screen ${String(n)}" loading="lazy">
            `
          ),
        }),
    },
  ],
};
