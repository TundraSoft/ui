/** Usage examples for components/site-footer — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { SiteFooter } from "../../../components/site-footer/site-footer.ts";
import { Icon } from "../../../shared/icons.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/site-footer": [
    {
      title: "In a layout's footer slot",
      note: "The layout already wraps the slot in a `<footer>`, so this one renders a `<div>`.",
      render: () =>
        SiteFooter({
          tag: "div",
          columns: [{ title: "Company", links: [{ label: "About", href: "/about" }] }],
        }),
    },
    {
      title: "The site's foot",
      render: () =>
        SiteFooter({
          brand: html`
            <strong>Acme</strong>
          `,
          tagline: "Invoices your customers pay on time.",
          columns: [
            {
              title: "Product",
              links: [{ label: "Pricing", href: "/pricing" }, { label: "Changelog", href: "/changelog" }],
            },
            { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Careers", href: "/careers" }] },
            { title: "Legal", links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
          ],
          bottom: html`
            © 2026 Acme Inc.
          `,
          social: [{ label: "Email Acme", href: "mailto:hello@acme.example", icon: Icon("mail", { size: 16 }) }],
        }),
    },
  ],
};
