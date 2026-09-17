import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

/** What a control needs to be announced correctly inside a FormField. */
export type FieldA11y = {
  id: string;
  /** Put this on the control's `aria-describedby` — the error or help id. */
  describedBy?: string;
  invalid: boolean;
};

export type FormFieldProps = {
  id?: string;
  label?: string | Html;
  required?: boolean;
  help?: string | Html;
  /** Set this from `RapidFormError.fields[name]` (§6) to show a field error
   * instead of the help text. */
  error?: string;
  /**
   * The control. Pass a function to receive `{ id, describedBy, invalid }`
   * so the control can wire `aria-describedby`/`aria-invalid` itself —
   * a plain `Html` is fine when the control has no text to be described by.
   */
  control: Html | ((a11y: FieldA11y) => Html);
  /** Span at the `md` breakpoint inside a `.form-grid`: 12 (default), 6, 4, 3. */
  span?: 12 | 6 | 4 | 3;
  attrs?: Attrs;
};

export function FormField(props: FormFieldProps): Html {
  const id = props.id ?? "";
  const describedBy = props.error ? `${id}-error` : props.help ? `${id}-help` : undefined;
  const control = typeof props.control === "function"
    ? props.control({ id, describedBy, invalid: Boolean(props.error) })
    : props.control;

  return html`<div${
    classAttrs("form-field", props.attrs, props.span && props.span !== 12 && `form-grid__col-${props.span}`)
  }>${
    props.label &&
    html`<label class="form-field__label" for="${id}">${props.label}${
      props.required && html`<span class="form-field__required" aria-hidden="true">*</span>`
    }</label>`
  }${control}${
    props.error
      ? html`<p class="form-field__error" id="${id}-error" role="alert">${props.error}</p>`
      : props.help && html`<p class="form-field__help" id="${id}-help">${props.help}</p>`
  }</div>`;
}

export type FormGridProps = {
  fields: Html[];
  attrs?: Attrs;
};

export function FormGrid(props: FormGridProps): Html {
  return html`<div${classAttrs("form-grid", props.attrs)}>${props.fields}</div>`;
}

export function FormActions(props: { content: Html; attrs?: Attrs }): Html {
  return html`<div${classAttrs("form-actions", props.attrs)}>${props.content}</div>`;
}
