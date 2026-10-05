import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { FormErrorAlert } from "../alert/alert.ts";

export type FormProps = {
  id?: string;
  action?: string;
  method?: "get" | "post";
  /** rAPId's `RapidFormError` (§6) — rendered as a banner above `content`. */
  error?: { message: string; fields: Readonly<Record<string, string>> };
  /**
   * Client-side validation (form.js): the browser's own constraint checks
   * (`required`, `type`, `minLength`, `pattern`, `min`/`max`, `match`) are
   * shown inline in each field's error slot on blur and on submit, with
   * the submit blocked and the first invalid field focused. Without JS the
   * browser validates natively; the server must validate regardless.
   */
  validate?: boolean;
  /**
   * Warn before leaving the page with unsaved edits (form.js): once any
   * field changes, navigating away asks for confirmation until the form
   * submits (or is swapped out by its own reply).
   */
  guard?: boolean;
  /**
   * Submit on every change of a choice — a select, a radio, a checkbox, a
   * combobox pick — but not on typing: Enter still submits a search box
   * (shared/js/autosubmit.js). For a filter bar: give it
   * `method: "get"` and, for an in-place swap, `attrs` with `data-action`
   * / `data-target` / `data-swap` / `data-push`.
   */
  autosubmit?: boolean;
  /**
   * `view.csrfToken`: rendered as the hidden field rAPId's `csrf()`
   * middleware checks when a POST arrives without the header (a no-JS
   * submit). Pass it on every POST form.
   */
  csrfToken?: string;
  /** The field's name. @default "_csrf" */
  csrfField?: string;
  content: Html;
  attrs?: Attrs;
};

/**
 * The hidden CSRF field for a form the `Form` template does not build (a
 * one-button form, a form in a modal). rAPId's `csrf()` middleware reads
 * it when the `x-csrf-token` header is absent — a submit without JS.
 */
export function CsrfField(props: { token?: string; name?: string }): Html {
  return props.token === undefined
    ? html``
    : html`<input type="hidden" name="${props.name ?? "_csrf"}" value="${props.token}">`;
}

export function Form(props: FormProps): Html {
  const attrs: Attrs = mergeAttrs(props.attrs, {
    id: props.id,
    action: props.action,
    method: props.method ?? "post",
    "data-validate": props.validate ? "" : undefined,
    "data-guard": props.guard ? "" : undefined,
    "data-autosubmit": props.autosubmit ? "" : undefined,
  });

  return html`
    <form ${classAttrs("form", attrs)}>${CsrfField({ token: props.csrfToken, name: props.csrfField })}${props
      .error && FormErrorAlert(props.error)}${props.content}</form>
  `;
}
