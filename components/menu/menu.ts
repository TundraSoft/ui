import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Badge, type BadgeVariant } from "../badge/badge.ts";

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
  /**
   * A count or short status after the label (`Tickets 6`; a parent can
   * carry its children's sum). A string or number is drawn as a `Badge`
   * in `badgeVariant`; `Html` goes in as it is. It sits outside
   * `.menu__link-label`, so the collapsed rail's flyout title and link
   * tooltip read the label alone, and the rail hides it.
   */
  badge?: string | number | Html;
  /** Variant of a string/number `badge`. @default "neutral" */
  badgeVariant?: BadgeVariant;
  /**
   * On the collapsed rail, where the badge is hidden, mark the icon with a
   * dot (`.menu__link--alert`) so the item still asks for attention.
   * @default true when `badgeVariant` is "danger"
   */
  alert?: boolean;
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

function renderBadge(item: MenuItem): Html | "" {
  if (item.badge === undefined || item.badge === "") return "";
  const content = typeof item.badge === "string" || typeof item.badge === "number"
    ? Badge({ label: String(item.badge), variant: item.badgeVariant ?? "neutral" })
    : item.badge;
  return html`<span class="menu__badge">${content}</span>`;
}

function linkClass(item: MenuItem): string {
  const alert = item.alert ?? (item.badge !== undefined && item.badgeVariant === "danger");
  return cx("menu__link", item.active && "menu__link--active", alert && "menu__link--alert");
}

function renderItem(item: MenuItem, path: string): Html {
  const icon = item.icon && html`<span class="menu__icon">${item.icon}</span>`;
  const badge = renderBadge(item);

  if (item.children && item.children.length > 0) {
    const subId = item.id ?? `${path}`;
    const open = Boolean(item.expanded);
    return html`<li><button type="button" class="${linkClass(item)}" data-toggle="#${subId}" aria-expanded="${
      open ? "true" : "false"
    }" aria-controls="${subId}">${icon}<span class="menu__link-label">${item.label}</span>${badge}<span class="menu__caret">&#8250;</span></button><ul class="${
      cx("menu__sublist", open && "is-open")
    }" id="${subId}"${
      open ? "" : html`
        hidden
      `
    }>${item.children.map((child, i) => renderItem(child, `${path}-${i}`))}</ul></li>`;
  }

  return html`<li><a class="${linkClass(item)}" href="${item.href ?? "#"}"${
    item.active
      ? html`
        aria-current="page"
      `
      : ""
  }>${icon}<span class="menu__link-label">${item.label}</span>${badge}</a></li>`;
}

export function Menu(props: MenuProps): Html {
  const base = `${props.id ?? "menu"}-sub`;
  return html`<ul${classAttrs("menu__list", props.attrs)}>${
    props.items.map((item, i) => renderItem(item, `${base}-${i}`))
  }</ul>`;
}
