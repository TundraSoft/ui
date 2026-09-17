import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { FormErrorAlert } from "../alert/alert.ts";

export type FormProps = {
  id?: string;
  action?: string;
  method?: "get" | "post";
  /** rAPId's `RapidFormError` (§6) — rendered as a banner above `content`. */
  error?: { message: string; fields: Readonly<Record<string, string>> };
  content: Html;
  attrs?: Attrs;
};

export function Form(props: FormProps): Html {
  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    action: props.action,
    method: props.method ?? "post",
  };

  return html`
    <form class="form" ${renderAttrs(attrs)}>${props.error && FormErrorAlert(props.error)}${props.content}</form>
  `;
}
