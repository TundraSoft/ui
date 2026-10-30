/** Catalogue cases for components/site-footer — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { Input } from "../../../components/input/input.ts";
import { SiteFooter } from "../../../components/site-footer/site-footer.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const columns = [
  {
    title: "Product",
    links: [{ label: "Invoices", href: "#" }, { label: "Reminders", href: "#" }, { label: "Payments", href: "#" }, {
      label: "Pricing",
      href: "#",
    }],
  },
  {
    title: "Company",
    links: [{ label: "About", href: "#" }, { label: "Blog", href: "#" }, { label: "Careers", href: "#" }],
  },
  {
    title: "Resources",
    links: [{ label: "Docs", href: "#" }, { label: "Status", href: "#" }, { label: "Changelog", href: "#" }],
  },
  { title: "Legal", links: [{ label: "Privacy", href: "#" }, { label: "Terms", href: "#" }] },
];
const brand = html`
  <span class="sidebar__brand-mark">A</span> Acme
`;
const social = [
  { label: "Acme on the web", href: "#", icon: Icon("globe", { size: 16 }) },
  { label: "Email Acme", href: "#", icon: Icon("mail", { size: 16 }) },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "site-footer",
    cases: [
      caseOf(
        "brand, tagline, newsletter, four columns, bottom bar with social",
        SiteFooter({
          brand,
          tagline: "Invoices your customers pay on time.",
          newsletter: html`
            <form class="cat-row" action="#"><div class="cat-narrow">${Input({
              id: "cat-footer-email",
              name: "email",
              type: "email",
              placeholder: "you@example.com",
              attrs: { "aria-label": "Email" },
            })}</div>${Button({ label: "Subscribe", type: "submit" })}</form>
          `,
          columns,
          bottom: html`
            © 2026 Acme Inc.
          `,
          social,
          attrs: { id: "cat-footer-full" },
        }),
      ),
      caseOf("columns only", SiteFooter({ columns: columns.slice(0, 3) })),
      caseOf(
        "tag: div inside a layout's <footer> (#cat-footer-div); tag: footer is the default",
        html`
          <footer class="layout__footer">${SiteFooter({
            tag: "div",
            columns: columns.slice(0, 2),
            attrs: { id: "cat-footer-div" },
          })}</footer>
          ${SiteFooter({ tag: "footer", columns: columns.slice(0, 1), attrs: { id: "cat-footer-tag" } })}
        `,
      ),
    ],
  };
}
