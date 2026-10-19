/**
 * The frame header every layout with a header shares: one row (the drawer
 * toggle a layout adds, then the caller's `header`) and an optional
 * full-width second row, `subheader` — an announcement or ticker strip, a
 * secondary nav. Internal to the layouts; each layout documents the slot.
 */
import { type Html, html } from "@tundralibs/rapid/ui";

/**
 * `<header class="layout__header">`, or nothing when there is neither a
 * row nor a subheader. With a subheader the header wraps
 * (`.layout__header--sub`) and the strip takes a line of its own; it never
 * widens the page — content wider than the viewport scrolls inside it,
 * and a `Dropdown` in it floats out (`data-dropdown-clip`).
 */
export function frameHeader(row: Html | string | false | undefined, subheader?: Html): Html | "" {
  if (!row && !subheader) return "";
  return html`<header class="${subheader ? "layout__header layout__header--sub" : "layout__header"}">${row || ""}${
    subheader && html`<div class="layout__subheader" data-dropdown-clip>${subheader}</div>`
  }</header>`;
}
