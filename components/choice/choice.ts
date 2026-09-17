import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type ChoiceType = "checkbox" | "radio";

export type ChoiceProps = {
  type: ChoiceType;
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  label?: string | Html;
  attrs?: Attrs;
};

export function Choice(props: ChoiceProps): Html {
  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    name: props.name,
    value: props.value,
    checked: props.checked ? "" : undefined,
    disabled: props.disabled ? "" : undefined,
  };

  return html`<label class="choice"><input type="${props.type}" class="choice__input"${renderAttrs(attrs)}>${
    props.label && html`<span class="choice__label">${props.label}</span>`
  }</label>`;
}

export function Checkbox(props: Omit<ChoiceProps, "type">): Html {
  return Choice({ ...props, type: "checkbox" });
}

export function Radio(props: Omit<ChoiceProps, "type">): Html {
  return Choice({ ...props, type: "radio" });
}

export type ChoiceGroupProps = {
  items: Html[];
  inline?: boolean;
  attrs?: Attrs;
};

export function ChoiceGroup(props: ChoiceGroupProps): Html {
  const className = cx("choice-group", props.inline && "choice-group--inline");
  return html`
    <div class="${className}" ${renderAttrs(props.attrs ?? {})}>${props.items}</div>
  `;
}
