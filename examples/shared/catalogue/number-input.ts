/** Catalogue cases for components/number-input — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { NumberInput } from "../../../components/number-input/number-input.ts";
import { FormField } from "../../../components/form-field/form-field.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState, srLabel } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const sizes = ["sm", "md", "lg"] as const;
const formats = ["plain", "group"] as const;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "number-input",
    cases: [
      caseOf(
        "sizes (#cat-ni-md: steppers, hold to repeat, bounds 0–10)",
        caseRow(
          ...sizes.map((size) =>
            html`
              <div class="cat-narrow">${srLabel(`cat-ni-${size}`, `Quantity (${size})`)}${NumberInput({
                id: `cat-ni-${size}`,
                name: `qty-${size}`,
                size,
                value: 2,
                min: 0,
                max: 10,
              })}</div>
            `
          ),
        ),
      ),
      caseOf(
        "unit, step, format group (thousands separators while not focused — #cat-ni-group)",
        caseRow(
          ...formats.map((format) =>
            html`
              <div class="cat-narrow">${srLabel(`cat-ni-${format}`, `Amount (${format})`)}${NumberInput({
                id: `cat-ni-${format}`,
                name: `amount-${format}`,
                format,
                value: format === "group" ? 125000 : 2.5,
                step: format === "group" ? 500 : 0.5,
                min: 0,
                unit: format === "group" ? "USD" : "kg",
              })}</div>
            `
          ),
        ),
      ),
      caseOf(
        "in a FormField; invalid / disabled",
        caseRow(
          html`
            <div class="cat-narrow">${FormField({
              id: "cat-ni-seats",
              label: "Seats",
              help: "Up to 500 per workspace.",
              control: NumberInput({ id: "cat-ni-seats", name: "seats", value: 5, min: 1, max: 500, required: true }),
            })}</div>
          `,
          html`
            <div class="cat-narrow">${FormField({
              id: "cat-ni-invalid",
              label: "Quantity",
              error: "At least 1.",
              control: NumberInput({ id: "cat-ni-invalid", name: "bad", value: 0, min: 1, invalid: true }),
            })}</div>
          `,
          html`
            <div class="cat-narrow">${FormField({
              id: "cat-ni-disabled",
              label: "Locked",
              control: NumberInput({
                id: "cat-ni-disabled",
                name: "off",
                value: 3,
                disabled: true,
              }),
            })}</div>
          `,
        ),
      ),
    ],
  };
}
