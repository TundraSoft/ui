/** Catalogue cases for components/banner — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Banner, type BannerVariant } from "../../../components/banner/banner.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const variants: BannerVariant[] = ["neutral", "info", "success", "warning", "danger", "accent"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "banner",
    cases: [
      ...variants.map((variant) =>
        caseOf(
          `variant ${variant}`,
          Banner({
            id: `cat-banner-${variant}`,
            variant,
            body: `A ${variant} notice across the top of the page.`,
            action: { label: "Learn more", href: "#" },
          }),
        )
      ),
      caseOf(
        "dismissible — the close button removes the strip (#cat-banner-dismiss)",
        Banner({
          id: "cat-banner-dismiss",
          variant: "info",
          body: "Scheduled maintenance on Sunday 02:00–03:00 UTC.",
          dismissible: true,
        }),
      ),
      caseOf(
        "storageKey — dismissed once, hidden on later visits in this browser (#cat-banner-stored)",
        Banner({
          id: "cat-banner-stored",
          variant: "accent",
          body: "Workspaces are here: one account, every team.",
          action: { label: "See what changed", href: "#" },
          dismissible: true,
          storageKey: "cat-banner-workspaces",
        }),
      ),
      caseOf(
        "button action, own icon, no live role",
        Banner({
          id: "cat-banner-button",
          body: "Your trial ends in 3 days.",
          icon: Icon("clock", { size: 15 }),
          role: "none",
          action: { label: "Upgrade", attrs: { "data-modal-open": "#cat-banner-upgrade" } },
        }),
      ),
      caseOf(
        "sticky — stays at the top of the scroll box it sits in",
        html`
          <div class="cat-banner-scroll">
            ${Banner({
              id: "cat-banner-sticky",
              variant: "warning",
              sticky: true,
              body: "Read-only while we migrate.",
            })}<p>Scroll inside this box: the strip stays put.</p>
            <p>…</p>
            <p>…</p>
            <p>…</p>
            <p>…</p>
            <p>…</p>
            <p>…</p>
          </div>
        `,
      ),
    ],
  };
}
