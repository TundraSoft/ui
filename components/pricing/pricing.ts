import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

/** Plans per row from 768px up (they stack below). */
export type PricingColumns = "2" | "3" | "4";

export type PricingFeature = string | {
  label: string | Html;
  /** `false` draws it struck through with an x — what this plan lacks. @default true */
  included?: boolean;
};

export type PricingPlan = {
  name: string;
  /** The price as shown — "$12", "Free", "Let's talk". */
  price: string | Html;
  /** The price under the yearly toggle; without it the plan shows `price` in both. */
  priceYearly?: string | Html;
  /** "per seat / month" — the line under the price. */
  period?: string;
  description?: string | Html;
  features: PricingFeature[];
  /** The call to action — a `Button({ href })`. */
  action: Html;
  /** The plan to steer towards: raised, accent-framed, badged. */
  featured?: boolean;
  /** A label on the card's top edge — "Most popular". */
  badge?: string;
};

export type PricingToggle = {
  /** Label of the first option. @default "Monthly" */
  monthly: string;
  /** Label of the second option. @default "Yearly" */
  yearly: string;
  /** The radio group's name, if the choice should submit. @default "billing" */
  name?: string;
  /** A note beside the yearly option — "save 20%". */
  note?: string;
};

export type PricingTableProps = {
  plans: PricingPlan[];
  /** @default "3" */
  columns?: PricingColumns;
  /**
   * A monthly / yearly switch above the plans: real radios (they submit,
   * they work without JS); pricing.js mirrors the choice to
   * `data-billing` on the root and the stylesheet shows the matching
   * price. Without JS both prices show, labelled.
   */
  toggle?: PricingToggle;
  attrs?: Attrs;
};

function feature(f: PricingFeature): Html {
  const label = typeof f === "string" ? f : f.label;
  const included = typeof f === "string" ? true : f.included !== false;
  return html`
    <li class="${cx("pricing__feature", !included && "pricing__feature--off")}"><span class="pricing__feature-icon"
        aria-hidden="true">${Icon(included ? "check" : "x", { size: 14 })}</span>${label}</li>
  `;
}

function plan(p: PricingPlan, yearly: boolean): Html {
  const prices = yearly && p.priceYearly !== undefined
    ? html`<span class="pricing__price" data-period="monthly">${p.price}</span><span class="pricing__price"
        data-period="yearly">${p.priceYearly}</span>`
    : html`<span class="pricing__price">${p.price}</span>`;
  return html`
    <div class="${cx("pricing__plan", p.featured && "pricing__plan--featured")}">${p.badge &&
      html`<span class="pricing__badge">${p.badge}</span>`}<div class="pricing__head"><h3 class="pricing__name">${p
        .name}</h3>${p.description && html`<p class="pricing__description">${p.description}</p>`}</div><div
        class="pricing__amount">${prices}${p.period && html`<span class="pricing__period">${p.period}</span>`}</div><ul
        class="pricing__features">${p.features.map(feature)}</ul><div class="pricing__action">${p.action}</div></div>
  `;
}

/**
 * Plans side by side, one of them the obvious choice. Stacks on a phone;
 * the action buttons line up along the bottom whatever the feature
 * counts. A `toggle` adds the monthly/yearly switch.
 */
export function PricingTable(props: PricingTableProps): Html {
  const yearly = Boolean(props.toggle);
  const name = props.toggle?.name ?? "billing";
  const attrs = mergeAttrs(props.attrs, {
    "data-pricing": "",
    "data-billing": yearly ? "monthly" : undefined,
  });
  const toggle = props.toggle &&
    html`
      <div class="pricing__toggle" role="radiogroup" aria-label="Billing period"><label
          class="pricing__toggle-option"><input class="pricing__toggle-input" type="radio" name="${name}"
            value="monthly" checked data-pricing-period><span class="pricing__toggle-label">${props.toggle
              .monthly}</span></label><label class="pricing__toggle-option"><input class="pricing__toggle-input"
            type="radio" name="${name}" value="yearly" data-pricing-period><span class="pricing__toggle-label">${props
              .toggle.yearly}</span></label>${props.toggle.note &&
          html`<span class="pricing__toggle-note">${props.toggle.note}</span>`}</div>
    `;
  return html`
    <div${classAttrs(cx("pricing", `pricing--${props.columns ?? "3"}`), attrs)}>${toggle}<div
        class="pricing__plans">${props.plans.map((p) => plan(p, yearly))}</div></div>
  `;
}
