/** Usage examples for components/color-picker — merged into examples/docs/usage.ts. */
import { ColorPicker } from "../../../components/color-picker/color-picker.ts";
import { FormField } from "../../../components/form-field/form-field.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/color-picker": [
    {
      title: "A brand colour with presets",
      note:
        'The native `<input type="color" name>` posts `#rrggbb`; a no-JS page shows it alone. `color-picker:change` on the root carries `{ hex, rgb, hsl, alpha, value }`.',
      render: () =>
        FormField({
          id: "brand-native",
          label: "Brand colour",
          control: ColorPicker({
            id: "brand",
            name: "brand",
            value: "#3b82f6",
            presets: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
          }),
        }),
    },
    {
      title: "An overlay tint: alpha, posted as hsl()",
      note:
        "With `alpha` or a non-hex `format` the script moves `name` to a hidden input holding the formatted value (`hsl(h s% l% / a)` here); without the script the native input posts the opaque colour.",
      render: () => ColorPicker({ id: "tint", name: "tint", value: "#0f172a80", alpha: true, format: "hsl" }),
    },
    {
      title: "Inline, on a settings page",
      render: () => ColorPicker({ id: "accent", name: "accent", value: "#8b5cf6", inline: true }),
    },
  ],
};
