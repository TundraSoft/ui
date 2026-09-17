import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type AlertVariant = "neutral" | "success" | "warning" | "danger" | "info";

export type AlertProps = {
  id?: string;
  variant?: AlertVariant;
  title?: string | Html;
  body?: string | Html;
  /** Plain list-style messages. */
  items?: string[];
  /** Per-field messages, e.g. `RapidFormError.fields` — rendered name + message. */
  fields?: Readonly<Record<string, string>>;
  /** Leading icon; status variants get one by default. Pass `false` to suppress. */
  icon?: string | Html | false;
  dismissible?: boolean;
  attrs?: Attrs;
};

const VARIANT_CLASS: Record<AlertVariant, string> = {
  neutral: "",
  success: "alert--success",
  warning: "alert--warning",
  danger: "alert--danger",
  info: "alert--info",
};

function defaultIcon(variant: AlertVariant): Html | undefined {
  switch (variant) {
    case "success":
      return Icon("check", { size: 17 });
    case "warning":
    case "danger":
      return Icon("warning", { size: 17 });
    case "info":
      return Icon("info", { size: 17 });
    default:
      return undefined;
  }
}

export function Alert(props: AlertProps): Html {
  const variant = props.variant ?? "neutral";
  const className = cx("alert", VARIANT_CLASS[variant]);
  const icon = props.icon === false ? undefined : props.icon ?? defaultIcon(variant);

  const attrs: Attrs = {
    ...props.attrs,
    id: props.id,
    role: "alert",
    "data-dismissible": props.dismissible ? "" : undefined,
  };

  const items = props.items?.map((item) => html`<li>${item}</li>`) ?? [];
  const fields = Object.entries(props.fields ?? {}).map(([name, message]) =>
    html`<li class="alert__field"><span class="alert__field-name">${name}</span>${message}</li>`
  );
  const list = items.length + fields.length > 0 ? html`<ul class="alert__list">${fields}${items}</ul>` : html``;

  return html`<div${classAttrs(className, attrs)}>${
    icon && html`<span class="alert__icon">${icon}</span>`
  }<div class="alert__body">${props.title && html`<div class="alert__title">${props.title}</div>`}${
    props.body && html`<div class="alert__text">${props.body}</div>`
  }${list}</div>${
    props.dismissible &&
    html`<button type="button" class="alert__close" data-dismiss aria-label="Dismiss">${
      Icon("x", { size: 16 })
    }</button>`
  }</div>`;
}

/** Builds an Alert straight from rAPId's `RapidFormError` shape (§6). */
export function FormErrorAlert(
  error: { message: string; fields: Readonly<Record<string, string>> },
): Html {
  const fields = Object.fromEntries(
    Object.entries(error.fields).filter(([key]) => key !== "(root)"),
  );

  return Alert({
    variant: "danger",
    title: error.message,
    fields,
  });
}
