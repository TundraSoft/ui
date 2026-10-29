import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

/** A bordered card, a plain quote on the page ground, or one large pull quote. */
export type TestimonialVariant = "card" | "plain" | "large";

export type TestimonialProps = {
  quote: string | Html;
  name: string;
  /** Title and company — "CTO, Northwind". */
  role?: string;
  /** An `Avatar(...)`. */
  avatar?: Html;
  /** The customer's logo (an `<img>` or an inline SVG), shown at the top. */
  logo?: Html;
  /** 1–5, drawn as stars. */
  rating?: number;
  /** @default "card" */
  variant?: TestimonialVariant;
  attrs?: Attrs;
};

function stars(rating: number): Html {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return html`
    <span class="testimonial__rating" role="img" aria-label="${String(n)} out of 5 stars">${Array.from(
      { length: 5 },
      (_, i) =>
        html`<span class="${cx("testimonial__star", i < n && "testimonial__star--on")}">${
          Icon("star", { size: 14 })
        }</span>`,
    )}</span>
  `;
}

/** One customer's words, with who said them. */
export function Testimonial(props: TestimonialProps): Html {
  const variant = props.variant ?? "card";
  return html`
    <figure${classAttrs(cx("testimonial", `testimonial--${variant}`), props.attrs)}>${props.logo &&
      html`<div class="testimonial__logo">${props.logo}</div>`}${props.rating !== undefined &&
      stars(props.rating)}<blockquote class="testimonial__quote">${props.quote}</blockquote><figcaption
        class="testimonial__by">${props.avatar && html`<span class="testimonial__avatar">${props.avatar}</span>`}<span
          class="testimonial__who"><span class="testimonial__name">${props.name}</span>${props.role &&
            html`<span class="testimonial__role">${props.role}</span>`}</span></figcaption></figure>
  `;
}

export type TestimonialGridProps = {
  items: TestimonialProps[];
  /** Columns from 768px up. @default "3" */
  columns?: "2" | "3";
  attrs?: Attrs;
};

/** Several testimonials in columns (one on a phone). */
export function TestimonialGrid(props: TestimonialGridProps): Html {
  return html`
    <div${classAttrs(cx("testimonial-grid", `testimonial-grid--${props.columns ?? "3"}`), props.attrs)}>${props.items
      .map(
        (item) => Testimonial({ variant: "card", ...item }),
      )}</div>
  `;
}
