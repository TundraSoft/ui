import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";

export type ContextMenuProps = {
  /** Required: triggers point at it with `data-context-menu="#<id>"`. */
  id: string;
  /** The items — a `Menu({ items })`, or any list of `.menu__link` links and buttons. */
  content: Html;
  /** Accessible name of the menu. */
  label?: string;
  attrs?: Attrs;
};

/**
 * A menu that opens at the pointer on right-click (or a long press on
 * touch, Shift+F10 / the Menu key from the keyboard) on any element
 * carrying `data-context-menu="#<id>"` (context-menu.js). It is placed at
 * the pointer, flips to stay on screen, walks its items with the arrow
 * keys, and closes on a pick, Escape, an outside click, a scroll or a
 * resize — focus returns to the element it opened on. Rendered hidden;
 * without the script the browser's own context menu stays.
 */
export function ContextMenu(props: ContextMenuProps): Html {
  return html`<div${classAttrs("context-menu", mergeAttrs(props.attrs, { id: props.id, "aria-label": props.label }))}${
    renderAttrs({ role: "menu", "data-context-menu-panel": "", hidden: "", tabindex: "-1" })
  }>${props.content}</div>`;
}
