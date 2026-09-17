import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { Menu, type MenuItem } from "../menu/menu.ts";

export type SidebarProps = {
  id?: string;
  brand?: string | Html;
  items: MenuItem[];
  /** Adds a desktop-only "collapse to icons" toggle at the bottom (§ mini
   * sidebar). Needs `id` set — the toggle targets it by selector. */
  collapsible?: boolean;
  attrs?: Attrs;
};

export function Sidebar(props: SidebarProps): Html {
  // The collapse toggle needs a selector to target; without an id it
  // would emit `data-collapse="#"`, which throws in querySelector.
  const collapseToggle = props.collapsible && props.id &&
    html`
      <button type="button" class="sidebar__collapse-toggle js-only" data-collapse="#${props.id}" aria-expanded="true"
        aria-label="Collapse sidebar"><span class="sidebar__collapse-icon">&#8249;</span><span class="sidebar__collapse-label">Collapse</span></button>
    `;

  return html`<aside${classAttrs("sidebar", { ...props.attrs, id: props.id })}>${
    props.brand && html`<div class="sidebar__brand">${props.brand}</div>`
  }<nav class="sidebar__nav" aria-label="Main">${
    Menu({ items: props.items, id: props.id ? `${props.id}-menu` : undefined })
  }</nav>${collapseToggle}</aside>`;
}

/**
 * Off-canvas drawer trigger — pair with a `Sidebar` whose `id` matches.
 * Shown below the lg breakpoint (where the sidebar is off-canvas), hidden
 * above it. Class-only toggle (`data-toggle-class`): the sidebar must
 * never get `hidden`, or it would stay `display:none` after resizing to
 * desktop.
 */
export function SidebarToggle(
  props: { targetId: string; label?: string | Html; attrs?: Attrs },
): Html {
  const attrs: Attrs = {
    ...props.attrs,
    "data-toggle": `#${props.targetId}`,
    "data-toggle-class": "",
    "aria-expanded": "false",
    "aria-controls": props.targetId,
    "aria-label": props.attrs?.["aria-label"] ?? "Open navigation",
  };
  return html`
    <button type="button" ${classAttrs("navbar__toggle navbar__toggle--sidebar js-only", attrs)}>${props.label ??
      html`&#9776;`}</button>
  `;
}
