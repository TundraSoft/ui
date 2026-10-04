import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

/** A marker's colour, over what `status` would give it. */
export type TimelineTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export type TimelineItem = {
  title: string | Html;
  meta?: string | Html;
  /** A line or two under the title — what happened, what happens next. */
  text?: string | Html;
  status?: "done" | "current" | "pending";
  /** The marker's glyph (12–14px), over the status's own (a check when done). */
  icon?: Html;
  /** The marker's colour, over the status's. */
  tone?: TimelineTone;
  /** Attributes on this item's `<li>` (a class merges). */
  attrs?: Attrs;
};

export type TimelineProps = {
  id?: string;
  items: TimelineItem[];
  /** Attributes on the `<ol>` (a class merges). */
  attrs?: Attrs;
};

export function Timeline(props: TimelineProps): Html {
  return html`
    <ol ${classAttrs("timeline", mergeAttrs(props.attrs, { id: props.id }))}>${props.items.map((item) => {
      const status = item.status ?? "pending";
      const glyph = item.icon ?? (status === "done" ? Icon("check", { size: 12 }) : "");
      return html`
        <li
          ${classAttrs(
            cx("timeline__item", `timeline__item--${status}`, item.tone && `timeline__item--${item.tone}`),
            item.attrs,
          )}><span class="timeline__rail"><span class="timeline__marker">${glyph}</span><span class="timeline__line"></span></span><span class="timeline__body"><span class="timeline__title">${item
            .title}</span>${item.meta ? html`<span class="timeline__meta">${item.meta}</span>` : ""}${item.text
            ? html`<span class="timeline__text">${item.text}</span>`
            : ""}</span></li>
      `;
    })}</ol>
  `;
}
