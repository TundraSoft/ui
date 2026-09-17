import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type AuthLayoutProps = {
  brand?: string | Html;
  /** The card / form. */
  content: Html;
  /** Marketing copy, testimonial, checklist — shown beside the form on
   * laptop+ when `split` is set; hidden on smaller screens. */
  narrative?: Html;
  split?: boolean;
  contentId?: string;
  attrs?: Attrs;
};

/** Centred auth card, optionally split with a narrative panel. */
export function AuthLayout(props: AuthLayoutProps): Html {
  const panel = html`<div class="layout__auth-panel">${
    props.brand && html`<div class="layout__auth-brand">${props.brand}</div>`
  }${props.content}</div>`;

  if (props.split) {
    return html`
      <div${classAttrs("layout layout--auth layout--auth-split", props.attrs)}>
        <section class="layout__auth-narrative">${props.narrative ?? ""}</section>
        <main class="layout__auth-form" id="${props.contentId ?? "main-content"}">${panel}</main>
        </div>
    `;
  }

  return html`<main${
    classAttrs("layout layout--auth", { ...props.attrs, id: props.contentId ?? "main-content" })
  }>${panel}</main>`;
}
