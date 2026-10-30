import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
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
  /**
   * Start the block transparent until it is in view. Off by default, so
   * text wrapped in a reveal is always readable — a fast scroll can pass a
   * heading before it arrives; `rise` and `scale` only move it. Turn it on
   * for media and decoration. (`fade` and `blur` always hide: that is all
   * they do.) @default false
   */
  hide?: boolean;
  attrs?: Attrs;
};

/**
 * Content that arrives as it scrolls into view. Moved only under
 * `html.js` (a page without the script shows everything at once), and
 * never transparent unless `hide` (or a `fade` / `blur` effect) says so;
 * reveal.js adds `is-revealed` when the block enters the viewport, so the
 * effect never costs a plain page anything. Blocks already on screen at
 * load reveal immediately.
 */
export function Reveal(props: RevealProps): Html {
  const attrs = mergeAttrs(props.attrs, {
    "data-reveal": props.effect ?? "rise",
    "data-reveal-repeat": props.once === false ? "" : undefined,
    "data-reveal-hide": props.hide ? "" : undefined,
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
  /** Each item starts transparent (see `RevealProps.hide`). @default false */
  hide?: boolean;
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
    Reveal({ content, effect: props.effect, once: props.once, hide: props.hide, tag })
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

/** Which edge of the viewport the reading-progress bar sits on. */
export type ScrollProgressPosition = "top" | "bottom";

export type ScrollProgressProps = {
  id?: string;
  /** @default "top" */
  position?: ScrollProgressPosition;
  /**
   * A selector for the element whose reading the bar tracks — an article.
   * Without it the bar tracks the whole page, and a browser with
   * scroll-driven animations draws it with no script at all.
   */
  target?: string;
  attrs?: Attrs;
};

/**
 * A thin reading-progress bar fixed to the viewport's edge, filling as
 * the page (or `target`) scrolls past. Pure CSS where
 * `animation-timeline: scroll()` exists and no target is set; reveal.js
 * otherwise writes `--scroll-progress` on each scroll frame. Decorative:
 * `aria-hidden`, and a screen reader never hears it.
 */
export function ScrollProgress(props: ScrollProgressProps = {}): Html {
  const attrs = mergeAttrs(props.attrs, {
    id: props.id,
    "data-scroll-progress": props.target ?? "",
    "aria-hidden": "true",
  });
  const cls = cx("scroll-progress", props.position === "bottom" && "scroll-progress--bottom");
  return html`
    <div${classAttrs(cls, attrs)}>
      <div class="scroll-progress__bar"></div>
      </div>
  `;
}

/** How long a counted number takes to arrive: 600 / 1200 / 2000 ms. */
export type CountUpDuration = "fast" | "base" | "slow";
/** How a counted number is written: with a locale's grouping, compacted (1.2K), as a percent, or as money. */
export type CountUpFormat = "number" | "compact" | "percent" | `currency:${string}`;
/** The element a counted number renders as. */
export type CountUpTag = "span" | "strong" | "b";

export type CountUpProps = {
  /** The figure the number arrives at — rendered in full in the markup. */
  value: number;
  /** Where the count starts. @default 0 */
  from?: number;
  /** @default "base" */
  duration?: CountUpDuration;
  /** @default "number" */
  format?: CountUpFormat;
  /** `Intl` locale for grouping and currency; the page's `lang` when unset. */
  locale?: string;
  /** Decimal places; inferred from the value when unset. */
  decimals?: number;
  /** @default "span" */
  tag?: CountUpTag;
  attrs?: Attrs;
};

const COUNT_MS: Record<CountUpDuration, string> = { fast: "600", base: "1200", slow: "2000" };

function intlOptions(format: CountUpFormat, decimals: number): Intl.NumberFormatOptions {
  const base: Intl.NumberFormatOptions = { maximumFractionDigits: decimals, minimumFractionDigits: decimals };
  if (format === "compact") return { ...base, notation: "compact", maximumFractionDigits: 1, minimumFractionDigits: 0 };
  if (format === "percent") return { ...base, style: "percent" };
  if (format.startsWith("currency:")) return { ...base, style: "currency", currency: format.slice(9) };
  return base;
}

/**
 * A figure that counts up to its value as it scrolls into view — a stat on
 * a landing page. The markup carries the final, formatted number (a plain
 * page, a crawler and a reduced-motion user all read the figure itself);
 * reveal.js animates from `from` once on first sight, writing the same
 * `Intl.NumberFormat` output each frame, and ends on the exact text it
 * was given. `format: "percent"` takes a fraction (0.42 → 42%).
 */
export function CountUp(props: CountUpProps): Html {
  const format = props.format ?? "number";
  const decimals = props.decimals ?? (Number.isInteger(props.value) ? 0 : 2);
  const text = new Intl.NumberFormat(props.locale ?? "en", intlOptions(format, decimals)).format(props.value);
  const attrs = mergeAttrs(props.attrs, {
    "data-count-up": String(props.value),
    "data-count-from": props.from === undefined ? undefined : String(props.from),
    "data-count-duration": COUNT_MS[props.duration ?? "base"],
    "data-count-format": format === "number" ? undefined : format,
    "data-count-locale": props.locale,
    "data-count-decimals": String(decimals),
  });
  switch (props.tag) {
    case "strong":
      return html`<strong${classAttrs("count-up", attrs)}>${text}</strong>`;
    case "b":
      return html`<b${classAttrs("count-up", attrs)}>${text}</b>`;
    default:
      return html`<span${classAttrs("count-up", attrs)}>${text}</span>`;
  }
}

/** How tall each step's scroll band is: 60 / 80 / 100 vh. */
export type ScrollStepsHeight = "sm" | "md" | "lg";

export type ScrollStep = {
  /** The step's text — a heading and a paragraph. */
  content: Html;
  /** What the sticky stage shows while this step is current. */
  media?: Html;
};

export type ScrollStepsProps = {
  /** Required: the step ids derive from it. */
  id: string;
  steps: ScrollStep[];
  /** @default "md" */
  height?: ScrollStepsHeight;
  /** Which side the stage sits on at ≥ 768. @default "end" */
  stage?: "start" | "end";
  /** Accessible name of the step list. @default "Steps" */
  label?: string;
  /**
   * Mute the text of the steps that are not current. `false` keeps every
   * step at full text colour — only the stage's picture changes. @default true
   */
  dim?: boolean;
  attrs?: Attrs;
};

/**
 * Scrollytelling: a column of steps beside a sticky stage whose media
 * cross-fades as each step scrolls through the middle of the viewport.
 * The first step is current in the markup; reveal.js makes the step whose
 * text is nearest the viewport's middle current (`aria-current="step"`,
 * `is-active`), so the stage and the text on screen always agree. A
 * heading that opens a step is drawn at `--scroll-steps-title-size`.
 * Below 768 the stage is hidden and each step shows its own media in
 * flow — the story reads top to bottom with nothing sticky, and a plain
 * page reads the same way at every width.
 */
export function ScrollSteps(props: ScrollStepsProps): Html {
  const attrs = mergeAttrs(props.attrs, { id: props.id, "data-scroll-steps": "" });
  const cls = cx(
    "scroll-steps",
    `scroll-steps--${props.height ?? "md"}`,
    props.stage === "start" && "scroll-steps--stage-start",
    props.dim === false && "scroll-steps--no-dim",
  );
  const steps = props.steps.map((step, i) =>
    html`<li ${
      renderAttrs({
        class: cx("scroll-steps__step", i === 0 && "is-active"),
        id: `${props.id}-step-${i + 1}`,
        "data-scroll-step": String(i),
        "aria-current": i === 0 ? "step" : undefined,
      })
    }><div class="scroll-steps__text">${step.content}</div>${
      step.media ? html`<div class="scroll-steps__inline-media">${step.media}</div>` : ""
    }</li>`
  );
  const media = props.steps.map((step, i) =>
    html`<div ${
      renderAttrs({
        class: cx("scroll-steps__media", i === 0 && "is-active"),
        "data-scroll-step-media": String(i),
        "aria-hidden": "true",
      })
    }>${step.media ?? ""}</div>`
  );
  return html`
    <section${classAttrs(cls, attrs)}>
      <ol class="scroll-steps__list" aria-label="${props.label ?? "Steps"}">${steps}</ol>
      <div class="scroll-steps__stage">${media}</div>
      </section>
  `;
}
