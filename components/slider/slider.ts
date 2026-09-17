import { type Html, html } from "@tundralibs/rapid/ui";
import { renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type SliderProps = {
  id: string;
  name: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  /** `(v) => "12 workers"`. Pluralise here, not in the template. */
  format?: (value: number) => string;
  /**
   * Unit word appended to the live value by slider.js as the thumb moves
   * (`"workers"`), with an optional singular form (`"worker"`). Without
   * it the script shows the bare number — `format` only runs server-side.
   */
  unit?: string;
  unitOne?: string;
  /** Tick labels under the track; implies the stepped treatment. The
   * live output shows the matching label as the thumb moves. */
  scale?: string[];
  disabled?: boolean;
};

/**
 * CSP-clean: the painted track's position is `--slider-pct`, which
 * slider.js sets from the input on load and on every `input` event. No
 * inline style is emitted. Without JS the painted track is hidden by CSS
 * (`html:not(.js)`) and the native range control shows instead, so the
 * value is never misrepresented.
 */
export function Slider(props: SliderProps): Html {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const value = props.value ?? min;
  const stepped = !!props.scale?.length;
  const activeIndex = Math.round((value - min) / step);

  let initial = String(value);
  if (props.format) initial = props.format(value);
  else if (stepped) initial = props.scale![activeIndex] ?? String(value);
  else if (props.unit) {
    const unit = value === 1 ? props.unitOne ?? props.unit : props.unit;
    initial = `${value} ${unit}`;
  }

  const ticks = stepped
    ? html`<span class="slider__ticks">${props.scale!.map(() => html`<span class="slider__tick"></span>`)}</span>`
    : "";

  return html`
    <div class="${cx("slider", stepped && "slider--stepped")}"
      data-slider${renderAttrs({
        "data-slider-unit": props.unit,
        "data-slider-unit-one": props.unitOne,
        "data-slider-labels": stepped ? JSON.stringify(props.scale) : undefined,
      })}>${props.label
        ? html`
          <div
            class="slider__head"><label class="slider__label" for="${props.id}">${props
              .label}</label><output class="slider__value" for="${props
              .id}" data-slider-output>${initial}</output></div>
        `
        : ""}<div class="slider__control"><input class="slider__input" id="${props.id}" name="${props
        .name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"${renderAttrs({
          disabled: props.disabled ? "" : undefined,
        })}><span class="slider__track"></span><span class="slider__fill"></span>${ticks}<span class="slider__thumb"></span></div>${props
          .scale?.length
        ? html`<div class="slider__scale">${
          props.scale.map((s, i) =>
            html`<span class="${
              cx("slider__scale-item", i === activeIndex && "slider__scale-item--active")
            }">${s}</span>`
          )
        }</div>`
        : html`<div class="slider__scale"><span>${min}</span><span>${max}</span></div>`}</div>
  `;
}
