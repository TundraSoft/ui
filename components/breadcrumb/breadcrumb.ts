import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  /**
   * When the trail does not fit its container, fold the middle crumbs into
   * a "…" disclosure listing them, keeping the first and the current page
   * whole. A container query, no script: give the breadcrumb a width to
   * measure (it is a block; in a flex row, let it grow).
   */
  collapse?: boolean;
  attrs?: Attrs;
};

export function Breadcrumb(props: BreadcrumbProps): Html {
  const last = props.items.length - 1;
  const middle = props.items.slice(1, -1);
  const fold = props.collapse && middle.length > 0;
  const items = props.items.map((item, index) => {
    const isCurrent = index === last;
    const content = item.href && !isCurrent
      ? html`<a class="breadcrumb__link" href="${item.href}">${item.label}</a>`
      : item.label;
    const mid = fold && index > 0 && index < last;
    return html`${
      fold && index === 1
        ? html`
          <li class="breadcrumb__item breadcrumb__more">
            <details class="breadcrumb__menu">
              <summary class="breadcrumb__more-button" aria-label="Show the path">${Icon("more", {
                size: 14,
              })}</summary>
              <ul class="breadcrumb__menu-list">${middle.map((m) =>
                html`<li>${
                  m.href ? html`<a class="breadcrumb__menu-link" href="${m.href}">${m.label}</a>` : m.label
                }</li>`
              )}</ul>
            </details>
          </li>
        `
        : ""
    }<li class="breadcrumb__item${mid ? " breadcrumb__item--mid" : ""}" ${
      isCurrent
        ? html`
          aria-current="page"
        `
        : ""
    }>${content}</li>`;
  });

  return html`
    <nav aria-label="Breadcrumb" ${renderAttrs({
      class: fold ? "breadcrumb-nav breadcrumb-nav--collapse" : undefined,
    })}>
      <ol class="breadcrumb" ${renderAttrs(props.attrs ?? {})}>${items}</ol>
    </nav>
  `;
}
