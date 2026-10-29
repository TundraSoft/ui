import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type PaginationProps = {
  id?: string;
  page: number;
  totalPages: number;
  /**
   * Build a page's URL — implement with rAPId's `withQuery()` (§7) so
   * existing query params survive: `(p) => withQuery(path, view.query, { page: p })`.
   */
  buildHref: (page: number) => string;
  siblingCount?: number;
  /**
   * Make every link a rAPId swap of `target` (a selector — the paginated
   * region, e.g. `#orders`), pushed to history. Without `target` the
   * runtime would swap the response into the link itself.
   */
  target?: string;
  /** @deprecated use `target` — kept so older callers still type-check. */
  swappable?: boolean;
  linkAttrs?: Attrs;
  attrs?: Attrs;
};

function pageRange(current: number, total: number, siblings: number): (number | "ellipsis")[] {
  const range: (number | "ellipsis")[] = [];
  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);

  range.push(1);
  if (start > 2) range.push("ellipsis");
  for (let page = start; page <= end; page++) range.push(page);
  if (end < total - 1) range.push("ellipsis");
  if (total > 1) range.push(total);

  return range;
}

export function Pagination(props: PaginationProps): Html {
  const { page, totalPages, buildHref, siblingCount = 1 } = props;
  const target = props.target ?? (props.swappable && props.id ? `#${props.id}` : undefined);

  // Every item carries its kind on the <li>, so a phone can fold the row
  // (pagination.css hides the other page numbers and the ellipses below
  // 576px and shows the status instead): prev · "Page 2 of 8" · next.
  const item = (kind: "page" | "nav" | "ellipsis", current: boolean, body: Html) =>
    html`
      <li class="${cx(
        "pagination__item",
        `pagination__item--${kind}`,
        current && "pagination__item--current",
      )}">${body}</li>
    `;

  function link(pageNo: number, label: string | Html, ariaLabel?: string, kind: "page" | "nav" = "page") {
    const href = buildHref(pageNo);
    const attrs: Attrs = {
      ...props.linkAttrs,
      "aria-current": pageNo === page ? "page" : undefined,
      "aria-label": ariaLabel,
      "data-action": target ? href : undefined,
      "data-target": target,
      "data-swap": target ? "outer" : undefined,
      "data-push": target ? "" : undefined,
    };
    return item(
      kind,
      pageNo === page,
      html`
        <a href="${href}" ${classAttrs("pagination__link", attrs)}>${label}</a>
      `,
    );
  }

  // Disabled prev/next are not links at all — a focusable `href="#"`
  // that does nothing is a trap for keyboard and screen-reader users.
  const disabled = (label: Html, ariaLabel: string) =>
    item(
      "nav",
      false,
      html`
        <span class="pagination__link pagination__link--disabled" aria-disabled="true" aria-label="${ariaLabel}"
        >${label}</span>
      `,
    );

  const pages = totalPages <= 1
    ? [item(
      "page",
      true,
      html`
        <span class="pagination__link" aria-current="page">1</span>
      `,
    )]
    : pageRange(page, totalPages, siblingCount).map((entry) =>
      entry === "ellipsis"
        ? item(
          "ellipsis",
          false,
          html`
            <span class="pagination__ellipsis" aria-hidden="true">&hellip;</span>
          `,
        )
        : link(entry, String(entry), `Page ${entry}`)
    );
  const status = html`
    <li class="pagination__status" aria-hidden="true">Page ${String(page)} of ${String(Math.max(totalPages, 1))}</li>
  `;

  return html`
    <nav aria-label="Pagination" ${classAttrs(undefined, mergeAttrs(props.attrs, { id: props.id }))}>
      <ul class="pagination">${page <= 1
        ? disabled(
          html`
            &#8249;
          `,
          "Previous page",
        )
        : link(
          page - 1,
          html`
            &#8249;
          `,
          "Previous page",
          "nav",
        )}${pages}${status}${page >= totalPages
        ? disabled(
          html`
            &#8250;
          `,
          "Next page",
        )
        : link(
          page + 1,
          html`
            &#8250;
          `,
          "Next page",
          "nav",
        )}</ul>
    </nav>
  `;
}
