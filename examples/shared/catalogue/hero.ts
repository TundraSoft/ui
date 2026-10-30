/** Catalogue cases for components/hero — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { Hero } from "../../../components/hero/hero.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const actions = html`
  ${Button({ label: "Start free", size: "lg", href: "#" })}${Button({
    label: "See a demo",
    size: "lg",
    variant: "outline",
    href: "#",
    iconEnd: Icon("chevronRight", { size: 16 }),
  })}
`;
const picture = (seed: number) =>
  html`
    <img
      src="https://picsum.photos/seed/${String(seed)}/960/640"
      width="960"
      height="640"
      alt="A product screenshot"
      loading="lazy"
      decoding="async"
    >
  `;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "hero",
    cases: [
      caseOf(
        "layout split · size lg · parallax media",
        Hero({
          eyebrow: "Invoicing for small teams",
          title: "Get paid on time, every time.",
          text:
            "Send invoices your customers can pay in one click, chase the late ones for you, and see the cash land.",
          actions,
          media: picture(41),
          layout: "split",
          size: "lg",
          parallax: true,
          attrs: { id: "cat-hero-split" },
        }),
      ),
      caseOf(
        "align center · layout stacked · size md",
        Hero({
          title: "One place for every invoice",
          text: "A calmer month end.",
          actions,
          media: picture(42),
          align: "center",
          layout: "stacked",
          size: "md",
        }),
      ),
      caseOf(
        "tone inverse",
        Hero({
          eyebrow: "New",
          title: "Dark on purpose",
          text: "The inverse surface, text re-mapped.",
          actions,
          tone: "inverse",
        }),
      ),
      caseOf(
        "tone accent · align start · no media",
        Hero({
          title: "A soft wash of the accent",
          text: "A gradient with a plain fallback.",
          tone: "accent",
          align: "start",
        }),
      ),
      caseOf("tone default", Hero({ title: "Just the words", tone: "default", align: "center" })),
      caseOf(
        "fill + footer — hero and its facts strip are the first screen: 100svh minus --hero-fill-offset (the sticky header) (#cat-hero-fill)",
        Hero({
          title: "The first screen, filled",
          text: "The text centres in the room the footer leaves.",
          actions,
          align: "center",
          fill: true,
          footer: html`
            <ul class="cluster text-muted" aria-label="Facts">
              <li>99.99% uptime</li>
              <li>2B redirects a month</li>
              <li>SOC 2 Type II</li>
            </ul>
          `,
          attrs: { id: "cat-hero-fill" },
        }),
      ),
    ],
  };
}
