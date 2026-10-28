/** Usage examples for components/number-input — merged into examples/docs/usage.ts. */
import { NumberInput } from "../../../components/number-input/number-input.ts";
import { FormField } from "../../../components/form-field/form-field.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/number-input": [
    {
      title: "Seats on a plan",
      render: () =>
        FormField({
          id: "seats",
          label: "Seats",
          control: NumberInput({ id: "seats", name: "seats", value: 5, min: 1, max: 500, required: true }),
        }),
    },
    {
      title: "A budget with thousands separators",
      note: '`format: "group"` shows `125,000` while the field is not focused; the raw number is what submits.',
      render: () =>
        NumberInput({ id: "budget", name: "budget", value: 125000, step: 500, min: 0, unit: "USD", format: "group" }),
    },
  ],
};
