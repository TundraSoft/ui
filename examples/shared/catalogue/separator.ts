/** Catalogue cases for components/separator — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import {
  Separator,
  type SeparatorOrientation,
  type SeparatorSpacing,
} from "../../../components/separator/separator.ts";
import { caseCopy, caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const spacings: SeparatorSpacing[] = ["sm", "md", "lg"];
const orientations: SeparatorOrientation[] = ["horizontal", "vertical"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "separator",
    cases: [
      ...spacings.map((spacing) => caseOf(`spacing ${spacing}`, html`${caseCopy}${Separator({ spacing })}${caseCopy}`)),
      caseOf("with a label", html`${caseCopy}${Separator({ label: "or" })}${caseCopy}`),
      caseOf(
        "decorative (aria-hidden)",
        html`${caseCopy}${Separator({ decorative: true, label: "Today" })}${caseCopy}`,
      ),
      ...orientations.map((orientation) =>
        caseOf(
          `orientation ${orientation} · in a toolbar`,
          caseRow(
            Button({ label: "Cut", variant: "ghost", size: "sm" }),
            Button({ label: "Copy", variant: "ghost", size: "sm" }),
            Separator({ orientation, spacing: "sm" }),
            Button({ label: "Paste", variant: "ghost", size: "sm" }),
          ),
        )
      ),
    ],
  };
}
