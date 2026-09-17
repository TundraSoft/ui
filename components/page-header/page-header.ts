import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type PageHeaderProps = {
  title: string | Html;
  subtitle?: string | Html;
  /** Usually a `Breadcrumb`. */
  breadcrumb?: Html;
  /** Buttons, a Segmented, a search… */
  actions?: Html;
  attrs?: Attrs;
};

/** The title row at the top of a page: breadcrumb, h1, actions. */
export function PageHeader(props: PageHeaderProps): Html {
  return html`<div${classAttrs("page-header", props.attrs)}><div class="page-header__heading">${
    props.breadcrumb ?? ""
  }<h1 class="page-header__title">${props.title}</h1>${
    props.subtitle && html`<p class="page-header__subtitle">${props.subtitle}</p>`
  }</div>${props.actions && html`<div class="page-header__actions">${props.actions}</div>`}</div>`;
}
