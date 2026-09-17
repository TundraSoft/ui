import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type TextareaProps = {
  id?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  invalid?: boolean;
  extraClass?: string;
  attrs?: Attrs;
};

export function Textarea(props: TextareaProps): Html {
  const className = cx(
    "input",
    "textarea",
    props.invalid && "input--invalid",
    props.extraClass,
  );

  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    name: props.name,
    placeholder: props.placeholder,
    rows: props.rows !== undefined ? String(props.rows) : undefined,
    disabled: props.disabled ? "" : undefined,
    readonly: props.readonly ? "" : undefined,
    required: props.required ? "" : undefined,
    "aria-invalid": props.invalid ? "true" : undefined,
  };

  return html`
    <textarea class="${className}" ${renderAttrs(attrs)}>${props.value ?? ""}</textarea>
  `;
}
