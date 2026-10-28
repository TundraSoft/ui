/** Catalogue cases for components/scrollspy — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Grid, GridCol } from "../../../components/grid/grid.ts";
import { ScrollSpy } from "../../../components/scrollspy/scrollspy.ts";
import { caseCopy, caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "scrollspy",
    cases: [
      caseOf(
        "sticky beside sections — the one being read is marked, a sub-section marks its parent too (#cat-spy-1)",
        Grid({
          items: [
            GridCol({
              span: 3,
              content: ScrollSpy({
                id: "cat-spy-1",
                sticky: true,
                items: [
                  { label: "Overview", href: "#cat-spy-overview" },
                  {
                    label: "Install",
                    href: "#cat-spy-install",
                    children: [
                      { label: "With Deno", href: "#cat-spy-install-deno" },
                      { label: "With npm", href: "#cat-spy-install-npm" },
                    ],
                  },
                  { label: "Usage", href: "#cat-spy-usage" },
                  { label: "API", href: "#cat-spy-api" },
                ],
              }),
            }),
            GridCol({
              span: 9,
              content: html`
                <h3 id="cat-spy-overview">Overview</h3>${caseCopy}${caseCopy}
                <h3 id="cat-spy-install">Install</h3>${caseCopy}
                <h4 id="cat-spy-install-deno">With Deno</h4>${caseCopy}${caseCopy}
                <h4 id="cat-spy-install-npm">With npm</h4>${caseCopy}${caseCopy}
                <h3 id="cat-spy-usage">Usage</h3>${caseCopy}${caseCopy}${caseCopy}
                <h3 id="cat-spy-api">API</h3>${caseCopy}${caseCopy}
              `,
            }),
          ],
        }),
      ),
      caseOf(
        "offset: 0 and a custom label — any element with data-scrollspy around hash links gets the same behaviour",
        ScrollSpy({
          id: "cat-spy-2",
          label: "Sections of this group",
          offset: 0,
          items: [{ label: "Scroll spy", href: "#cat-scrollspy" }, { label: "Back to top", href: "#cat-back-to-top" }, {
            label: "Menubar",
            href: "#cat-menubar",
          }],
        }),
      ),
    ],
  };
}
