/** Usage examples for components/reveal — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Card } from "../../../components/card/card.ts";
import { LazySection, Parallax, Reveal, RevealGroup } from "../../../components/reveal/reveal.ts";
import { SkeletonCard } from "../../../components/skeleton/skeleton.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/reveal": [
    {
      title: "A section that rises into view",
      note: "Hidden only under `html.js`; a page without the script shows it at once.",
      render: () =>
        Reveal({
          content: html`
            <h2>Why teams switch</h2>
          `,
          effect: "rise",
          tag: "section",
        }),
    },
    {
      title: "Three cards, one after another",
      render: () =>
        RevealGroup({
          items: ["Send", "Chase", "Collect"].map((t) =>
            Card({
              title: t,
              body: html`
                <p>…</p>
              `,
            })
          ),
          stagger: true,
        }),
    },
    {
      title: "A band that loads as it nears the viewport",
      note: "With the rAPId runtime the section swaps in `/fragments/customers`; a plain page keeps the placeholder.",
      render: () =>
        html`
          ${Parallax({
            content: html`
              <img src="/img/texture.png" width="1200" height="400" alt="">
            `,
            speed: "slow",
          })}${LazySection({ id: "customers", action: "/fragments/customers", placeholder: SkeletonCard() })}
        `,
    },
  ],
};
