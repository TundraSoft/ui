import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";

export type SwitchProps = {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  label?: string | Html;
  /** Secondary line under the label explaining the consequence. */
  hint?: string | Html;
  attrs?: Attrs;
};

export function Switch(props: SwitchProps): Html {
  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    name: props.name,
    value: props.value,
    checked: props.checked ? "" : undefined,
    disabled: props.disabled ? "" : undefined,
  };

  const label = props.label && html`<span class="switch__label">${props.label}</span>`;
  const text = props.hint
    ? html`<span class="switch__text">${label}<span class="switch__hint">${props.hint}</span></span>`
    : label;

  return html`
    <label
      class="switch"><input type="checkbox" class="switch__input"${renderAttrs(
        attrs,
      )}><span class="switch__track"><span class="switch__thumb"></span></span>${text}</label>
  `;
}
