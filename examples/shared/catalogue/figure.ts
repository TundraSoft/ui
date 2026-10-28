/** Catalogue cases for components/figure — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Figure, type FigureAlign, type FigureSize } from "../../../components/figure/figure.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const aligns: FigureAlign[] = ["start", "center", "end", "wide"];
const sizes: FigureSize[] = ["sm", "md", "lg"];

const picture = (seed: string) =>
  html`
    <img
      src="https://picsum.photos/seed/${seed}/800/450"
      width="800"
      height="450"
      alt="A placeholder photograph"
      loading="lazy"
      decoding="async"
    >
  `;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "figure",
    cases: [
      ...aligns.map((align) =>
        caseOf(
          `align ${align} · size sm`,
          Figure({
            align,
            size: "sm",
            media: picture(`fig-${align}`),
            caption: `Figure aligned ${align}. The caption follows the alignment.`,
          }),
        )
      ),
      ...sizes.map((size) =>
        caseOf(
          `size ${size}`,
          Figure({
            size,
            media: picture(`fig-${size}`),
            caption: html`<strong>Figure 1.</strong> Caption with markup.`,
          }),
        )
      ),
      caseOf("no caption", Figure({ size: "sm", media: picture("fig-plain") })),
    ],
  };
}
