import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type CardVariant = "outlined" | "elevated" | "flat" | "danger";
export type CardOrientation = "vertical" | "horizontal";
export type CardTag = "div" | "a" | "button";
export type CardMediaRatio = "wide" | "square" | "tall" | "banner";

export type CardMediaProps = {
  src: string;
  alt: string;
  ratio?: CardMediaRatio;
  /** Defaults to lazy — cards are usually many in a list. Use "eager" for
   * a hero that is in the first viewport. */
  loading?: "lazy" | "eager";
  /** Content pinned over the media, e.g. a title on a feature image. */
  overlay?: string | Html;
};

export type CardHeaderProps = {
  avatar?: string | Html;
  title?: string | Html;
  subtitle?: string | Html;
  /** e.g. a kebab menu button. Sits above the stretched link (see `href`
   * on `CardProps`) so it stays independently clickable. */
  actions?: string | Html;
};

export type CardFooterProps = {
  content: string | Html;
  split?: boolean;
};

export type CardProps = CardHeaderProps & {
  id?: string;
  /** Forces the root element's tag; overrides the `href` stretched-link
   * behavior below (falls back to wrapping the whole root in `<a>`). */
  as?: CardTag;
  /**
   * Makes the card link to `href` without wrapping the whole thing in an
   * `<a>` — the title becomes a "stretched link" covering the full card
   * (or, with no title, an invisible full-card link), so `actions`/
   * `footer` buttons keep working instead of the anchor swallowing their
   * clicks.
   */
  href?: string;
  variant?: CardVariant;
  orientation?: CardOrientation;
  /** Hover/focus affordance; also makes a non-link root focusable. */
  interactive?: boolean;
  selected?: boolean;
  media?: CardMediaProps;
  body?: string | Html;
  footer?: string | Html;
  footerSplit?: boolean;
  /** Escape hatch for rAPId's data-* wiring, aria-*, etc. */
  attrs?: Attrs;
};

const VARIANT_CLASS: Record<CardVariant, string> = {
  outlined: "",
  elevated: "card--elevated",
  flat: "card--flat",
  danger: "card--danger",
};

const MEDIA_RATIO_CLASS: Record<CardMediaRatio, string> = {
  wide: "",
  square: "card__media--square",
  tall: "card__media--tall",
  banner: "card__media--banner",
};

export function CardMedia(props: CardMediaProps): Html {
  const className = cx(
    "card__media",
    MEDIA_RATIO_CLASS[props.ratio ?? "wide"],
  );

  return html`
    <div
      class="${className}"><img src="${props.src}" alt="${props.alt}" loading="${props.loading ??
        "lazy"}" decoding="async">${props.overlay &&
        html`<div class="card__media-overlay">${props.overlay}</div>`}</div>
  `;
}

export function CardHeader(
  props: CardHeaderProps,
  opts: { titleHref?: string } = {},
): Html {
  if (!props.avatar && !props.title && !props.subtitle && !props.actions) {
    return html``;
  }

  const titleContent = opts.titleHref
    ? html`<a class="card__title-link" href="${opts.titleHref}">${props.title}</a>`
    : props.title;

  const heading = (props.title || props.subtitle) &&
    html`<div class="card__heading">${props.title && html`<div class="card__title">${titleContent}</div>`}${
      props.subtitle &&
      html`<div class="card__subtitle">${props.subtitle}</div>`
    }</div>`;

  return html`<div class="card__header">${
    props.avatar && html`<div class="card__avatar">${props.avatar}</div>`
  }${heading}${props.actions && html`<div class="card__actions">${props.actions}</div>`}</div>`;
}

export function CardBody(body: string | Html): Html {
  return html`<div class="card__body">${body}</div>`;
}

export function CardFooter(props: CardFooterProps): Html {
  const className = cx("card__footer", props.split && "card__footer--split");
  return html`<div class="${className}">${props.content}</div>`;
}

function renderRoot(
  tag: CardTag,
  className: string,
  attrs: Attrs,
  inner: Html,
): Html {
  const rendered = renderAttrs(attrs);
  switch (tag) {
    case "a":
      return html`
        <a class="${className}" ${rendered}>${inner}</a>
      `;
    case "button":
      return html`
        <button type="button" class="${className}" ${rendered}>${inner}</button>
      `;
    default:
      return html`
        <div class="${className}" ${rendered}>${inner}</div>
      `;
  }
}

export function Card(props: CardProps): Html {
  const tag: CardTag = props.as ?? "div";
  const useStretchLink = Boolean(props.href) && tag !== "a";
  const isInteractive = Boolean(props.href) || Boolean(props.interactive);
  const needsFocusHandling = props.interactive && tag === "div" &&
    !useStretchLink;

  // `attrs.class` is merged into the component's own class list rather
  // than emitted as a second `class` attribute (which browsers ignore).
  const { class: extraClass, ...restAttrs } = props.attrs ?? {};
  const className = cx(
    "card",
    VARIANT_CLASS[props.variant ?? "outlined"],
    props.orientation === "horizontal" && "card--horizontal",
    isInteractive && "card--clickable",
    props.selected && "card--selected",
    extraClass,
  );

  const attrs: Attrs = {
    ...restAttrs,
    id: props.id,
    href: tag === "a" ? props.href : undefined,
    role: needsFocusHandling ? "button" : undefined,
    tabindex: needsFocusHandling ? "0" : undefined,
  };

  const header = CardHeader(props, {
    titleHref: useStretchLink && props.title ? props.href : undefined,
  });
  const body = props.body !== undefined ? CardBody(props.body) : html``;
  const footer = props.footer ? CardFooter({ content: props.footer, split: props.footerSplit }) : html``;

  const stretchFallback = useStretchLink && !props.title
    ? html`<a class="card__stretch-link" href="${props.href}"><span class="sr-only">View</span></a>`
    : html``;

  const inner = html`${
    props.media && CardMedia(props.media)
  }<div class="card__content">${header}${body}${footer}</div>${stretchFallback}`;

  return renderRoot(tag, className, attrs, inner);
}
