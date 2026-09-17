import { type Html, html } from "@tundralibs/rapid/ui";
import { cx } from "../../shared/classnames.ts";
import { Icon, type IconName } from "../../shared/icons.ts";

export type EmptyProps = {
  title: string;
  text?: string;
  icon?: IconName;
  actions?: Html;
  /** inline = inside a list/table region; page = a whole route. */
  variant?: "card" | "inline" | "page";
  tone?: "default" | "error";
  /** Request id / status, shown monospaced. Error tone only. */
  code?: string;
};

/**
 * Every empty state names what is missing and offers the action that
 * fixes it. An icon alone is not an empty state.
 */
export function Empty(props: EmptyProps): Html {
  const inline = props.variant === "inline";
  const body = html`<span class="empty__title">${props.title}</span>${
    props.text ? html`<span class="empty__text">${props.text}</span>` : ""
  }${props.code ? html`<span class="empty__code">${props.code}</span>` : ""}`;

  return html`<div class="${
    cx(
      "empty",
      inline && "empty--inline",
      props.variant === "page" && "empty--page",
      props.tone === "error" && "empty--error",
    )
  }">${props.icon ? html`<span class="empty__icon">${Icon(props.icon, { size: inline ? 16 : 21 })}</span>` : ""}${
    inline ? html`<span class="empty__body">${body}</span>` : body
  }${props.actions ? html`<span class="empty__actions">${props.actions}</span>` : ""}</div>`;
}
