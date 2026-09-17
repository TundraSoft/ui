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
  /** Bulk actions, shown only when `selected` is non-empty. */
  bulkActions?: Html;
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

  return html`<div${classAttrs("data-table", { ...props.attrs, id: props.id })}>${
    props.title || props.toolbar
      ? html`<div class="data-table__toolbar">${
        props.title ? html`<span class="data-table__title">${props.title}</span>` : ""
      }${props.toolbar ?? ""}</div>`
      : ""
  }${bulk}<div class="${scrollCls}"><table class="data-table__table"><thead>${head}</thead><tbody>${
    props.rows.length ? body : ""
  }</tbody></table>${
    props.rows.length
      ? ""
      : html`<div class="data-table__empty">${props.empty ?? props.emptyMessage ?? "Nothing to show."}</div>`
  }</div>${props.footer ? html`<div class="data-table__footer">${props.footer}</div>` : ""}</div>`;
}
