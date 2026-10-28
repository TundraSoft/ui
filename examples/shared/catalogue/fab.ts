/** Catalogue cases for components/fab — see examples/shared/catalogue.ts. */
import { Fab, type FabPosition, type FabSize, type FabVariant } from "../../../components/fab/fab.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const variants: FabVariant[] = ["primary", "accent"];
const sizes: FabSize[] = ["md", "lg"];
const positions: FabPosition[] = ["end", "start", "center"];
const STATIC = { class: "fab--static" };

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "fab",
    cases: [
      ...variants.map((variant) =>
        caseOf(
          `variant ${variant} · shown in flow`,
          caseRow(
            Fab({ id: `cat-fab-${variant}`, variant, icon: Icon("plus", { size: 24 }), label: "New", attrs: STATIC }),
            Fab({
              id: `cat-fab-${variant}-ext`,
              variant,
              icon: Icon("edit", { size: 20 }),
              label: "Compose",
              extended: true,
              attrs: STATIC,
            }),
          ),
        )
      ),
      ...sizes.map((size) =>
        caseOf(
          `size ${size}`,
          Fab({ id: `cat-fab-size-${size}`, size, icon: Icon("plus", { size: 24 }), label: "New", attrs: STATIC }),
        )
      ),
      caseOf(
        `positions ${positions.join(" / ")} · as a link · these cases stay in flow`,
        caseRow(
          ...positions.map((position) =>
            Fab({
              id: `cat-fab-pos-${position}`,
              position,
              href: "#",
              icon: Icon("arrowUp", { size: 20 }),
              label: `Position ${position}`,
              extended: true,
              attrs: STATIC,
            })
          ),
        ),
      ),
      caseOf(
        "hideOnScroll · fixed at the bottom end of this page",
        Fab({ id: "cat-fab-fixed", icon: Icon("plus", { size: 24 }), label: "New item", hideOnScroll: true }),
      ),
    ],
  };
}
