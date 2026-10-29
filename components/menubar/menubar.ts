import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Menu, type MenuItem } from "../menu/menu.ts";

/** One top-level menu of the bar: a button and the panel it opens. */
export type MenubarItem = {
  label: string | Html;
  /** The panel's entries — rendered with `Menu({ items })`. */
  items: MenuItem[];
  disabled?: boolean;
  /** Attributes on the button. */
  attrs?: Attrs;
};

export type MenubarProps = {
  /** Required: panel ids derive from it. */
  id: string;
  /** Accessible name of the bar. @default "Application" */
  label?: string;
  items: MenubarItem[];
  attrs?: Attrs;
};

/**
 * An application menu bar (File · Edit · View …): `role="menubar"` of
 * buttons, each opening a `Menu` panel beneath it. menubar.js opens on
 * click, switches on hover while one is open, moves between menus with
 * ← →, opens with ↓ / Enter / Space, walks a panel's items with ↑ ↓,
 * closes on Escape (focus back on the button), an outside press or a pick,
 * and shifts a panel sideways to stay on screen. Below 768px the bar
 * scrolls sideways. Without the script every panel is open in flow, so
 * its links still work.
 */
export function Menubar(props: MenubarProps): Html {
  return html`<div${
    classAttrs("menubar", mergeAttrs(props.attrs, { id: props.id, "aria-label": props.label ?? "Application" }))
  }${renderAttrs({ role: "menubar", "data-menubar": "" })}>${
    props.items.map((item, i) => {
      const panelId = `${props.id}-menu-${i}`;
      return html`
        <div
          class="menubar__item"><button type="button"${classAttrs(
            "menubar__button",
            item.attrs,
            item.disabled && "menubar__button--disabled",
          )}${renderAttrs({
            role: "menuitem",
            "aria-haspopup": "menu",
            "aria-expanded": "false",
            "aria-controls": panelId,
            "aria-disabled": item.disabled ? "true" : undefined,
            tabindex: i === 0 ? "0" : "-1",
            "data-menubar-button": "",
          })}>${item
            .label}</button><div class="menubar__panel" id="${panelId}" role="menu" data-menubar-panel hidden>${Menu({
              items: item.items,
              id: `${panelId}-list`,
            })}</div></div>
      `;
    })
  }</div>`;
}
