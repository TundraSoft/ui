import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type NavbarLink = {
  href: string;
  label: string;
  active?: boolean;
};

export type NavbarProps = {
  id?: string;
  brand?: string | Html;
  links?: NavbarLink[];
  /** Extra content pinned to the end, e.g. a user menu or theme switch. */
  actions?: string | Html;
  /**
   * Controls that move into the collapsed phone menu (below 768px), after
   * the links — where `actions` has run out of room. Hidden on wider
   * screens. The usual pairing: the same control in `actions` carries
   * `hide-md`, so each width shows it exactly once. Renders the menu
   * toggle even when there are no `links`.
   */
  menuActions?: Html;
  attrs?: Attrs;
};

export function Navbar(props: NavbarProps): Html {
  const navId = `${props.id ?? "navbar"}-nav`;
  const hasMenu = Boolean(props.links && props.links.length > 0) || Boolean(props.menuActions);

  const links = (props.links ?? []).map((link) =>
    html`<a class="${cx("navbar__link", link.active && "navbar__link--active")}" href="${link.href}">${link.label}</a>`
  );

  return html`
    <nav ${classAttrs("navbar", mergeAttrs(props.attrs, { id: props.id }))}>${props.brand &&
      html`<div class="navbar__brand">${props.brand}</div>`}${hasMenu &&
      html`
        <button type="button" class="navbar__toggle js-only" data-toggle="#${navId}" aria-expanded="false"
          aria-controls="${navId}" aria-label="Toggle navigation">&#9776;</button><div class="navbar__nav"
          id="${navId}">${links}${props.menuActions &&
            html`<div class="navbar__menu-actions">${props.menuActions}</div>`}</div>
      `}<div class="navbar__spacer"></div>${props.actions &&
      html`<div class="navbar__actions">${props.actions}</div>`}</nav>
  `;
}
