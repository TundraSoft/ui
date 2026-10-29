import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";
import { Menu, type MenuItem } from "../menu/menu.ts";

/** A labelled, non-collapsing group of links (`Sidebar({ sections })`). */
export type SidebarSection = {
  /** The group's heading; on the collapsed rail it gives way to a rule. */
  label?: string | Html;
  items: MenuItem[];
};

/** Where the desktop collapse toggle sits. */
export type SidebarTogglePosition = "foot" | "edge";

export type SidebarProps = {
  id?: string;
  brand?: string | Html;
  /**
   * Below the brand: an action button, an organisation switcher. Wrap a
   * control's text in `<span class="sidebar__label">` and it folds to its
   * icon on the collapsed rail (the text becomes its `title`), as menu
   * labels do. A dropdown in it floats free of the sidebar's scroll box.
   */
  head?: Html;
  /** The main links. */
  items?: MenuItem[];
  /** Labelled groups after `items`, in the same nav. */
  sections?: SidebarSection[];
  /**
   * Above the collapse toggle, pinned to the bottom: a usage card, a help
   * link. Hidden on the collapsed rail — a theme's unlayered
   * `.sidebar--collapsed .sidebar__foot` rule restyles it there instead.
   */
  foot?: Html;
  /** The nav's accessible name (default "Main") — distinct per nav when a page has several. */
  navLabel?: string;
  /**
   * Adds a desktop-only "collapse to icons" toggle (§ mini sidebar). Needs
   * `id` set — the toggle targets it by selector. `true` puts it at the
   * foot; `{ position: "edge" }` makes it a small round button straddling
   * the sidebar's end border at the top (Linear/Notion style), and the nav
   * scrolls between a fixed head and foot.
   */
  collapsible?: boolean | { position?: SidebarTogglePosition };
  attrs?: Attrs;
};

export function Sidebar(props: SidebarProps): Html {
  const position: SidebarTogglePosition =
    (typeof props.collapsible === "object" ? props.collapsible.position : undefined) ?? "foot";
  // The collapse toggle needs a selector to target; without an id it
  // would emit `data-collapse="#"`, which throws in querySelector.
  const collapseToggle = props.collapsible && props.id &&
    html`
      <button type="button" class="${cx(
        "sidebar__collapse-toggle js-only",
        position === "edge" && "sidebar__collapse-toggle--edge",
      )}" data-collapse="#${props.id}" aria-expanded="true" aria-controls="${props.id}"
        aria-label="Collapse sidebar"
      ><span class="sidebar__collapse-icon" aria-hidden="true">${Icon("chevronLeft", {
        size: 16,
      })}</span><span class="sidebar__collapse-label"
        >Collapse</span></button>
    `;
  const edge = position === "edge" && !!collapseToggle;
  const sections = (props.sections ?? []).map((section, index) => {
    const labelId = props.id ? `${props.id}-section-${index}` : undefined;
    const name: Attrs = section.label === undefined
      ? {}
      : labelId
      ? { "aria-labelledby": labelId }
      : { "aria-label": typeof section.label === "string" ? section.label : undefined };
    return html`<div ${classAttrs("sidebar__section", { role: "group", ...name })}>${
      section.label !== undefined &&
      html`<p ${classAttrs("sidebar__section-label", { id: labelId })}>${section.label}</p>`
    }${Menu({ items: section.items, id: props.id ? `${props.id}-menu-${index + 1}` : undefined })}</div>`;
  });

  return html`<aside${
    classAttrs("sidebar", mergeAttrs(props.attrs, { id: props.id }), edge && "sidebar--toggle-edge")
  }>${props.brand && html`<div class="sidebar__brand">${props.brand}</div>`}${edge && collapseToggle}${
    props.head && html`<div class="sidebar__head" data-dropdown-clip>${props.head}</div>`
  }<nav class="sidebar__nav" aria-label="${props.navLabel ?? "Main"}">${
    props.items && Menu({ items: props.items, id: props.id ? `${props.id}-menu` : undefined })
  }${sections}</nav>${props.foot && html`<div class="sidebar__foot" data-dropdown-clip>${props.foot}</div>`}${
    !edge && collapseToggle
  }</aside>`;
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
  const attrs: Attrs = mergeAttrs(props.attrs, {
    "data-toggle": `#${props.targetId}`,
    "data-toggle-class": "",
    "aria-expanded": "false",
    "aria-controls": props.targetId,
    "aria-label": props.attrs?.["aria-label"] ?? "Open navigation",
  });
  return html`
    <button type="button" ${classAttrs("navbar__toggle navbar__toggle--sidebar js-only", attrs)}>${props.label ??
      html`&#9776;`}</button>
  `;
}
