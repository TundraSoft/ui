import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { attr, messageAttrs, type ValidationMessages } from "../input/input.ts";

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
  /** Native constraints; `Form({ validate: true })` shows them inline. */
  minLength?: number;
  maxLength?: number;
  /** Per-rule messages for the validator. */
  messages?: ValidationMessages;
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
    ...messageAttrs(props.messages),
    minlength: attr(props.minLength),
    maxlength: attr(props.maxLength),
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
