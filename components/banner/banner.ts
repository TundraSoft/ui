import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type BannerVariant = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export type BannerProps = {
  id?: string;
  /** Colour. `accent` is the brand strip — a launch, a promotion. @default "neutral" */
  variant?: BannerVariant;
  /** The one line (two at most) the strip says. */
  body: string | Html;
  /**
   * The inline action beside the text — a link when `href` is set, else
   * a button that needs its own `attrs` (`data-action`, `data-modal-open`…).
   */
  action?: { label: string; href?: string; attrs?: Attrs };
  /** A close button at the end; shared/js/dismiss.js removes the strip. */
  dismissible?: boolean;
  /**
   * Remember a dismissal in this browser under this key (localStorage;
   * banner.js hides the strip on later visits). Change the key to show a
   * new notice to people who dismissed the last one.
   */
  storageKey?: string;
  /** Leading icon; status variants get one by default. Pass `false` to suppress. */
  icon?: Html | false;
  /** Stays at the top of the viewport while the page scrolls. */
  sticky?: boolean;
  /**
   * How a screen reader announces it: `status` (polite) by default;
   * `alert` interrupts (an outage notice swapped in); `none` renders no
   * live role (a static strip that was on the page from the start).
   * @default "status"
   */
  role?: "status" | "alert" | "none";
  attrs?: Attrs;
};

const VARIANT_CLASS: Record<BannerVariant, string> = {
  neutral: "",
  info: "banner--info",
  success: "banner--success",
  warning: "banner--warning",
  danger: "banner--danger",
  accent: "banner--accent",
};

function defaultIcon(variant: BannerVariant): Html | undefined {
  switch (variant) {
    case "success":
      return Icon("check", { size: 15 });
    case "warning":
    case "danger":
      return Icon("warning", { size: 15 });
    case "info":
      return Icon("info", { size: 15 });
    default:
      return undefined;
  }
}

/**
 * A page-level strip — an announcement, a maintenance window, a plan
 * nudge — for the top of a page, above or under the navbar (`Alert` is
 * the in-content notice). One line of centred text, an inline action and
 * a close button; `storageKey` keeps it dismissed across visits.
 */
export function Banner(props: BannerProps): Html {
  const variant = props.variant ?? "neutral";
  const icon = props.icon === false ? undefined : props.icon ?? defaultIcon(variant);
  const role = props.role ?? "status";
  const attrs: Attrs = mergeAttrs(props.attrs, {
    id: props.id,
    role: role === "none" ? undefined : role,
    "data-banner": "",
    "data-banner-key": props.storageKey,
    "data-dismissible": props.dismissible ? "" : undefined,
    // Hidden until banner.js has checked the stored choice; a page
    // without the script shows it (the attribute is only set with a key).
    hidden: props.storageKey ? "" : undefined,
  });
  const action = props.action;
  return html`
    <div ${classAttrs(cx("banner", VARIANT_CLASS[variant], props.sticky && "banner--sticky"), attrs)}>
      <div class="banner__inner">${icon && html`
        <span class="banner__icon" aria-hidden="true">${icon}</span>
      `}<span class="banner__body">${props.body}</span>${action
        ? action.href
          ? html`
            <a ${classAttrs("banner__action", action.attrs)} href="${action.href}">${action.label}</a>
          `
          : html`
            <button type="button" ${classAttrs("banner__action", action.attrs)}>${action.label}</button>
          `
        : ""}</div>${props.dismissible
        ? html`
          <button type="button" class="banner__close" data-dismiss aria-label="Dismiss">${Icon("x", {
            size: 14,
          })}</button>
        `
        : ""}
    </div>
  `;
}
