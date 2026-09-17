import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
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
  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    "data-dismissible": "",
    "data-toast-autodismiss": props.autoDismissMs ? String(props.autoDismissMs) : undefined,
  };

  return html`<div${classAttrs(className, attrs)}>${
    icon && html`<span class="toast__icon">${icon}</span>`
  }<div class="toast__body">${props.body}${props.meta && html`<div class="toast__meta">${props.meta}</div>`}</div>${
    props.action &&
    html`
      <button type="button" class="toast__action" ${renderAttrs(props.action.attrs ?? {})}>${props.action
        .label}</button>
    `
  }${
    props.dismissible !== false &&
    html`<button type="button" class="toast__close" data-dismiss aria-label="Dismiss">${
      Icon("x", { size: 15 })
    }</button>`
  }</div>`;
}

/** The fixed-position container a page renders once; toasts get appended into it. */
export function ToastRegion(props: { id?: string; toasts?: Html[]; max?: number } = {}): Html {
  return html`
    <div class="toast-region" id="${props.id ?? "toast-region"}" role="status" aria-live="polite" ${renderAttrs({
      "data-toast-max": props.max ? String(props.max) : undefined,
    })}>${props.toasts ?? []}</div>
  `;
}
