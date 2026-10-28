/** Catalogue cases for components/kbd — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Kbd, type KbdSize } from "../../../components/kbd/kbd.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const sizes: KbdSize[] = ["sm", "md"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "kbd",
    cases: [
      ...sizes.map((size) =>
        caseOf(
          `size ${size} · single key and chords`,
          caseRow(
            Kbd({ size, keys: "Esc" }),
            Kbd({ size, keys: ["⌘", "K"] }),
            Kbd({ size, keys: ["Ctrl", "Shift", "P"] }),
            Kbd({ size, keys: "↵" }),
          ),
        )
      ),
      caseOf(
        "in a sentence",
        html`
          <p>Press ${Kbd({ keys: ["⌘", "K"] })} to open the palette, then ${Kbd({ keys: "↑" })} ${Kbd({
            keys: "↓",
          })} to move and ${Kbd({ keys: "Enter" })} to pick.</p>
        `,
      ),
    ],
  };
}
