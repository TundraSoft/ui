import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

/** How a revealed block arrives: fade in place, rise from below, grow from 96%, or sharpen from a blur. */
export type RevealEffect = "fade" | "rise" | "scale" | "blur";
/** A delay before the reveal plays, in steps of 80 ms (classes, never an inline style). */
export type RevealDelay = "0" | "1" | "2" | "3";
/** The element the reveal renders as. */
export type RevealTag = "div" | "section" | "li" | "span";

export type RevealProps = {
  content: Html;
  /** @default "rise" */
  effect?: RevealEffect;
  /** @default "0" */
  delay?: RevealDelay;
  /**
   * Reveal once and stay (default). `false` hides it again when it
   * scrolls out, so it replays on the way back.
   */
  once?: boolean;
  /** @default "div" */
  tag?: RevealTag;
  attrs?: Attrs;
};

/**
 * Content that reveals itself as it scrolls into view. Hidden only under
 * `html.js` (a page without the script shows everything at once);
 * reveal.js adds `is-revealed` when the block enters the viewport, so the
 * effect never costs a plain page anything. Blocks already on screen at
 * load reveal immediately.
 */
export function Reveal(props: RevealProps): Html {
  const attrs = mergeAttrs(props.attrs, {
    "data-reveal": props.effect ?? "rise",
    "data-reveal-repeat": props.once === false ? "" : undefined,
  });
  const cls = cx("reveal", props.delay && props.delay !== "0" && `reveal--delay-${props.delay}`);
  switch (props.tag) {
    case "section":
      return html`<section${classAttrs(cls, attrs)}>${props.content}</section>`;
    case "li":
      return html`<li${classAttrs(cls, attrs)}>${props.content}</li>`;
    case "span":
      return html`<span${classAttrs(cls, attrs)}>${props.content}</span>`;
    default:
      return html`<div${classAttrs(cls, attrs)}>${props.content}</div>`;
  }
}

export type RevealGroupProps = {
  /** Each item becomes its own `Reveal`. */
  items: Html[];
  /** @default "rise" */
  effect?: RevealEffect;
  /**
   * Stagger the items: reveal.js numbers each child (`--reveal-index`,
   * through the CSSOM) and the stylesheet delays it by that many steps.
   * @default true
   */
  stagger?: boolean;
  once?: boolean;
  /** The group element. @default "div" */
  tag?: "div" | "ul";
  attrs?: Attrs;
};

/** A row or list of blocks that reveal one after another. */
export function RevealGroup(props: RevealGroupProps): Html {
  const attrs = mergeAttrs(props.attrs, {
    "data-reveal-group": "",
    "data-reveal-stagger": props.stagger === false ? undefined : "",
  });
  const tag = props.tag === "ul" ? "li" : "div";
  const items = props.items.map((content) =>
    Reveal({ content, effect: props.effect, once: props.once, tag })
  );
  return props.tag === "ul"
    ? html`<ul${classAttrs("reveal-group", attrs)}>${items}</ul>`
    : html`<div${classAttrs("reveal-group", attrs)}>${items}</div>`;
}

/** How far a parallax block drifts against the scroll: a tenth, a fifth or a third of the distance. */
export type ParallaxSpeed = "slow" | "medium" | "fast";

const PARALLAX_FACTOR: Record<ParallaxSpeed, string> = { slow: "0.1", medium: "0.2", fast: "0.35" };

export type ParallaxProps = {
  content: Html;
  /** @default "medium" */
  speed?: ParallaxSpeed;
  attrs?: Attrs;
};

/**
 * A block that drifts against the scroll — a hero image, a decorative
 * panel. reveal.js moves it with a transform while it is on screen,
 * throttled to animation frames. It stays still under reduced motion and
 * on coarse pointers (phones): a transform per scroll frame on a phone
 * fights the browser's own scroll compositing and judders. Overflow is
 * the caller's to clip: give the parent `overflow: hidden` or let the
 * block bleed.
 */
export function Parallax(props: ParallaxProps): Html {
  const attrs = mergeAttrs(props.attrs, { "data-parallax": PARALLAX_FACTOR[props.speed ?? "medium"] });
  return html`<div${classAttrs("parallax", attrs)}>${props.content}</div>`;
}

export type LazySectionProps = {
  /** Required: the swapped region keeps this id. */
  id: string;
  /** The fragment URL rAPId fetches once the section nears the viewport. */
  action: string;
  /** What shows until then — a Skeleton, or static content a plain page keeps. */
  placeholder: Html;
  /** How far ahead of the viewport to fetch. @default "200px 0px" */
  rootMargin?: string;
  attrs?: Attrs;
};

/**
 * A section that loads when it is about to be seen, not on page load — a
 * long landing page's lower bands. With the rAPId runtime on the page
 * reveal.js calls `window.rapid.swap(action, section)` as it nears the
 * viewport (unlike `data-load`, which fetches on mount). On a plain page
 * there is no runtime: the section keeps its placeholder, so give it
 * content worth keeping (static sections need no loading at all) —
 * reveal.js marks it `data-lazy-inert` and moves on.
 */
export function LazySection(props: LazySectionProps): Html {
  const attrs = mergeAttrs(props.attrs, {
    id: props.id,
    "data-lazy-section": "",
    "data-action": props.action,
    "data-lazy-margin": props.rootMargin,
  });
  return html`<section${classAttrs("lazy-section", attrs)}>${props.placeholder}</section>`;
}
