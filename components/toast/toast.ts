import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type ToastVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  /** Inverse surface — for undo-able bulk actions. */
  | "ink";

export type ToastProps = {
  id?: string;
  variant?: ToastVariant;
  body: string | Html;
  /** Second line, e.g. the record the action touched. */
  meta?: string | Html;
  /** Leading icon; status variants get a check/x by default. Pass `false` to suppress. */
  icon?: Html | false;
  /** Inline action such as "Undo" — give it `data-action`/`data-target` to swap. */
  action?: { label: string; attrs?: Attrs };
  dismissible?: boolean;
  /** Auto-remove after this many ms (see toast.js). */
  autoDismissMs?: number;
  attrs?: Attrs;
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
  neutral: "",
  success: "toast--success",
  warning: "toast--warning",
  danger: "toast--danger",
  info: "toast--info",
  ink: "toast--ink",
};

function defaultIcon(variant: ToastVariant): Html | undefined {
  switch (variant) {
    case "success":
      return Icon("check", { size: 13 });
    case "danger":
      return Icon("x", { size: 13 });
    case "warning":
      return Icon("warning", { size: 13 });
    case "info":
      return Icon("info", { size: 13 });
    default:
      return undefined;
  }
}

/**
 * A single toast. Push it into the region via rAPId's own swap runtime —
 * e.g. a trigger with `data-target="#toast-region" data-swap="append"` —
 * rather than any bespoke JS; toast.js only adds the auto-dismiss timer.
 */
export function Toast(props: ToastProps): Html {
  const variant = props.variant ?? "neutral";
  const className = cx("toast", VARIANT_CLASS[variant]);
  const icon = props.icon === false ? undefined : props.icon ?? defaultIcon(variant);

  // No role="status" here: the ToastRegion is already aria-live, and a
  // live region inside a live region announces twice.
  const attrs: Attrs = mergeAttrs(props.attrs, {
    id: props.id,
    "data-dismissible": "",
    "data-toast-autodismiss": props.autoDismissMs ? String(props.autoDismissMs) : undefined,
  });

  return html`<div${classAttrs(className, attrs)}>${
    icon && html`<span class="toast__icon">${icon}</span>`
  }<div class="toast__body">${props.body}${props.meta && html`<div class="toast__meta">${props.meta}</div>`}</div>${
    props.action &&
    html`
      <button type="button" ${classAttrs("toast__action", props.action.attrs ?? {})}>${props.action
        .label}</button>
    `
  }${
    props.dismissible !== false &&
    html`<button type="button" class="toast__close" data-dismiss aria-label="Dismiss">${
      Icon("x", { size: 15 })
    }</button>`
  }</div>`;
}

/** Which viewport corner (or edge middle) the toast stack grows from. */
export type ToastPosition =
  | "bottom-end"
  | "bottom-start"
  | "bottom-center"
  | "top-end"
  | "top-start"
  | "top-center";

export type ToastRegionProps = {
  /** @default "toast-region" */
  id?: string;
  /** Toasts rendered with the page. */
  toasts?: Html[];
  /** Most toasts shown at once; the oldest leave first. @default 4 */
  max?: number;
  /** @default "bottom-end" */
  position?: ToastPosition;
};

/**
 * The fixed-position container a page renders once; toasts get appended
 * into it. Where the browser has the Popover API, toast.js shows the
 * region as a manual popover so it sits in the top layer above any open
 * `<dialog>`; elsewhere it is a fixed element under the toast z-index.
 */
export function ToastRegion(props: ToastRegionProps = {}): Html {
  const position = props.position ?? "bottom-end";
  return html`
    <div ${renderAttrs({
      class: cx("toast-region", position !== "bottom-end" && `toast-region--${position}`),
      id: props.id ?? "toast-region",
      role: "status",
      "aria-live": "polite",
      "data-toast-max": props.max ? String(props.max) : undefined,
      "data-toast-position": position,
    })}>${props.toasts ?? []}</div>
  `;
}
