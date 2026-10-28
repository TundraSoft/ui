import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

/** Which edge the panel comes from on a wide screen; below 768px every sheet is a bottom sheet. */
export type SheetSide = "end" | "start" | "bottom";

/** Panel width (height for a bottom sheet): sm 20rem, md 28rem, lg 40rem. */
export type SheetSize = "sm" | "md" | "lg";

export type SheetProps = {
  /** Required: a trigger opens it by id (`data-sheet-open="#<id>"`). */
  id: string;
  /** Heading in the sticky header; omit for a bare panel and give `label`. */
  title?: string | Html;
  /** The scrolling content. */
  body: string | Html;
  /** Sticky row at the foot — the actions of a form in the sheet. */
  footer?: string | Html;
  /** Edge it slides in from. @default "end" */
  side?: SheetSide;
  /** @default "md" */
  size?: SheetSize;
  /** Accessible name when there is no visible title. */
  label?: string;
  /**
   * Open as soon as it is on the page — on load, and when a swap puts it
   * there (sheet.js). Re-render a form's sheet with `open` after a failed
   * submit so its errors are in front of the person.
   */
  open?: boolean;
  /** Draw no close button in the header (a flow that must finish). */
  closable?: boolean;
  attrs?: Attrs;
};

/**
 * A side panel for a secondary task — a detail view, an edit form, a
 * filter rail — that keeps the page behind it in sight. A native
 * `<dialog>` opened with `.showModal()` (focus trap and `::backdrop` for
 * free) by any element carrying `data-sheet-open="#<id>"`; closed by
 * `[data-sheet-close]`, a click on the backdrop, or Escape. Slides in from
 * `side` on a wide screen; below 768px it is always a bottom sheet with a
 * drag handle, capped at 85vh, scrolling inside. The header and footer
 * stay put while the body scrolls.
 */
export function Sheet(props: SheetProps): Html {
  const titleId = `${props.id}-title`;
  const side = props.side ?? "end";
  const size = props.size ?? "md";
  const closable = props.closable !== false;
  const rootAttrs = classAttrs(
    "sheet",
    mergeAttrs(props.attrs, {
      id: props.id,
      "aria-labelledby": props.title ? titleId : undefined,
      "aria-label": props.title ? undefined : props.label,
      "data-sheet": "",
      "data-sheet-autoopen": props.open ? "" : undefined,
    }),
    `sheet--${side}`,
    `sheet--${size}`,
  );
  const title = props.title
    ? html`<h2 class="sheet__title" id="${titleId}">${props.title}</h2>`
    : html`<span></span>`;
  const close = closable
    ? html`<button type="button" class="sheet__close" data-sheet-close aria-label="Close">${
      Icon("x", { size: 16 })
    }</button>`
    : "";
  const header = props.title || closable ? html`<div class="sheet__header">${title}${close}</div>` : "";
  const footer = props.footer ? html`<div class="sheet__footer">${props.footer}</div>` : "";
  const handle = html`<span class="sheet__handle" aria-hidden="true"></span>`;
  const body = html`<div class="sheet__body">${props.body}</div>`;
  return html`<dialog${rootAttrs}><div class="sheet__panel">${handle}${header}${body}${footer}</div></dialog>`;
}
