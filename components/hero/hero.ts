import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

/** Where the text sits: the start edge, or centred. */
export type HeroAlign = "start" | "center";
/** Stacked puts the media under the text; split puts it beside, from 992px. */
export type HeroLayout = "stacked" | "split";
/** The title's scale. */
export type HeroSize = "md" | "lg";
/** The ground: the page's, the inverse surface, or a soft accent wash. */
export type HeroTone = "default" | "inverse" | "accent";

export type HeroProps = {
  /** A short line above the title — a product name, a launch tag. */
  eyebrow?: string | Html;
  title: string | Html;
  text?: string | Html;
  /** Buttons, usually a primary and an outline one. */
  actions?: Html;
  /** An `<img>`, a `<video>`, an illustration — anything that fills a box. */
  media?: Html;
  /** @default "start" */
  align?: HeroAlign;
  /** @default "stacked" */
  layout?: HeroLayout;
  /** @default "lg" */
  size?: HeroSize;
  /** @default "default" */
  tone?: HeroTone;
  /** The media drifts against the scroll (see `Parallax`); still under reduced motion and on phones. */
  parallax?: boolean;
  /**
   * Fill the first screen: at least the small viewport's height (`svh`,
   * so a phone's collapsing toolbar never pushes the bottom off) minus
   * `--hero-fill-offset` (default `--scroll-padding-top`, the sticky
   * header's height), the text centred in the room. With a `footer`, hero
   * and footer together are exactly that first screen.
   */
  fill?: boolean;
  /** A strip at the hero's foot — a facts row, logos — inside the band, so `fill` counts it. */
  footer?: Html;
  attrs?: Attrs;
};

/**
 * The opening band of a landing page. Full-bleed friendly: put it in a
 * `StackedLayout({ width: "bleed" })` and its own `.container` keeps the
 * text on the page's column. The title balances its lines; the vertical
 * padding is `--hero-padding-block`, a theme's to retune.
 */
export function Hero(props: HeroProps): Html {
  const cls = cx(
    "hero",
    props.align === "center" && "hero--center",
    props.layout === "split" && "hero--split",
    props.size === "md" && "hero--md",
    props.tone === "inverse" && "hero--inverse",
    props.tone === "accent" && "hero--accent",
    props.fill && "hero--fill",
  );
  const media = props.media &&
    (props.parallax
      ? html`<div class="hero__media parallax" data-parallax="0.15">${props.media}</div>`
      : html`<div class="hero__media">${props.media}</div>`);
  return html`
    <section${classAttrs(cls, props.attrs)}>
      <div class="container hero__inner">
        <div class="hero__body">${props.eyebrow && html`<p class="hero__eyebrow">${props.eyebrow}</p>`}<h1
            class="hero__title">${props.title}</h1>${props.text && html`<p class="hero__text">${props.text}</p>`}${props
              .actions && html`<div class="hero__actions">${props.actions}</div>`}</div>${media}
      </div>${props.footer && html`<div class="container hero__footer">${props.footer}</div>`}
      </section>
  `;
}
