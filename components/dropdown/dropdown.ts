import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type DropdownProps = {
  id: string;
  trigger: string | Html;
  content: Html;
  align?: "start" | "end";
  /** Extra classes on the trigger, e.g. `btn btn--outline btn--icon` to
   * make it the caret half of a split button inside a `ButtonGroup`. */
  triggerClass?: string;
  /**
   * A search box above the content that filters its items as you type —
   * the `<li>`s of a `Menu` (a parent stays while any child matches) or
   * any `[data-dropdown-item]`. dropdown.js hides the box when the panel
   * holds nothing to filter (a notifications panel, a form). It belongs to
   * no form and is unnamed, so it never submits. @default true
   */
  searchable?: boolean;
  /** Placeholder of the search box. @default "Search…" */
  searchPlaceholder?: string;
  /** Accessible name of the search box. @default "Search items" */
  searchLabel?: string;
  /** Shown when nothing matches the search. @default "No matches." */
  emptyText?: string;
  attrs?: Attrs;
};

/**
 * A trigger button and a floating panel. The panel caps at
 * `--dropdown-max-height` and scrolls its content (the search box stays on
 * top); every Dropdown is searchable unless `searchable: false`.
 */
export function Dropdown(props: DropdownProps): Html {
  const panelId = `${props.id}-panel`;
  const panelClass = cx(
    "dropdown__panel",
    props.align === "end" && "dropdown__panel--end",
  );

  // A plain-text trigger is a real button with a caret; a custom trigger
  // (an icon, a split-button half) styles itself via `triggerClass`.
  const plain = typeof props.trigger === "string";
  const triggerClass = props.triggerClass ?? (plain ? "btn btn--outline" : undefined);
  const trigger = plain ? html`${props.trigger}${Icon("chevronDown", { size: 14 })}` : props.trigger;

  return html`<div${classAttrs("dropdown", mergeAttrs(props.attrs, { id: props.id }))}><button type="button" class="${
    cx("dropdown__trigger", triggerClass)
  }" data-toggle="#${panelId}" aria-expanded="false" aria-controls="${panelId}">${trigger}</button><div class="${panelClass}" id="${panelId}" data-toggle-panel hidden>${
    search(props)
  }<div class="dropdown__body">${props.content}</div>${
    props.searchable === false
      ? ""
      : html`<p class="dropdown__empty" data-dropdown-empty hidden>${props.emptyText ?? "No matches."}</p>`
  }</div></div>`;
}

// `form` names no form, so the box has no form owner: a Dropdown inside a
// form never gains a field that blocks implicit submission.
function search(props: DropdownProps): Html | string {
  if (props.searchable === false) return "";
  return html`
    <div
      class="dropdown__search">${Icon("search", {
        size: 14,
      })}<input type="search" class="dropdown__search-input" id="${props.id}-search" form="${props
        .id}-search-scope" placeholder="${props.searchPlaceholder ?? "Search…"}" aria-label="${props.searchLabel ??
        "Search items"}" aria-controls="${props
        .id}-panel" autocomplete="off" spellcheck="false" data-dropdown-search data-validate-skip></div>
  `;
}
