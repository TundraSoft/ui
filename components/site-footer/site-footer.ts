import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type SiteFooterColumn = {
  title: string;
  links: { label: string; href: string }[];
};

export type SiteFooterSocial = {
  /** The accessible name — "Acme on GitHub". */
  label: string;
  href: string;
  icon: Html;
};

export type SiteFooterProps = {
  /** The mark and name, first column. */
  brand?: Html;
  /** A line under the brand. */
  tagline?: string | Html;
  columns: SiteFooterColumn[];
  /** The legal line in the bottom bar — "© 2026 Acme". */
  bottom?: Html;
  /** Icon links in the bottom bar. */
  social?: SiteFooterSocial[];
  /** A form slot beside the brand — a newsletter sign-up. */
  newsletter?: Html;
  attrs?: Attrs;
};

/**
 * The site's foot: brand and tagline, columns of links (four across,
 * two on a tablet, one on a phone), and a bottom bar with the legal line
 * and social icons. Links are muted until hovered, so the page ends
 * quietly.
 */
export function SiteFooter(props: SiteFooterProps): Html {
  const column = (c: SiteFooterColumn) =>
    html`
      <nav class="site-footer__column" aria-label="${c.title}">
        <h3 class="site-footer__title">${c.title}</h3>
        <ul
          class="site-footer__links">${c.links.map((l) =>
            html`<li><a class="site-footer__link" href="${l.href}">${l.label}</a></li>`
          )}</ul>
      </nav>
    `;
  const hasBrand = props.brand || props.tagline || props.newsletter;
  return html`
    <footer${classAttrs("site-footer", props.attrs)}>
      <div class="container site-footer__inner">
        <div class="site-footer__top">${hasBrand &&
          html`<div class="site-footer__brand-column">${
            props.brand &&
            html`<div class="site-footer__brand">${props.brand}</div>`
          }${
            props.tagline &&
            html`<p class="site-footer__tagline">${props.tagline}</p>`
          }${
            props.newsletter &&
            html`<div class="site-footer__newsletter">${props.newsletter}</div>`
          }</div>`}<div
            class="site-footer__columns">${props.columns.map(
              column,
            )}</div></div>${(props.bottom || props.social?.length) &&
              html`<div class="site-footer__bottom">${
                props.bottom && html`<div class="site-footer__legal">${props.bottom}</div>`
              }${
                props.social?.length &&
                html`<ul class="site-footer__social">${
                  props.social.map((s) =>
                    html`<li><a class="site-footer__social-link" href="${s.href}" aria-label="${s.label}">${s.icon}</a></li>`
                  )
                }</ul>`
              }</div>`}
      </div>
      </footer>
  `;
}
