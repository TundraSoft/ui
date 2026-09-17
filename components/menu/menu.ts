import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type MenuItem = {
  id?: string;
  label: string | Html;
  href?: string;
  icon?: string | Html;
  active?: boolean;
  children?: MenuItem[];
  /** Render a parent with its sublist open (e.g. the section the current
   * page lives in). menu.js also opens it when a child matches the URL. */
  expanded?: boolean;
};

export type MenuProps = {
  items: MenuItem[];
  /**
   * Base for the sublist ids (`<id>-sub-<index path>`). Deterministic —
   * a module-level counter would drift across server renders and break
   * `data-toggle`/`aria-controls` after a swap (§4). Defaults to "menu";
   * set it when a page has more than one Menu with submenus.
   */
  id?: string;
  attrs?: Attrs;
};

function renderItem(item: MenuItem, path: string): Html {
  const icon = item.icon && html`<span class="menu__icon">${item.icon}</span>`;

  if (item.children && item.children.length > 0) {
    const subId = item.id ?? `${path}`;
    const open = Boolean(item.expanded);
    return html`<li><button type="button" class="${
      cx("menu__link", item.active && "menu__link--active")
    }" data-toggle="#${subId}" aria-expanded="${
      open ? "true" : "false"
    }" aria-controls="${subId}">${icon}<span class="menu__link-label">${item.label}</span><span class="menu__caret">&#8250;</span></button><ul class="${
      cx("menu__sublist", open && "is-open")
    }" id="${subId}"${
      open ? "" : html`
        hidden
      `
    }>${item.children.map((child, i) => renderItem(child, `${path}-${i}`))}</ul></li>`;
  }

  const className = cx("menu__link", item.active && "menu__link--active");
  return html`<li><a class="${className}" href="${item.href ?? "#"}"${
    item.active
      ? html`
        aria-current="page"
      `
      : ""
  }>${icon}<span class="menu__link-label">${item.label}</span></a></li>`;
}

export function Menu(props: MenuProps): Html {
  const base = `${props.id ?? "menu"}-sub`;
  return html`<ul${classAttrs("menu__list", props.attrs)}>${
    props.items.map((item, i) => renderItem(item, `${base}-${i}`))
  }</ul>`;
}
