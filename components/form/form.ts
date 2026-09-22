import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
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
  content: Html;
  attrs?: Attrs;
};

export function Form(props: FormProps): Html {
  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    action: props.action,
    method: props.method ?? "post",
    "data-validate": props.validate ? "" : undefined,
    "data-guard": props.guard ? "" : undefined,
  };

  return html`
    <form class="form" ${renderAttrs(attrs)}>${props.error && FormErrorAlert(props.error)}${props.content}</form>
  `;
}
