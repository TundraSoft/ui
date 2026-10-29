/** Catalogue cases for components/ratio — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Figure } from "../../../components/figure/figure.ts";
import { Ratio, type RatioValue } from "../../../components/ratio/ratio.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const ratios: RatioValue[] = ["16x9", "4x3", "1x1", "21x9", "3x4", "9x16"];

// A stand-in for an embed; a real page puts an <iframe> or <video> here.
const placeholder = (label: string) =>
  html`
    <div class="ratio__placeholder">${label}</div>
  `;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "ratio",
    cases: [
      ...ratios.map((ratio) =>
        caseOf(
          `ratio ${ratio}`,
          Figure({
            size: "sm",
            media: Ratio({ ratio, content: placeholder(ratio.replace("x", " : ")) }),
            caption: `A ${ratio.replace("x", ":")} box inside a small figure.`,
          }),
        )
      ),
      caseOf(
        "an image",
        Figure({
          size: "sm",
          media: Ratio({
            ratio: "4x3",
            content: html`
              <img
                src="https://picsum.photos/seed/ratio/800/600"
                width="800"
                height="600"
                alt="A placeholder photograph"
                loading="lazy"
                decoding="async"
              >
            `,
          }),
          caption: "An image cropped to 4:3 with object-fit: cover.",
        }),
      ),
    ],
  };
}
