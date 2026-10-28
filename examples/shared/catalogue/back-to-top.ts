/** Catalogue cases for components/back-to-top — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { BackToTop, type BackToTopPosition } from "../../../components/back-to-top/back-to-top.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const positions: BackToTopPosition[] = ["end", "start"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "back-to-top",
    cases: [
      caseOf(
        "fixed to the end corner, shown once the page has scrolled 600px — scroll this page down to see it (#cat-btt-1)",
        html`
          <p class="text-muted">The live one is in the corner of this page; it appears after 600px of scrolling.</p>${BackToTop(
            { id: "cat-btt-1" },
          )}
        `,
      ),
      caseOf(
        "static — in flow, always shown (a footer slot, this catalogue); position end / start",
        caseRow(...positions.map((position) => BackToTop({ id: `cat-btt-${position}`, position, static: true }))),
      ),
      caseOf(
        "threshold 200 and a custom label",
        BackToTop({ id: "cat-btt-soon", threshold: 200, label: "Top of page", static: true }),
      ),
    ],
  };
}
