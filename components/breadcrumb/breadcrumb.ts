import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb(
  props: { items: BreadcrumbItem[]; attrs?: Attrs },
): Html {
  const items = props.items.map((item, index) => {
    const isCurrent = index === props.items.length - 1;
    const content = item.href && !isCurrent
      ? html`<a class="breadcrumb__link" href="${item.href}">${item.label}</a>`
      : item.label;
    return html`
      <li class="breadcrumb__item" ${isCurrent
        ? html`
          aria-current="page"
        `
        : ""}>${content}</li>
    `;
  });

  return html`
    <nav aria-label="Breadcrumb">
      <ol class="breadcrumb" ${renderAttrs(props.attrs ?? {})}>${items}</ol>
    </nav>
  `;
}
