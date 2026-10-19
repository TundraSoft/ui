import { type Html, html } from "@tundralibs/rapid/ui";
import { inline } from "../../shared/inline.ts";
import { type Attrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";

export type SwitchProps = {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  label?: string | Html;
  /**
   * Words that follow the checked state ("On" / "Off", "Shown" /
   * "Hidden"): both are rendered and CSS shows the one that matches, so
   * the word agrees with the control at every moment with no script and
   * no re-render. Alone, the word is the switch's label. Beside a `label`,
   * the label stays the switch's name and the word is a visual echo of the
   * state (hidden from assistive tech, which announces checked/unchecked).
   */
  labels?: { on: string | Html; off: string | Html };
  /** Secondary line under the label explaining the consequence. */
  hint?: string | Html;
  attrs?: Attrs;
};

export function Switch(props: SwitchProps): Html {
  const attrs: Attrs = mergeAttrs(props.attrs, {
    id: props.id,
    name: props.name,
    value: props.value,
    checked: props.checked ? "" : undefined,
    disabled: props.disabled ? "" : undefined,
  });

  const state = props.labels &&
    html`
      <span class="switch__state switch__state--on">${props.labels.on}</span><span
        class="switch__state switch__state--off">${props.labels.off}</span>
    `;
  const label = props.label
    ? html`<span class="switch__label">${props.label}${
      state && html`<span class="switch__states" aria-hidden="true">${state}</span>`
    }</span>`
    : state && html`<span class="switch__label switch__states">${state}</span>`;
  const text = props.hint
    ? html`<span class="switch__text">${label}<span class="switch__hint">${props.hint}</span></span>`
    : label;

  return inline(html`
    <label
      class="switch"><input type="checkbox" class="switch__input"${renderAttrs(
        attrs,
      )}><span class="switch__track"><span class="switch__thumb"></span></span>${text}</label>
  `);
}
