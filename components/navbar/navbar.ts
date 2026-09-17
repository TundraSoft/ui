import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
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
  attrs?: Attrs;
};

export function Navbar(props: NavbarProps): Html {
  const navId = `${props.id ?? "navbar"}-nav`;
  const hasLinks = Boolean(props.links && props.links.length > 0);

  const links = (props.links ?? []).map((link) =>
    html`<a class="${cx("navbar__link", link.active && "navbar__link--active")}" href="${link.href}">${link.label}</a>`
  );

  return html`
    <nav class="navbar" ${renderAttrs({ ...props.attrs, id: props.id })}>${props.brand &&
      html`<div class="navbar__brand">${props.brand}</div>`}${hasLinks &&
      html`
        <button type="button" class="navbar__toggle js-only" data-toggle="#${navId}" aria-expanded="false"
          aria-controls="${navId}" aria-label="Toggle navigation">&#9776;</button><div class="navbar__nav"
          id="${navId}">${links}</div>
      `}<div class="navbar__spacer"></div>${props.actions &&
      html`<div class="navbar__actions">${props.actions}</div>`}</nav>
  `;
}
