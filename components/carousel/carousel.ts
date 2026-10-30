import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

/** Slides per view from 768px up (always one on a phone); `auto` keeps each slide's own width. */
export type CarouselPerView = "1" | "2" | "3" | "auto";
/** Space between slides. */
export type CarouselGap = "sm" | "md" | "lg";
/** Where the prev/next buttons sit: in the bar under the slides, or at the slides' middle edges. */
export type CarouselControls = "bar" | "sides";
/** Stack the slides into a plain list below this breakpoint: 576 / 768 / 992px. */
export type CarouselStack = "sm" | "md" | "lg";

export type CarouselProps = {
  id: string;
  /** Accessible name of the region — "Customer stories". */
  label: string;
  items: Html[];
  /** @default "1" */
  perView?: CarouselPerView;
  /** @default "md" */
  gap?: CarouselGap;
  /** Next from the last slide goes back to the first. */
  loop?: boolean;
  /** Advance every this many ms; pauses while hovered, focused or off screen. */
  autoplay?: number;
  /**
   * Prev/next buttons: `true` / `"bar"` in the bar under the slides,
   * `"sides"` one at each middle edge (44px, outside the slides when the
   * page has room beside them, inside the edge when it does not), or
   * `false` for none. @default "bar"
   */
  controls?: boolean | CarouselControls;
  /** One dot per slide. @default true */
  dots?: boolean;
  /** The next slide peeks in at the edge, a hint there is more. */
  peek?: boolean;
  /**
   * Below this breakpoint the track becomes a plain list (a grid of the
   * slides, no buttons, no dots, no autoplay) — what a narrow screen
   * reads best.
   */
  stack?: CarouselStack;
  /** Stack whenever the reader asks for reduced motion (`prefers-reduced-motion: reduce`). */
  stackReducedMotion?: boolean;
  /** Stack on a page without the script, instead of the hand-scrolled strip. */
  stackNoScript?: boolean;
  /**
   * `"page"`: the slides move sideways as the page scrolls down. The
   * carousel pins (sticky under `--scroll-padding-top`, slides filling
   * the frame) in a band of that screen plus one more per slide, each
   * slide holding for `hold` of its screen; buttons, dots and arrow keys
   * scroll the page to a slide's place, so page and track never disagree.
   * Only with the script, never under reduced motion, never while
   * stacked, and only when the tallest slide fits the frame — otherwise it
   * is a plain carousel (pair it with `stack` to get a list).
   * @default "track"
   */
  scroll?: "track" | "page";
  /**
   * With `scroll: "page"`, the share of each slide's screen it stays
   * still (0–0.95); the rest is the move to the next, during which the
   * outgoing slide fades. The first and last slides get half of it at the
   * band's ends. @default 0.8
   */
  hold?: number;
  attrs?: Attrs;
};

/**
 * A row of slides that snaps as it scrolls — cards, screenshots, quotes.
 * The track is a plain scroll container (`scroll-snap-type: x
 * mandatory`), so it scrolls by hand with no script and on any touch
 * screen; carousel.js adds the buttons, the dots, the keys and the
 * autoplay. Buttons and dots are hidden without it.
 */
export function Carousel(props: CarouselProps): Html {
  const sides = props.controls === "sides";
  const attrs = mergeAttrs(props.attrs, {
    id: props.id,
    "data-carousel": "",
    "data-carousel-loop": props.loop ? "" : undefined,
    "data-carousel-autoplay": props.autoplay ? String(props.autoplay) : undefined,
    "data-carousel-scroll": props.scroll === "page" ? "page" : undefined,
    "data-carousel-hold": props.scroll === "page" && props.hold !== undefined ? String(props.hold) : undefined,
    "aria-roledescription": "carousel",
    "aria-label": props.label,
  });
  const cls = cx(
    "carousel",
    `carousel--per-${props.perView ?? "1"}`,
    props.gap && props.gap !== "md" && `carousel--gap-${props.gap}`,
    props.peek && "carousel--peek",
    sides && "carousel--sides",
    props.stack && `carousel--stack-${props.stack}`,
    props.stackReducedMotion && "carousel--stack-reduced",
    props.stackNoScript && "carousel--stack-noscript",
    props.scroll === "page" && "carousel--page",
  );
  const iconSize = sides ? 20 : 16;
  const controls = props.controls !== false &&
    html`
      <div class="${cx("carousel__controls", sides && "carousel__controls--sides")}"><button type="button" class="${cx(
        "btn btn--outline btn--icon carousel__button",
        sides && "carousel__side carousel__side--prev",
      )}"
          data-carousel-prev aria-label="Previous slide">${Icon("chevronLeft", { size: iconSize })}</button><button
          type="button" class="${cx(
            "btn btn--outline btn--icon carousel__button",
            sides && "carousel__side carousel__side--next",
          )}" data-carousel-next
          aria-label="Next slide">${Icon("chevronRight", { size: iconSize })}</button></div>
    `;
  const dots = props.dots !== false &&
    html`
      <div class="carousel__dots" data-carousel-dots>${props.items.map((_, i) =>
        html`
          <button type="button" class="carousel__dot" data-carousel-to="${String(i)}" aria-label="Go to slide ${String(
            i + 1,
          )}"
            ${renderAttrs({ "aria-current": i === 0 ? "true" : undefined })}></button>
        `
      )}</div>
    `;
  const track = html`<div class="carousel__track" data-carousel-track tabindex="0">${
    props.items.map((item, i) =>
      html`
        <div class="carousel__slide" role="group" aria-roledescription="slide" aria-label="${String(i + 1)} of ${String(
          props.items.length,
        )}"
          data-carousel-slide>${item}</div>
      `
    )
  }</div>`;
  // Side buttons sit in a frame around the track, so they centre on the
  // slides, not on slides + bar; a pinned carousel's frame and bar share
  // the sticky `.carousel__pin`.
  const frame = sides ? html`<div class="carousel__frame">${track}${controls}</div>` : track;
  const bar = sides
    ? (dots ? html`<div class="carousel__bar">${dots}</div>` : "")
    : html`<div class="carousel__bar">${dots}${controls}</div>`;
  return props.scroll === "page"
    ? html`
      <section${classAttrs(cls, attrs)}>
        <div class="carousel__pin" data-carousel-pin>${frame}${bar}</div>
        </section>
    `
    : html`<section${classAttrs(cls, attrs)}>${frame}${bar}</section>`;
}
