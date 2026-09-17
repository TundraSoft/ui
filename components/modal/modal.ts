import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

export type ModalProps = {
  id: string;
  title?: string | Html;
  body: string | Html;
  footer?: string | Html;
  /** Accessible name when there is no visible title. */
  label?: string;
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
  return html`<dialog${classAttrs("modal", { ...props.attrs, id: props.id })}${
    renderAttrs({
      "aria-labelledby": props.title ? titleId : undefined,
      "aria-label": props.title ? undefined : props.label,
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
