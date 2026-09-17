import { type Html, html } from "@tundralibs/rapid/ui";
import { renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon, type IconName } from "../../shared/icons.ts";

export type CommandItem = {
  label: string;
  group?: string;
  href?: string;
  icon?: IconName;
  /** Two-letter badge instead of an icon — used for record results. */
  badge?: string;
  meta?: string;
  shortcut?: string;
};

export type CommandProps = {
  /** Required: the result list is the swap target. */
  id: string;
  query?: string;
  items: CommandItem[];
  /**
   * URL that returns a fresh `CommandList(...)` fragment for `?q=<text>`;
   * command.js debounces `input` and swaps it in via `window.rapid.swap()`.
   * Without it the rendered items are filtered client-side.
   */
  action?: string;
  open?: boolean;
  /** Renders in normal flow instead of over an overlay. */
  inline?: boolean;
  placeholder?: string;
  emptyText?: string;
  /** Accessible name of the floating palette dialog. */
  label?: string;
};

function withMatch(label: string, query?: string): Html {
  if (!query) return html`${label}`;
  const i = label.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return html`${label}`;
  return html`${label.slice(0, i)}<strong class="command__match">${label.slice(i, i + query.length)}</strong>${
    label.slice(i + query.length)
  }`;
}

export type CommandListProps = Pick<CommandProps, "id" | "items" | "query" | "emptyText">;

/** The result list alone — what a route returns for a swap of `#<id>-list`. */
export function CommandList(props: CommandListProps): Html {
  let lastGroup: string | undefined;
  const rows = props.items.flatMap((item, i) => {
    const out: Html[] = [];
    if (item.group && item.group !== lastGroup) {
      lastGroup = item.group;
      out.push(html`<div class="command__group" role="presentation">${item.group}</div>`);
    }
    const inner = html`${
      item.badge
        ? html`<span class="command__item-badge">${item.badge}</span>`
        : html`<span class="command__item-icon">${Icon(item.icon ?? "chevronRight", { size: 16 })}</span>`
    }<span class="command__item-label">${withMatch(item.label, props.query)}</span>${
      item.meta ? html`<span class="command__item-meta">${item.meta}</span>` : ""
    }${item.shortcut ? html`<span class="command__kbd">${item.shortcut}</span>` : ""}`;

    out.push(
      item.href
        ? html`<a class="command__item" id="${props.id}-item-${i}" href="${item.href}" role="option">${inner}</a>`
        : html`<button type="button" class="command__item" id="${props.id}-item-${i}" role="option">${inner}</button>`,
    );
    return out;
  });

  return html`${
    rows.length ? rows : html`<div class="command__empty">${props.emptyText ?? "Nothing matches that."}</div>`
  }`;
}

export function Command(props: CommandProps): Html {
  const listId = `${props.id}-list`;
  const floating = !props.inline;

  return html`
    <div class="${cx("command", props.inline && "command--inline")}" id="${props
      .id}" data-command${props.open || props.inline ? "" : html`
      hidden
    `}>
      <div class="command__sheet" ${renderAttrs({
        role: floating ? "dialog" : undefined,
        "aria-modal": floating ? "true" : undefined,
        "aria-label": floating ? props.label ?? "Command palette" : undefined,
      })}>
        <div
          class="command__search"><span class="command__search-icon">${Icon("search", {
            size: 17,
          })}</span><input class="command__input" type="text" role="combobox" autocomplete="off" aria-label="Run a command" aria-controls="${listId}" aria-expanded="true" value="${props
            .query ?? ""}" placeholder="${props.placeholder ?? "Search commands"}"${renderAttrs({
              "data-command-action": props.action,
              "data-command-target": props.action ? `#${listId}` : undefined,
            })}><button type="button" class="command__kbd command__esc" data-command-dismiss>esc</button></div>
        <div class="command__list" id="${listId}" role="listbox">${CommandList(props)}</div>
        <div
          class="command__footer"><span>&uarr;&darr; move</span><span>&crarr; run</span><span class="command__count">${props
              .items.length === 1
            ? "1 result"
            : `${props.items.length} results`}</span></div>
      </div>
    </div>
  `;
}
