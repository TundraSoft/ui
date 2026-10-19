import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { Button, type ButtonVariant } from "../button/button.ts";

/** A script to load once the visitor accepts — a tracker's loader. */
export type ConsentLoader = {
  /** The script URL. Under a strict CSP its origin must be in `script-src`. */
  src: string;
  /** Load without blocking the next loader (`gtag/js`). @default false — loaders run in order */
  async?: boolean;
  /**
   * Attributes the loader reads (`data-id`, `data-path`) and
   * `integrity` / `crossorigin`. Event-handler attributes (`on*`) are
   * refused.
   */
  attrs?: Readonly<Record<string, string>>;
};

export type ConsentBannerProps = {
  /** The banner's id — what `[data-consent-open="#consent"]` targets. @default "consent" */
  id?: string;
  /** The question, e.g. "Cookies for analytics?" */
  title: string | Html;
  /** What is collected, by whom, and where to read more. */
  body: string | Html;
  /** The Accept button's text. @default "Accept" */
  accept?: string;
  /** The Reject button's text. @default "Reject" */
  reject?: string;
  /**
   * Both buttons wear the same variant: refusing is as easy and as
   * prominent as accepting, and nothing is pre-ticked. @default "primary"
   */
  variant?: ButtonVariant;
  /** Loaded, in order, after Accept — and on every later visit while the choice stands. */
  loaders?: readonly ConsentLoader[];
  /**
   * Where the choice is kept (`granted` | `denied`) in localStorage — in
   * the browser, so every visitor gets the same cached page. @default "ui-consent"
   */
  storageKey?: string;
  /**
   * Cookies expired on Reject, on the host and every parent domain; a
   * trailing `*` matches a prefix. @default Google Analytics and Microsoft
   * Clarity's: `_ga*`, `_gid`, `_gat*`, `_clck`, `_clsk`
   */
  cookies?: readonly string[];
  attrs?: Attrs;
};

/**
 * Asks once whether analytics may run, and runs them only after a yes.
 *
 * Rendered `hidden`: consent.js shows it to a visitor who has not chosen,
 * loads `loaders` on Accept (and on later visits while the choice stands),
 * and on Reject withdraws — `gtag('consent', 'update', …denied)` and
 * `clarity('consent', false)` when present, the trackers' cookies
 * expired. `[data-consent-open]` anywhere (a "Cookie settings" link)
 * shows it again with focus on its first button; `consent:change`
 * (`detail: { state, key }`) bubbles from it on every choice. Without a
 * script nothing loads and nothing is asked. CSP-clean: the loaders are
 * data attributes, never inline script.
 */
export function ConsentBanner(props: ConsentBannerProps): Html {
  const id = props.id ?? "consent";
  const variant = props.variant ?? "primary";
  const attrs = mergeAttrs(props.attrs, {
    id,
    role: "region",
    "aria-labelledby": `${id}-title`,
    "data-consent": "",
    "data-consent-key": props.storageKey,
    "data-consent-loaders": props.loaders?.length ? JSON.stringify(props.loaders) : undefined,
    "data-consent-cookies": props.cookies ? JSON.stringify(props.cookies) : undefined,
    hidden: "",
  });
  return html`
    <div${classAttrs("consent", attrs)}>
      <div class="consent__card">
        <div class="consent__text">
          <p class="consent__title" id="${id}-title">${props
            .title}</p>
          <div class="consent__body">${props.body}</div>
        </div>
        <div class="consent__actions">${Button({
          label: props.accept ?? "Accept",
          variant,
          attrs: { "data-consent-accept": "" },
        })}${Button({ label: props.reject ?? "Reject", variant, attrs: { "data-consent-reject": "" } })}</div>
      </div>
      </div>
  `;
}
