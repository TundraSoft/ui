/** Catalogue cases for components/lightbox — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Grid, GridCol } from "../../../components/grid/grid.ts";
import { Lightbox, type LightboxItem, LightboxLink } from "../../../components/lightbox/lightbox.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const items: LightboxItem[] = Array.from({ length: 6 }, (_, i) => ({
  src: `https://picsum.photos/seed/${80 + i}/1600/1000`,
  alt: `Photograph ${i + 1}`,
  caption: i % 2 ? `Caption for photograph ${i + 1}` : undefined,
}));

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "lightbox",
    cases: [
      caseOf(
        "a thumbnail grid opening the viewer (#cat-lb)",
        html`
          ${Grid({
            items: items.map((item, i) =>
              GridCol({
                span: 4,
                content: LightboxLink({
                  controls: "cat-lb",
                  index: i,
                  href: item.src,
                  content: html`
                    <img
                      src="https://picsum.photos/seed/${String(80 + i)}/400/250"
                      width="400"
                      height="250"
                      alt="${item.alt}"
                      loading="lazy"
                      decoding="async"
                    >
                  `,
                  attrs: { id: `cat-lb-thumb-${i}` },
                }),
              })
            ),
          })}${Lightbox({ id: "cat-lb", items })}
        `,
      ),
      caseOf(
        "a single image",
        html`
          ${LightboxLink({
            controls: "cat-lb-one",
            index: 0,
            href: items[0].src,
            content: html`
              <img
                src="https://picsum.photos/seed/80/400/250"
                width="400"
                height="250"
                alt="${items[0].alt}"
                loading="lazy"
                decoding="async"
              >
            `,
            attrs: { class: "cat-narrow" },
          })}${Lightbox({ id: "cat-lb-one", items: items.slice(0, 1), label: "The photograph" })}
        `,
      ),
    ],
  };
}
