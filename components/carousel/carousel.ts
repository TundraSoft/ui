import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

/** Slides per view from 768px up (always one on a phone); `auto` keeps each slide's own width. */
export type CarouselPerView = "1" | "2" | "3" | "auto";
/** Space between slides. */
export type CarouselGap = "sm" | "md" | "lg";

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
  /** Prev/next buttons. @default true */
  controls?: boolean;
  /** One dot per slide. @default true */
  dots?: boolean;
  /** The next slide peeks in at the edge, a hint there is more. */
  peek?: boolean;
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
  const attrs = mergeAttrs(props.attrs, {
    id: props.id,
    "data-carousel": "",
    "data-carousel-loop": props.loop ? "" : undefined,
    "data-carousel-autoplay": props.autoplay ? String(props.autoplay) : undefined,
    "aria-roledescription": "carousel",
    "aria-label": props.label,
  });
  const cls = cx(
    "carousel",
    `carousel--per-${props.perView ?? "1"}`,
    props.gap && props.gap !== "md" && `carousel--gap-${props.gap}`,
    props.peek && "carousel--peek",
  );
  const controls = props.controls !== false &&
    html`
      <div class="carousel__controls"><button type="button" class="btn btn--outline btn--icon carousel__button"
          data-carousel-prev aria-label="Previous slide">${Icon("chevronLeft", { size: 16 })}</button><button
          type="button" class="btn btn--outline btn--icon carousel__button" data-carousel-next
          aria-label="Next slide">${Icon("chevronRight", { size: 16 })}</button></div>
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
  return html`
    <section${classAttrs(cls, attrs)}>
      <div class="carousel__track" data-carousel-track tabindex="0">${props.items.map((item, i) =>
        html`
          <div class="carousel__slide" role="group" aria-roledescription="slide" aria-label="${String(
            i + 1,
          )} of ${String(props.items.length)}"
            data-carousel-slide>${item}</div>
        `
      )}</div>
      <div class="carousel__bar">${dots}${controls}</div>
      </section>
  `;
}
