/** Catalogue cases for components/color-picker — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { type ColorFormat, ColorPicker } from "../../../components/color-picker/color-picker.ts";
import { FormField } from "../../../components/form-field/form-field.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const formats: ColorFormat[] = ["hex", "rgb", "hsl"];
const presets = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0f172a"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "color-picker",
    cases: [
      caseOf(
        "default — a swatch button opens the panel; the native color input posts (#cat-cp-1)",
        ColorPicker({ id: "cat-cp-1", name: "brand", value: "#3b82f6", presets }),
      ),
      caseOf(
        "format hex / rgb / hsl — the field and the posted value",
        caseRow(
          ...formats.map((format) =>
            ColorPicker({ id: `cat-cp-${format}`, name: `tone-${format}`, format, value: "#10b981" })
          ),
        ),
      ),
      caseOf(
        "alpha — an alpha slider; the posted value carries it (#rrggbbaa)",
        ColorPicker({ id: "cat-cp-alpha", name: "overlay", value: "#0f172a80", alpha: true, presets }),
      ),
      caseOf(
        "inline — the panel in the flow, always open, in a FormField (#cat-cp-inline)",
        FormField({
          id: "cat-cp-inline-native",
          label: "Accent",
          help: "Contrast is measured against the page surface.",
          control: ColorPicker({
            id: "cat-cp-inline",
            name: "accent",
            value: "#8b5cf6",
            inline: true,
            presets,
            attrs: { class: "mt-1" },
          }),
        }),
      ),
      caseOf(
        "disabled",
        html`
          ${ColorPicker({ id: "cat-cp-disabled", name: "frozen", value: "#ef4444", disabled: true })}
        `,
      ),
    ],
  };
}
