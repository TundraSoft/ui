import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";

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
    classAttrs("tabs", mergeAttrs(props.attrs, { id: props.id }))
  }><div class="tabs__list" role="tablist">${tabs}</div>${panels}</div>`;
}

export type TabLink = {
  label: string | Html;
  href: string;
  /** The page being shown. */
  current?: boolean;
  /** Before the label. */
  icon?: Html;
  /** A number after the label. */
  /** A number after the label: plain, or markup (a compact figure). */
  count?: number | string | Html;
  /** The exact figure as a tooltip when `count` is rounded. */
  countTitle?: string;
  /** After the label: a plan or status `Badge`. */
  badge?: Html;
  /** Extra attributes on the link (`data-action` + `data-target` + `data-push` for a swap). */
  attrs?: Attrs;
};

/**
 * Tabs that are pages: the same strip, but each tab is a link to its own
 * URL and the content is whatever that page renders below — no panels,
 * no script. The current one carries `aria-current="page"`. Use `Tabs`
 * when the panels are all on this page.
 */
export type TabLinksProps = {
  items: TabLink[];
  /** The nav's accessible name. @default "Sections" */
  label?: string;
  id?: string;
  /** Attributes on the strip (`.tabs__list`) itself — a class merges (a scroll fade, a sticky strip). */
  listAttrs?: Attrs;
  attrs?: Attrs;
};

export function TabLinks(props: TabLinksProps): Html {
  const links = props.items.map((item) =>
    html`<a${
      classAttrs(
        "tabs__tab",
        mergeAttrs(item.attrs, { href: item.href, "aria-current": item.current ? "page" : undefined }),
      )
    }>${item.icon ? html`<span class="tabs__icon">${item.icon}</span>` : ""}${item.label}${
      item.count === undefined ? "" : html`
        <span class="tabs__count" ${renderAttrs({ title: item.countTitle })}>${typeof item.count === "number"
          ? String(item.count)
          : item.count}</span>
      `
    }${item.badge ?? ""}</a>`
  );
  return html`
    <nav${classAttrs("tabs tabs--links", mergeAttrs(props.attrs, { id: props.id }))}${renderAttrs({
      "aria-label": props.label ?? "Sections",
    })}>
      <div${classAttrs("tabs__list", props.listAttrs)}>${links}</div>
      </nav>
  `;
}
