/** Usage examples for components/hero — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { Hero } from "../../../components/hero/hero.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/hero": [
    {
      title: "A landing page's opening band",
      note: 'Put it in `StackedLayout({ width: "bleed" })`; its own `.container` keeps the text on the page column.',
      render: () =>
        Hero({
          eyebrow: "Invoicing for small teams",
          title: "Get paid on time, every time.",
          text: "Send invoices your customers can pay in one click, and let the reminders chase the late ones.",
          actions: html`
            ${Button({ label: "Start free", size: "lg", href: "/signup" })}${Button({
              label: "See a demo",
              size: "lg",
              variant: "outline",
              href: "/demo",
            })}
          `,
          media: html`
            <img src="/img/app.png" width="960" height="640" alt="The invoices screen" loading="eager">
          `,
          layout: "split",
          parallax: true,
        }),
    },
    {
      title: "A centred statement on the inverse ground",
      render: () =>
        Hero({
          title: "One place for every invoice",
          text: "A calmer month end.",
          align: "center",
          tone: "inverse",
          size: "md",
        }),
    },
    {
      title: "The first screen, with a facts strip",
      note:
        "`fill` makes the band at least `100svh` minus `--hero-fill-offset` (the sticky header, `--scroll-padding-top` by default); the `footer` sits inside it, so hero and facts are exactly the first screen.",
      render: () =>
        Hero({
          title: "Short links your customers trust",
          text: "Branded domains, live analytics and a team plan that grows with you.",
          align: "center",
          fill: true,
          actions: Button({ label: "Start free", size: "lg", href: "/signup" }),
          footer: html`
            <ul class="cluster" aria-label="Facts">
              <li>99.99% uptime</li>
              <li>2B redirects a month</li>
            </ul>
          `,
        }),
    },
  ],
};
