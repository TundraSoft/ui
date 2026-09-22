import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { attr, Counter, messageAttrs, type ValidationMessages } from "../input/input.ts";

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
  /** A route that checks the value on the server on blur — see `Input.validateAction`. */
  validateAction?: string;
  /** With `maxLength`: a live "12 / 280" counter under the control. Needs an `id` or `name`. */
  counter?: boolean;
  /** Grow with the content instead of scrolling (`field-sizing: content`, with a script fallback). */
  autosize?: boolean;
  extraClass?: string;
  attrs?: Attrs;
};

export function Textarea(props: TextareaProps): Html {
  const className = cx(
    "input",
    "textarea",
    props.invalid && "input--invalid",
    props.autosize && "textarea--autosize",
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
    "data-validate-action": props.validateAction,
    "data-counter": props.counter && props.maxLength ? "" : undefined,
    "data-autosize": props.autosize ? "" : undefined,
    "aria-invalid": props.invalid ? "true" : undefined,
  };

  const control = html`<textarea class="${className}" ${renderAttrs(attrs)}>${props.value ?? ""}</textarea>`;
  if (props.counter && props.maxLength) {
    return html`${control}${Counter(props.id ?? props.name ?? "", props.maxLength, props.value?.length ?? 0)}`;
  }
  return control;
}
