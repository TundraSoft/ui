import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type TreeNode = {
  label: string | Html;
  /** A link — the row navigates. Without one the row only selects / toggles. */
  href?: string;
  /** Leading icon (`Icon("folder")`); any `Html`. */
  icon?: Html;
  children?: TreeNode[];
  /** Render this parent open. Without JS every parent is open. */
  expanded?: boolean;
  /** The current item (`aria-selected`, `aria-current` on a link). */
  selected?: boolean;
  /** Extra attributes on the `<li>`; a `class` merges. */
  attrs?: Attrs;
};

export type TreeProps = {
  /** Required: item ids derive from it (`<id>-0-2`). */
  id: string;
  /** Accessible name of the tree. */
  label: string;
  items: TreeNode[];
  /** Extra attributes on the root `<ul>`; a `class` merges. */
  attrs?: Attrs;
};

function node(item: TreeNode, path: string, level: number, index: number, count: number): Html {
  const id = `${path}`;
  const hasChildren = Boolean(item.children?.length);
  const open = Boolean(item.expanded);
  const groupId = `${id}-group`;
  const { class: extraClass, ...extra } = item.attrs ?? {};
  const row = html`<span class="tree__label">${item.icon && html`<span class="tree__icon">${item.icon}</span>`}<span
      class="tree__text">${item.label}</span></span>`;
  return html`
    <li ${classAttrs(
      cx("tree__item", hasChildren && "tree__item--parent", item.selected && "tree__item--selected", extraClass),
      {
        ...extra,
        id,
        role: "treeitem",
        "aria-level": String(level),
        "aria-setsize": String(count),
        "aria-posinset": String(index + 1),
        "aria-selected": item.selected ? "true" : "false",
        "aria-expanded": hasChildren ? (open ? "true" : "false") : undefined,
        tabindex: item.selected ? "0" : "-1",
        "data-tree-expanded": hasChildren && open ? "" : undefined,
      },
    )}>
      <div class="tree__row">${hasChildren
        ? html`<button type="button" class="tree__toggle" tabindex="-1" aria-label="Toggle" aria-controls="${groupId}" data-tree-toggle>${Icon(
          "chevronRight",
          { size: 14 },
        )}</button>`
        : html`<span class="tree__spacer"></span>`}${item.href
        ? html`<a class="tree__link" href="${item.href}" tabindex="-1"${renderAttrs({
          "aria-current": item.selected ? "page" : undefined,
        })}>${row}</a>`
        : html`<span class="tree__link">${row}</span>`}</div>${hasChildren
        ? html`<ul class="tree__group" role="group" id="${groupId}">${item.children!.map((child, i) =>
          node(child, `${id}-${i}`, level + 1, i, item.children!.length)
        )}</ul>`
        : ""}
    </li>
  `;
}

/**
 * A WAI-ARIA tree view: nested `<ul>`s of `role="treeitem"` rows, each
 * parent with a chevron toggle. tree.js collapses the parents not marked
 * `expanded` on init (so without JS every branch is visible), toggles
 * them on click, and walks the tree from the keyboard (Arrow keys,
 * Home/End, Enter/Space, type-ahead). Ids derive from `id` and the
 * index path — stable across renders and swaps.
 */
export function Tree(props: TreeProps): Html {
  return html`
    <ul ${classAttrs(
      "tree",
      mergeAttrs(props.attrs, { id: props.id, role: "tree", "aria-label": props.label }),
    )} data-tree>${props.items.map((item, i) => node(item, `${props.id}-${i}`, 1, i, props.items.length))}</ul>
  `;
}
