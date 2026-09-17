import { type Html, html } from "@tundralibs/rapid/ui";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type TimelineItem = {
  title: string;
  meta?: string;
  status?: "done" | "current" | "pending";
};

export type TimelineProps = {
  id?: string;
  items: TimelineItem[];
};

export function Timeline(props: TimelineProps): Html {
  return html`
    <ol class="timeline" ${props.id
      ? html`
        id="${props.id}"
      `
      : ""}>${props.items.map((item) => {
        const status = item.status ?? "pending";
        return html`
          <li
            class="${cx(
              "timeline__item",
              `timeline__item--${status}`,
            )}"><span class="timeline__rail"><span class="timeline__marker">${status === "done"
              ? Icon("check", { size: 12 })
              : ""}</span><span class="timeline__line"></span></span><span class="timeline__body"><span class="timeline__title">${item
              .title}</span>${item.meta ? html`<span class="timeline__meta">${item.meta}</span>` : ""}</span></li>
        `;
      })}</ol>
  `;
}
