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
  /**
   * Extra attributes on this column's header cell (`data-*`, `title`…);
   * a `class` merges with the cell's own.
   */
  headAttrs?: Attrs;
  /**
   * Extra attributes on every body cell of this column — fixed, or worked
   * out from the row (a responsive role, a tooltip, a state hook). A
   * `class` merges with the cell's own. This is the hook for re-laying a
   * table out at another width (cards on a phone) from CSS alone.
   */
  cellAttrs?: Attrs | ((row: T) => Attrs);
};

/**
 * "Select all N": once every row on the page is ticked, the bulk bar
 * offers the whole result set the server matched, not just this page.
 * Picking it sets a hidden `all=1` and the bar posts `fields` with it
 * (the filter the total stands for), so the server chooses the rows —
 * the page's checkboxes still post too. Unticking any row, or the same
 * button again ("Clear selection"), goes back to the ticked rows.
 */
export type DataTableSelectAll = {
  /** How many rows the server would act on (cap it yourself if it caps). */
  total: number;
  /** Hidden fields the bulk form carries with `all=1` — the current filter. */
  fields?: Readonly<Record<string, string>>;
  /** The offer. @default "Select all <total>" */
  label?: string;
  /** The bar's count once taken. @default "All <total> selected" */
  selectedLabel?: string;
  /** The button once taken. @default "Clear selection" */
  clearLabel?: string;
};

export type DataTableProps<T> = {
  /** Required: history push refuses a region with no id. */
  id: string;
  title?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectable?: boolean;
  /**
   * With `selectable`: whether this row gets a checkbox (default every
   * row). A row no bulk operation can act on keeps an empty cell, so the
   * columns stay aligned; when no row on the page is selectable the table
   * draws no selection column and no bulk bar at all.
   */
  rowSelectable?: (row: T) => boolean;
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
  /** Offer every row the server matched, not just this page — see {@link DataTableSelectAll}. */
  selectAll?: DataTableSelectAll;
  /**
   * The bar's count, `{n}` standing for the number.
   * @default { one: "1 row selected", other: "{n} rows selected" }
   */
  countLabels?: { one: string; other: string };
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
  const { class: extraClass, ...extra } = col.headAttrs ?? {};
  const cls = cx(col.pinned && "data-table__cell--pinned", col.numeric && "data-table__num", extraClass);
  const active = sort?.key === col.key;
  const label = col.label.toUpperCase();

  if (!col.sortable || !buildSortHref) {
    return html`
      <th class="${cls}" ${renderAttrs(extra)}>${label}</th>
    `;
  }

  const dir = sort?.dir === "desc" ? "desc" : "asc";
  const next = active && dir === "asc" ? "desc" : "asc";
  const href = buildSortHref(col.key, next);
  return html`
    <th class="${cls}"
      ${renderAttrs({
        ...extra,
        "aria-sort": active ? `${dir}ending` : undefined,
      })}><a class="data-table__sort" href="${href}" data-action="${href}" data-target="#${tableId}" data-swap="outer" data-push>${label}${active
        ? Icon(dir === "asc" ? "chevronUp" : "chevronDown", { size: 11 })
        : ""}</a></th>
  `;
}

export type RowAction = {
  label: string;
  /** A link (GET). Without it (and without `post`) the item is a `<button>` — give it `attrs`. */
  href?: string;
  /**
   * POST to this URL instead: the item is a submit button in its own small
   * form, carrying the CSRF field (`RowActionsProps.csrfToken`) and
   * `fields`. A plain POST (answer with a redirect, PRG) unless `target`
   * makes it a rAPId swap. A destructive action is a POST, never a link.
   */
  post?: string;
  /** Hidden fields the POST carries (`op: "lock"`, `next: "list"`). */
  fields?: Readonly<Record<string, string>>;
  /**
   * With `post`: swap the reply `outer` into this selector (usually the
   * table, `#<id>`) instead of navigating.
   */
  target?: string;
  /**
   * Ask first: the question a confirmation dialog shows (modal.js, using
   * the page's `ConfirmModal`; the browser's own `confirm()` without one).
   */
  confirm?: string;
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
  /** `view.csrfToken`, for the items that `post`. */
  csrfToken?: string;
  /** The form field rAPId's `csrf()` middleware reads. @default "_csrf" */
  csrfField?: string;
};

/** One strip item: a link, a POST form, or a bare button. */
function rowItem(i: RowAction, props: RowActionsProps): Html {
  const cls = cx("btn btn--sm", i.danger && "btn--danger");
  const attrs: Attrs = { ...i.attrs, "data-confirm": i.confirm };
  if (i.href) return html`<a${classAttrs(cls, { ...attrs, href: i.href })}>${i.label}</a>`;
  if (!i.post) return html`<button type="button" ${classAttrs(cls, attrs)}>${i.label}</button>`;
  const fields = Object.entries(i.fields ?? {}).map(([name, value]) =>
    html`<input type="hidden" name="${name}" value="${value}">`
  );
  return html`
    <form class="data-table__row-action-form" method="post" action="${i.post}"
      ${renderAttrs({
        "data-action": i.target ? i.post : undefined,
        "data-target": i.target,
        "data-swap": i.target ? "outer" : undefined,
      })}>${props.csrfToken === undefined
        ? ""
        : html`<input type="hidden" name="${
          props.csrfField ?? "_csrf"
        }" value="${props.csrfToken}">`}${fields}<button type="submit" ${classAttrs(cls, attrs)}>${i
        .label}</button></form>
  `;
}

/**
 * Row actions as an in-row strip instead of a floating menu: the kebab
 * opens a row-height ink strip of labelled buttons anchored at the row's
 * end (it covers the row's values while open, nothing moves, nothing
 * floats), with a close button; Escape and an outside click close it and
 * focus returns to the kebab. The same idiom as the bulk bar — one row
 * gets a row strip, many rows get the header strip. Pass it as
 * `DataTable.rowActions`. Items link (`href`), POST (`post`, optionally
 * swapped with `target`) or are bare buttons; any may `confirm` first.
 */
export function RowActions(props: RowActionsProps): Html {
  const stripId = `${props.id}-strip`;
  const plain = props.items.filter((i) => !i.danger);
  const danger = props.items.filter((i) => i.danger);
  const item = (i: RowAction) => rowItem(i, props);
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

/** A body cell's attributes: the column's own, with its class merged in. */
function cellOf<T extends Record<string, unknown>>(col: DataTableColumn<T>, row: T): Html {
  const own = typeof col.cellAttrs === "function" ? col.cellAttrs(row) : col.cellAttrs ?? {};
  const { class: extraClass, ...extra } = own;
  return html`
    <td class="${cx(
      col.pinned && "data-table__cell--pinned",
      col.mono && "data-table__mono",
      col.numeric && "data-table__num",
      extraClass,
    )}" ${renderAttrs(extra)}>${col.render ? col.render(row) : cell(row[col.key])}</td>
  `;
}

const fmtCount = (n: number) => n.toLocaleString("en-US");

export function DataTable<T extends Record<string, unknown>>(
  props: DataTableProps<T>,
): Html {
  const selected = new Set(props.selected ?? []);
  const canSelect = (row: T) => props.rowSelectable?.(row) ?? true;
  const selectableRows = props.rows.filter(canSelect);
  // A table whose rows all opt out draws no selection column and no bar.
  const noneSelectable = Boolean(props.selectable && props.rowSelectable) && selectableRows.length === 0;
  const selectable = Boolean(props.selectable) && !noneSelectable;
  const allSelected = selectableRows.length > 0 &&
    selectableRows.every((row) => selected.has(props.rowKey(row)));

  const selectName = props.selectName ?? "selected";
  const head = html`<tr>${
    selectable
      ? html`<th class="data-table__select"><input type="checkbox" aria-label="Select all rows"${
        renderAttrs({ checked: allSelected ? "" : undefined })
      } data-select-all></th>`
      : ""
  }${props.columns.map((c) => header(c, props.id, props.sort, props.buildSortHref))}${
    props.rowActions ? html`<th class="data-table__actions"><span class="sr-only">Actions</span></th>` : ""
  }</tr>`;

  const body = props.rows.map((row) => {
    const key = props.rowKey(row);
    const isSelected = selected.has(key) && canSelect(row);
    return html`<tr class="${cx("data-table__row", isSelected && "data-table__row--selected")}" data-row-key="${key}">${
      !selectable ? "" : canSelect(row)
        ? html`
          <td
            class="data-table__select"><input type="checkbox" name="${selectName}" aria-label="Select row ${key}"${renderAttrs(
              { checked: isSelected ? "" : undefined },
            )} data-select-row value="${key}"></td>
        `
        : html`<td class="data-table__select"></td>`
    }${props.columns.map((col) => cellOf(col, row))}${
      props.rowActions ? html`<td class="data-table__actions">${props.rowActions(row)}</td>` : ""
    }</tr>`;
  });

  const labels = props.countLabels ?? { one: "1 row selected", other: "{n} rows selected" };
  const count = selected.size === 1 ? labels.one : labels.other.replace("{n}", fmtCount(selected.size));
  const all = props.selectAll;
  const offer = all && all.total > 0
    ? html`
      <span
        class="data-table__bulk-all"><input type="hidden" name="all" value="" data-bulk-all>${Object.entries(
          all.fields ?? {},
        ).map(([name, value]) =>
          html`<input type="hidden" name="${name}" value="${value}">`
        )}<button type="button" class="data-table__bulk-all-button" data-bulk-select-all${renderAttrs({
          "data-total": String(all.total),
          "data-label": all.label ?? `Select all ${fmtCount(all.total)}`,
          "data-selected": all.selectedLabel ?? `All ${fmtCount(all.total)} selected`,
          "data-clear": all.clearLabel ?? "Clear selection",
        })} hidden>${all.label ?? `Select all ${fmtCount(all.total)}`}</button></span>
    `
    : "";

  const bulk = props.bulkActions && !noneSelectable
    ? html`
      <div class="data-table__bulk" ${selected.size ? "" : html`
        hidden
      `}
        data-bulk-bar><span class="data-table__bulk-count" data-bulk-count${renderAttrs({
          "data-one": props.countLabels?.one,
          "data-other": props.countLabels?.other,
        })}>${count}</span>${offer}<span class="data-table__bulk-sep"></span>${props.bulkActions}</div>
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
  const rowsRegion = props.bulkAction && !noneSelectable
    ? html`
      <form class="data-table__form" method="post" action="${props.bulkAction}" data-action="${props
        .bulkAction}" data-target="#${props.id}"
        data-swap="outer">${region}</form>
    `
    : region;

  return html`<div${classAttrs("data-table", { ...props.attrs, id: props.id ?? props.attrs?.id })}>${
    props.title || props.toolbar
      ? html`<div class="data-table__toolbar">${
        props.title ? html`<span class="data-table__title">${props.title}</span>` : ""
      }${props.toolbar ?? ""}</div>`
      : ""
  }${rowsRegion}${props.footer ? html`<div class="data-table__footer">${props.footer}</div>` : ""}</div>`;
}
