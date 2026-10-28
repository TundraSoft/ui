import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";

/** How the value is shown in the field and posted: `#rrggbb`, `rgb(r g b)`, `hsl(h s% l%)` (with `/ a` when `alpha`). */
export type ColorFormat = "hex" | "rgb" | "hsl";

export type ColorPickerProps = {
  /** Required: the trigger carries it (the root when `inline`); the panel is `<id>-panel`, the native input `<id>-native`. */
  id: string;
  name?: string;
  /** Any CSS colour the script can parse: `#rgb`, `#rrggbb[aa]`, `rgb()`, `hsl()`. @default "#3b82f6" */
  value?: string;
  /** @default "hex" */
  format?: ColorFormat;
  /**
   * An alpha slider. The posted value then carries the alpha (`#rrggbbaa`,
   * `rgb(… / a)`); a no-JS page posts the native input's opaque colour.
   */
  alpha?: boolean;
  /** Swatches under the picker, any parseable colour each. */
  presets?: string[];
  /** Draw the panel in the flow, always open, with no trigger. */
  inline?: boolean;
  /** Accessible name of the trigger and the panel. @default "Colour" */
  label?: string;
  disabled?: boolean;
  attrs?: Attrs;
};

/**
 * A colour picker: a swatch button that opens a panel with a
 * saturation/brightness square, a hue slider, an alpha slider when asked
 * for, a text field in the chosen `format`, the contrast ratio of the
 * colour against the page surface, and preset swatches. The form control
 * is a native `<input type="color">` with `name` — what a no-JS page
 * shows and posts — kept in step by color-picker.js (`change` fires on
 * it; `color-picker:change` with `{ hex, rgb, hsl, alpha, value }` fires on
 * the root). Square: drag or arrow keys (Shift: 10 steps). Escape closes
 * and returns focus to the trigger.
 */
export function ColorPicker(props: ColorPickerProps): Html {
  const id = props.id;
  const format = props.format ?? "hex";
  const value = props.value ?? "#3b82f6";
  const label = props.label ?? "Colour";
  const scope = `${id}-search-scope`;
  const root = classAttrs(
    "color-picker",
    mergeAttrs(props.attrs, {
      // The trigger carries the id; an inline picker has none, so the root does.
      id: props.inline ? id : undefined,
      "data-color-picker": "",
      "data-color": value,
      "data-format": format,
      "data-alpha": props.alpha ? "" : undefined,
      "data-color-picker-disabled": props.disabled ? "" : undefined,
    }),
    props.inline && "color-picker--inline",
  );
  const native = html`<input type="color" ${
    classAttrs("color-picker__native", {
      id: `${id}-native`,
      name: props.name,
      value: value.startsWith("#") && value.length === 7 ? value : undefined,
      disabled: props.disabled ? "" : undefined,
      "aria-label": label,
    })
  }>`;
  const trigger = props.inline ? "" : html`
    <button type="button"
      ${classAttrs("color-picker__trigger", {
        id,
        "data-color-picker-trigger": "",
        "aria-haspopup": "dialog",
        "aria-expanded": "false",
        "aria-controls": `${id}-panel`,
        "aria-label": label,
        disabled: props.disabled ? "" : undefined,
      })}><span class="color-picker__swatch" aria-hidden="true"></span><span class="color-picker__text" data-color-picker-text>${value}</span></button>
  `;
  const alpha = props.alpha
    ? html`<label class="color-picker__slider"><span class="sr-only">Alpha</span><input type="range" ${
      classAttrs("color-picker__alpha", {
        "data-color-picker-alpha": "",
        min: "0",
        max: "100",
        step: "1",
        value: "100",
        form: scope,
        "data-validate-skip": "",
      })
    }></label>`
    : "";
  const presets = props.presets?.length
    ? html`<div class="color-picker__presets" role="group" aria-label="Presets">${
      props.presets.map((c) =>
        html`<button type="button" ${
          classAttrs("color-picker__preset", {
            "data-color-picker-preset": "",
            "data-color": c,
            "aria-label": c,
            title: c,
          })
        }></button>`
      )
    }</div>`
    : "";
  const panel = html`<div ${
    classAttrs("color-picker__panel", {
      id: `${id}-panel`,
      role: props.inline ? "group" : "dialog",
      "aria-label": label,
      hidden: props.inline ? undefined : "",
    })
  }>
    <div ${
    classAttrs("color-picker__area", {
      "data-color-picker-area": "",
      tabindex: "0",
      role: "slider",
      "aria-label": "Saturation and brightness",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": "100",
    })
  }><span class="color-picker__thumb"></span></div>
    <div class="color-picker__sliders">
      <label class="color-picker__slider"><span class="sr-only">Hue</span><input type="range" ${
    classAttrs("color-picker__hue", {
      "data-color-picker-hue": "",
      min: "0",
      max: "360",
      step: "1",
      value: "0",
      form: scope,
      "data-validate-skip": "",
    })
  }></label>
      ${alpha}
    </div>
    <div class="color-picker__fields">
      <input type="text" ${
    classAttrs("input input--sm color-picker__field", {
      "data-color-picker-field": "",
      value,
      form: scope,
      "data-validate-skip": "",
      "aria-label": "Colour value",
      autocomplete: "off",
      spellcheck: "false",
    })
  }>
      <span class="color-picker__contrast" data-color-picker-contrast title="Contrast against the page surface"></span>
    </div>
    ${presets}
  </div>`;

  return html`
    <div ${root}>
      ${native}
      <div class="color-picker__ui">${trigger}${panel}</div>
    </div>
  `;
}
