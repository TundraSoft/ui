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
        "no id: optional, several on one page never collide (#cat-carousel-no-id)",
        html`
          <div id="cat-carousel-no-id">
            ${Carousel({ label: "Two stories", items: cards.slice(0, 2) })}
          </div>
        `,
      ),
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
      caseOf(
        'controls "sides" · stack md · stackReducedMotion · stackNoScript — arrows at the middle edges (outside the slides when the page has room), a plain list below 768, with reduced motion or without the script (#cat-carousel-sides)',
        Carousel({
          id: "cat-carousel-sides",
          label: "Tour",
          items: pictures.slice(0, 4),
          controls: "sides",
          stack: "md",
          stackReducedMotion: true,
          stackNoScript: true,
        }),
      ),
      caseOf(
        'scroll "page" — the slides move sideways as the page scrolls down: pinned under the header (slides fill the frame) in a band of that screen plus one per later slide, each slide holding 80% of its screen, the outgoing one fading through the move; arrows, dots and keys scroll the page; a slide taller than the frame stacks instead (#cat-carousel-page)',
        Carousel({
          id: "cat-carousel-page",
          label: "How it works",
          // The last slide holds an absolutely positioned .sr-only caption: it must stay inside its slide (and the
          // track's clip), not widen the page.
          items: [
            ...pictures.slice(0, 3),
            html`
              <figure class="m-0">${pictures[3]}<figcaption class="sr-only">The fourth screen</figcaption></figure>
            `,
          ],
          controls: "sides",
          scroll: "page",
          stack: "md",
        }),
      ),
    ],
  };
}
