import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type PageHeaderProps = {
  title: string | Html;
  subtitle?: string | Html;
  /** Usually a `Breadcrumb`. */
  breadcrumb?: Html;
  /** Buttons, a Segmented, a search… */
  actions?: Html;
  /**
   * The heading level: `1` for the page, `2` for a section's own header
   * under the page's (a settings sub-page) — smaller, same layout.
   * @default 1
   */
  level?: 1 | 2;
  /** Beside the title: a status or plan `Badge`, a count. */
  badge?: Html;
  attrs?: Attrs;
};

/** The title row at the top of a page: breadcrumb, h1, actions. */
export function PageHeader(props: PageHeaderProps): Html {
  const title = props.level === 2
    ? html`<h2 class="page-header__title">${props.title}</h2>`
    : html`<h1 class="page-header__title">${props.title}</h1>`;
  return html`<div${
    classAttrs("page-header", props.attrs, props.level === 2 && "page-header--sub")
  }><div class="page-header__heading">${props.breadcrumb ?? ""}${
    props.badge ? html`<div class="page-header__title-row">${title}${props.badge}</div>` : title
  }${props.subtitle && html`<p class="page-header__subtitle">${props.subtitle}</p>`}</div>${
    props.actions && html`<div class="page-header__actions">${props.actions}</div>`
  }</div>`;
}
