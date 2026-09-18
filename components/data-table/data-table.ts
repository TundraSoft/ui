import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  /** Right-aligns and applies tabular figures. */
  numeric?: boolean;
  /** Monospace + smaller: use for ids, shas, codes. */
  mono?: boolean;
  /** Sticky first column. Only set this on one column. */
  pinned?: boolean;
  render?: (row: T) => Html | string;
};

export type DataTableProps<T> = {
  /** Required: history push refuses a region with no id. */
  id: string;
  title?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectable?: boolean;
  selected?: string[];
  /** Form field name the row checkboxes submit under (default "selected"). */
  selectName?: string;
  sort?: { key: string; dir: "asc" | "desc" };
  /** Sort links are rAPId swaps (`outer` into `#<id>`, history push) —
   * implement with `withQuery()` (§7) so other params survive. */
  buildSortHref?: (key: string, dir: "asc" | "desc") => string;
  /**
   * Bulk actions, shown only when `selected` is non-empty. With
   * `bulkAction` set, make each one a submit button that names the
   * operation — `Button({ type: "submit", attrs: { name: "op", value: "archive" } })` —
   * and the server receives `op` plus one `selectName` entry per checked row.
   */
  bulkActions?: Html;
  /**
   * URL the selection posts to. When set, the bulk bar and the rows sit in
   * a `<form method="post">` carrying `data-action` (a rAPId swap that
   * replaces this table, `outer` into `#<id>`; a plain navigation without
   * the runtime — answer with a redirect, PRG). The toolbar and footer stay
   * outside the form, so a search box or a filter never submits it.
   * Without it the bulk bar is a view concern only and its buttons need
   * their own wiring.
   */
  bulkAction?: string;
  toolbar?: Html;
  footer?: Html;
  rowActions?: (row: T) => Html;
  /**
   * Caps the scroll body (sm 240px / md 400px / lg 600px) so the sticky
   * header has something to stick to. A step, not a length: it maps to
   * `.data-table__scroll--*`, so no inline style is emitted (CSP). A theme
   * can retune the steps via `--data-table-max-height` on that class.
   */
  maxHeight?: "sm" | "md" | "lg";
  /** Shown instead of the body when `rows` is empty — an `Empty`, or anything. */
  empty?: Html;
  /** Plain-text alternative to `empty`. @default "Nothing to show." */
  emptyMessage?: string;
  attrs?: Attrs;
};

function header<T>(
  col: DataTableColumn<T>,
  tableId: string,
  sort: DataTableProps<T>["sort"],
  buildSortHref: DataTableProps<T>["buildSortHref"],
): Html {
  const cls = cx(col.pinned && "data-table__cell--pinned", col.numeric && "data-table__num");
  const active = sort?.key === col.key;
  const label = col.label.toUpperCase();

  if (!col.sortable || !buildSortHref) {
    return html`<th class="${cls}">${label}</th>`;
  }

  const dir = sort?.dir === "desc" ? "desc" : "asc";
  const next = active && dir === "asc" ? "desc" : "asc";
  const href = buildSortHref(col.key, next);
  return html`
    <th class="${cls}"
      ${renderAttrs({
        "aria-sort": active ? `${dir}ending` : undefined,
      })}><a class="data-table__sort" href="${href}" data-action="${href}" data-target="#${tableId}" data-swap="outer" data-push>${label}${active
        ? Icon(dir === "asc" ? "chevronUp" : "chevronDown", { size: 11 })
        : ""}</a></th>
  `;
}

export type RowAction = {
  label: string;
  /** A link (GET). Without it the item is a `<button>` — give it `attrs` (a form's `formaction`, `data-action`, …). */
  href?: string;
  /** The destructive one — rendered last, after a separator, in the danger colour. */
  danger?: boolean;
  attrs?: Attrs;
};

export type RowActionsProps = {
  /** Base id; the strip is `<id>-strip`. Derive it from the row key (§4). */
  id: string;
  /** Accessible name of the group, e.g. "Actions for INV-2048". */
  label: string;
  items: RowAction[];
};

/**
 * Row actions as an in-row strip instead of a floating menu: the kebab
 * opens a row-height ink strip of labelled buttons anchored at the row's
 * end (it covers the row's values while open, nothing moves, nothing
 * floats), with a close button; Escape and an outside click close it and
 * focus returns to the kebab. The same idiom as the bulk bar — one row
 * gets a row strip, many rows get the header strip. Pass it as
 * `DataTable.rowActions`.
 */
export function RowActions(props: RowActionsProps): Html {
  const stripId = `${props.id}-strip`;
  const plain = props.items.filter((i) => !i.danger);
  const danger = props.items.filter((i) => i.danger);
  const item = (i: RowAction) =>
    i.href
      ? html`<a${classAttrs(cx("btn btn--sm", i.danger && "btn--danger"), { ...i.attrs, href: i.href })}>${i.label}</a>`
      : html`
        <button type="button" ${classAttrs(cx("btn btn--sm", i.danger && "btn--danger"), i.attrs ?? {})}>${i
          .label}</button>
      `;
  return html`
    <button type="button" class="btn btn--ghost btn--sm btn--icon" data-row-actions="#${stripId}" aria-expanded="false"
      aria-controls="${stripId}">${Icon("kebab", { size: 16 })}<span class="sr-only">${props.label}</span></button><div
      class="data-table__row-actions" id="${stripId}" role="group" aria-label="${props.label}"
      hidden>${plain.map(item)}${danger.length
        ? html`<span class="data-table__row-actions-sep"></span>${danger.map(item)}`
        : ""}<span class="data-table__row-actions-sep"></span><button type="button" class="btn btn--ghost btn--sm btn--icon" data-row-actions-close aria-label="Close actions">${Icon(
          "x",
          { size: 14 },
        )}</button></div>
  `;
}

/** Stringify a cell without ever printing `[object Object]`. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DataTable<T extends Record<string, unknown>>(
  props: DataTableProps<T>,
): Html {
  const selected = new Set(props.selected ?? []);
  const allSelected = props.rows.length > 0 && selected.size === props.rows.length;

  const selectName = props.selectName ?? "selected";
  const head = html`<tr>${
    props.selectable
      ? html`<th class="data-table__select"><input type="checkbox" aria-label="Select all rows"${
        renderAttrs({ checked: allSelected ? "" : undefined })
      } data-select-all></th>`
      : ""
  }${props.columns.map((c) => header(c, props.id, props.sort, props.buildSortHref))}${
    props.rowActions ? html`<th class="data-table__actions"><span class="sr-only">Actions</span></th>` : ""
  }</tr>`;

  const body = props.rows.map((row) => {
    const key = props.rowKey(row);
    const isSelected = selected.has(key);
    return html`<tr class="${cx("data-table__row", isSelected && "data-table__row--selected")}" data-row-key="${key}">${
      props.selectable
        ? html`
          <td
            class="data-table__select"><input type="checkbox" name="${selectName}" aria-label="Select row ${key}"${renderAttrs(
              { checked: isSelected ? "" : undefined },
            )} data-select-row value="${key}"></td>
        `
        : ""
    }${
      props.columns.map((col) =>
        html`<td class="${
          cx(
            col.pinned && "data-table__cell--pinned",
            col.mono && "data-table__mono",
            col.numeric && "data-table__num",
          )
        }">${col.render ? col.render(row) : cell(row[col.key])}</td>`
      )
    }${props.rowActions ? html`<td class="data-table__actions">${props.rowActions(row)}</td>` : ""}</tr>`;
  });

  const bulk = props.bulkActions
    ? html`
      <div class="data-table__bulk" ${selected.size ? "" : html`
        hidden
      `}
        data-bulk-bar><span class="data-table__bulk-count" data-bulk-count>${selected.size === 1
          ? "1 row selected"
          : `${selected.size} rows selected`}</span><span class="data-table__bulk-sep"></span>${props.bulkActions}</div>
    `
    : "";

  const scrollCls = cx("data-table__scroll", props.maxHeight && `data-table__scroll--${props.maxHeight}`);

  // The bulk bar lives inside the scroll box, sticky over the header row,
  // so it never takes up flow space: rows stay put when a selection starts.
  const region = html`
    <div
      class="${scrollCls}">${bulk}<table class="data-table__table"><thead>${head}</thead><tbody>${props.rows.length
        ? body
        : ""}</tbody></table>${props.rows.length
        ? ""
        : html`<div class="data-table__empty">${props.empty ?? props.emptyMessage ?? "Nothing to show."}</div>`}</div>
  `;

  // The form wraps only the bar and the rows: a toolbar search box or a
  // filter must never implicitly submit a bulk operation.
  const rowsRegion = props.bulkAction
    ? html`
      <form class="data-table__form" method="post" action="${props.bulkAction}" data-action="${props
        .bulkAction}" data-target="#${props.id}"
        data-swap="outer">${region}</form>
    `
    : region;

  return html`<div${classAttrs("data-table", { ...props.attrs, id: props.id })}>${
    props.title || props.toolbar
      ? html`<div class="data-table__toolbar">${
        props.title ? html`<span class="data-table__title">${props.title}</span>` : ""
      }${props.toolbar ?? ""}</div>`
      : ""
  }${rowsRegion}${props.footer ? html`<div class="data-table__footer">${props.footer}</div>` : ""}</div>`;
}
