/** Catalogue cases for components/toggle — see examples/shared/catalogue.ts. */
import { Toggle, ToggleGroup, type ToggleSize, type ToggleVariant } from "../../../components/toggle/toggle.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const variants: ToggleVariant[] = ["subtle", "outline"];
const sizes: ToggleSize[] = ["sm", "md"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "toggle",
    cases: [
      ...variants.map((variant) =>
        caseOf(
          `variant ${variant} · off, pressed, disabled, with name + value`,
          caseRow(
            Toggle({ id: `cat-toggle-${variant}-off`, variant, label: "Follow" }),
            Toggle({ id: `cat-toggle-${variant}-on`, variant, label: "Following", pressed: true }),
            Toggle({ id: `cat-toggle-${variant}-disabled`, variant, label: "Disabled", disabled: true }),
            Toggle({
              id: `cat-toggle-${variant}-named`,
              variant,
              label: "Pinned",
              icon: Icon("star", { size: 16 }),
              name: "pinned",
              value: "1",
            }),
          ),
        )
      ),
      ...sizes.map((size) =>
        caseOf(
          `size ${size}`,
          caseRow(
            Toggle({ id: `cat-toggle-size-${size}`, size, label: "Bold", icon: Icon("bold", { size: 16 }) }),
            Toggle({
              id: `cat-toggle-size-${size}-icon`,
              size,
              label: "Italic",
              icon: Icon("italic", { size: 16 }),
              iconOnly: true,
            }),
          ),
        )
      ),
      caseOf(
        "group · exclusive (grid / list view)",
        ToggleGroup({
          id: "cat-toggle-view",
          label: "View",
          exclusive: true,
          items: [
            {
              id: "cat-toggle-view-grid",
              label: "Grid",
              icon: Icon("dashboard", { size: 16 }),
              iconOnly: true,
              pressed: true,
              name: "view",
              value: "grid",
            },
            {
              id: "cat-toggle-view-list",
              label: "List",
              icon: Icon("list", { size: 16 }),
              iconOnly: true,
              name: "view",
              value: "list",
            },
          ],
        }),
      ),
      caseOf(
        "group · outline, multiple (B / I / U)",
        ToggleGroup({
          id: "cat-toggle-format",
          label: "Formatting",
          variant: "outline",
          items: [
            {
              id: "cat-toggle-format-b",
              label: "Bold",
              icon: Icon("bold", { size: 16 }),
              iconOnly: true,
              pressed: true,
            },
            { id: "cat-toggle-format-i", label: "Italic", icon: Icon("italic", { size: 16 }), iconOnly: true },
            { id: "cat-toggle-format-u", label: "Underline", icon: Icon("underline", { size: 16 }), iconOnly: true },
          ],
        }),
      ),
    ],
  };
}
