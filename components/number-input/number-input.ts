import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type NumberInputSize = "sm" | "md" | "lg";

/**
 * `plain` shows the value as typed; `group` shows thousands separators
 * (number-input.js formats the field on blur with `Intl.NumberFormat` and
 * restores the raw value on focus — what submits is always the raw
 * number, and without JS the field is plain).
 */
export type NumberInputFormat = "plain" | "group";

export type NumberInputProps = {
  id: string;
  name: string;
  value?: number;
  min?: number;
  max?: number;
  /** @default 1 */
  step?: number | "any";
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Reported invalid by the server — draws the danger frame. */
  invalid?: boolean;
  /** @default "md" */
  size?: NumberInputSize;
  /** A suffix addon after the field: `"kg"`, `"%"`, `"seats"`. */
  unit?: string;
  /** @default "plain" */
  format?: NumberInputFormat;
  /** Accessible names of the two steppers. @default { decrement: "Decrease", increment: "Increase" } */
  labels?: { decrement?: string; increment?: string };
  /** Extra attributes on the root; a `class` merges. */
  attrs?: Attrs;
};

/**
 * A native `<input type="number">` between a − and a + stepper. The
 * browser's own spin buttons are hidden; the steppers call `stepDown()`/
 * `stepUp()` (number-input.js), hold to repeat, and grey out at `min`/`max`.
 * Without JS the input is still a number field with keyboard stepping.
 */
export function NumberInput(props: NumberInputProps): Html {
  const size = props.size ?? "md";
  const labels = { decrement: "Decrease", increment: "Increase", ...props.labels };
  const stepper = (dir: "down" | "up", label: string, icon: "minus" | "plus") =>
    html`
      <button
        type="button"
        class="number-input__step"
        data-number-step="${dir}"
        aria-label="${label}"
        tabindex="-1"
        ${renderAttrs({ disabled: props.disabled ? "" : undefined })}
      >
        ${Icon(icon, { size: 14 })}
      </button>
    `;
  return html`
    <div ${classAttrs(
      "number-input",
      props.attrs,
      size !== "md" && `number-input--${size}`,
      props.invalid && "number-input--invalid",
      props.disabled && "number-input--disabled",
    )} data-number-input${renderAttrs({ "data-number-group": props.format === "group" ? "" : undefined })}>
      ${stepper("down", labels.decrement, "minus")}<input
        class="${cx("input", "number-input__field", size !== "md" && `input--${size}`)}"
        type="number"
        inputmode="decimal"
        id="${props.id}"
        name="${props.name}"
        ${renderAttrs({
          value: props.value === undefined ? undefined : String(props.value),
          min: props.min === undefined ? undefined : String(props.min),
          max: props.max === undefined ? undefined : String(props.max),
          step: props.step === undefined ? undefined : String(props.step),
          placeholder: props.placeholder,
          disabled: props.disabled ? "" : undefined,
          required: props.required ? "" : undefined,
          "aria-invalid": props.invalid ? "true" : undefined,
        })}
      >${props.unit
        ? html`
          <span class="number-input__unit">${props.unit}</span>
        `
        : ""}${stepper("up", labels.increment, "plus")}
    </div>
  `;
}
