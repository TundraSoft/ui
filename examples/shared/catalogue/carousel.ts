/** Catalogue cases for components/carousel — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Card } from "../../../components/card/card.ts";
import { Carousel } from "../../../components/carousel/carousel.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const cards = Array.from({ length: 6 }, (_, i) =>
  Card({
    title: `Story ${i + 1}`,
    subtitle: "A customer",
    body: html`
      <p>How a team of ${String(3 + i)} cut its month end from a week to an afternoon.</p>
    `,
  }));
const pictures = Array.from({ length: 5 }, (_, i) =>
  html`
    <img
      src="https://picsum.photos/seed/${String(60 + i)}/960/540"
      width="960"
      height="540"
      alt="Screenshot ${String(i + 1)}"
      loading="lazy"
      decoding="async"
    >
  `);

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "carousel",
    cases: [
      caseOf(
        "perView 3 · gap md · peek · dots + controls (#cat-carousel-cards)",
        Carousel({
          id: "cat-carousel-cards",
          label: "Customer stories",
          items: cards,
          perView: "3",
          gap: "md",
          peek: true,
        }),
      ),
      caseOf(
        "perView 1 · loop · autoplay 4000 (#cat-carousel-shots)",
        Carousel({
          id: "cat-carousel-shots",
          label: "Screenshots",
          items: pictures,
          perView: "1",
          loop: true,
          autoplay: 4000,
        }),
      ),
      caseOf(
        "perView 2 · gap lg · no dots",
        Carousel({
          id: "cat-carousel-two",
          label: "Pairs",
          items: cards.slice(0, 4),
          perView: "2",
          gap: "lg",
          dots: false,
        }),
      ),
      caseOf(
        "perView auto · gap sm · no controls (slides keep their width)",
        Carousel({
          id: "cat-carousel-auto",
          label: "Tags",
          items: ["Invoices", "Reminders", "Payments", "Reports", "Approvals", "Multi-currency", "Audit log"].map((t) =>
            html`
              <span class="badge badge--neutral">${t}</span>
            `
          ),
          perView: "auto",
          gap: "sm",
          controls: false,
        }),
      ),
    ],
  };
}
