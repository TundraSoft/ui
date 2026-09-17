import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type TabItem = {
  /** Page-unique: becomes `tab-<id>` / `panel-<id>`, and the `#tab-<id>`
   * deep link tabs.js honours. Two Tabs on one page must not share ids. */
  id: string;
  label: string | Html;
  content: Html;
};

export type TabsProps = {
  id?: string;
  items: TabItem[];
  active?: string;
  attrs?: Attrs;
};

export function Tabs(props: TabsProps): Html {
  const activeId = props.active ?? props.items[0]?.id;

  // Roving tabindex: only the selected tab is in the Tab order; arrow
  // keys (tabs.js) move between the rest.
  const tabs = props.items.map((item) =>
    html`
      <button type="button" class="tabs__tab" role="tab" id="tab-${item.id}" aria-selected="${item.id === activeId
        ? "true"
        : "false"}"
        tabindex="${item.id === activeId ? "0" : "-1"}" aria-controls="panel-${item.id}">${item.label}</button>
    `
  );

  const panels = props.items.map((item) =>
    html`
      <div class="tabs__panel" role="tabpanel" id="panel-${item.id}" aria-labelledby="tab-${item.id}" tabindex="0"
        ${item.id === activeId ? "" : html`
          hidden
        `}>${item.content}</div>
    `
  );

  return html`<div${
    classAttrs("tabs", { ...props.attrs, id: props.id })
  }><div class="tabs__list" role="tablist">${tabs}</div>${panels}</div>`;
}
