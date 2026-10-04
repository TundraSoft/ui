import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

export type ModalProps = {
  id: string;
  title?: string | Html;
  body: string | Html;
  footer?: string | Html;
  /** Accessible name when there is no visible title. */
  label?: string;
  /**
   * Open as soon as it is on the page — on load, and when a swap puts it
   * there (modal.js). Re-render a form's modal with `open` after a failed
   * submit so its errors are in front of the person, not behind a click.
   */
  open?: boolean;
  attrs?: Attrs;
};

/**
 * A native `<dialog>` — open it with any trigger carrying
 * `attrs: { "data-modal-open": "#<id>" }` (see modal.js), never by
 * toggling a CSS class; `.showModal()` is what gets the browser's
 * built-in focus-trapping and `::backdrop` for free.
 */
export function Modal(props: ModalProps): Html {
  const titleId = `${props.id}-title`;
  return html`<dialog${classAttrs("modal", mergeAttrs(props.attrs, { id: props.id }))}${
    renderAttrs({
      "aria-labelledby": props.title ? titleId : undefined,
      "aria-label": props.title ? undefined : props.label,
      "data-modal-autoopen": props.open ? "" : undefined,
    })
  }>${
    props.title &&
    html`
      <div
        class="modal__header"><h2 class="modal__title" id="${titleId}">${props
          .title}</h2><button type="button" class="modal__close" data-modal-close aria-label="Close">${Icon("x", {
            size: 16,
          })}</button></div>
    `
  }<div class="modal__body">${props.body}</div>${
    props.footer && html`<div class="modal__footer">${props.footer}</div>`
  }</dialog>`;
}

export type ConfirmModalProps = {
  /** @default "confirm-dialog" */
  id?: string;
  /** @default "Are you sure?" */
  title?: string;
  /** The OK button; a trigger's `data-confirm-label` overrides it. @default "Confirm" */
  confirmLabel?: string;
  /** @default "Cancel" */
  cancelLabel?: string;
};

/**
 * The page's one confirmation dialog. Any link, button or submit button
 * carrying `data-confirm="<question>"` (`RowAction.confirm`, or `attrs`)
 * asks here first; Confirm carries on with exactly what was clicked —
 * same submitter, same swap — Cancel or Escape drops it. The OK button
 * turns danger when the trigger is a `btn--danger` (or carries
 * `data-confirm-tone="danger"`). Render it once per page (the core
 * template does, unless `confirmDialog: false`); without it modal.js
 * falls back to the browser's `confirm()`.
 */
export function ConfirmModal(props: ConfirmModalProps = {}): Html {
  return Modal({
    id: props.id ?? "confirm-dialog",
    title: props.title ?? "Are you sure?",
    attrs: { class: "modal--confirm", "data-confirm-dialog": "", "data-confirm-default": props.confirmLabel },
    body: html`<p class="modal__text" data-confirm-text></p>`,
    footer: html`
      <button type="button" class="btn btn--ghost" data-modal-close>${props.cancelLabel ??
        "Cancel"}</button><button type="button" class="btn"
        data-confirm-ok>${props.confirmLabel ?? "Confirm"}</button>
    `,
  });
}
