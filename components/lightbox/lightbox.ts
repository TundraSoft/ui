import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

export type LightboxItem = {
  /** The full-size image. */
  src: string;
  alt: string;
  caption?: string | Html;
};

export type LightboxProps = {
  id: string;
  items: LightboxItem[];
  /** Accessible name of the dialog. @default "Image viewer" */
  label?: string;
  attrs?: Attrs;
};

/**
 * A full-screen image viewer: a native `<dialog>` holding one image at
 * a time, with a caption, a counter and prev/next/close. Open it from any
 * element carrying `data-lightbox="#<id>"` and `data-lightbox-index`
 * (`LightboxLink` renders one — a plain link to the full image, so a page
 * without the script still opens the picture). Arrow keys, a swipe and
 * the buttons move between items; Escape and a click on the backdrop
 * close it, and focus returns to the trigger.
 */
export function Lightbox(props: LightboxProps): Html {
  const first = props.items[0];
  const attrs = mergeAttrs(props.attrs, {
    id: props.id,
    "data-lightbox-dialog": "",
    "data-lightbox-items": JSON.stringify(
      props.items.map((i) => ({ src: i.src, alt: i.alt, caption: i.caption ? String(i.caption) : undefined })),
    ),
    "aria-label": props.label ?? "Image viewer",
  });
  return html`
    <dialog${classAttrs("lightbox", attrs)}>
      <div class="lightbox__chrome"><span class="lightbox__counter" data-lightbox-counter>1 / ${String(
          props.items.length,
        )}</span><button type="button" class="btn btn--ghost btn--icon lightbox__close" data-lightbox-close
          aria-label="Close">${Icon("x", { size: 18 })}</button></div>
      <figure class="lightbox__figure" data-lightbox-figure><img class="lightbox__image" data-lightbox-image${renderAttrs(
          { src: first?.src, alt: first?.alt ?? "" },
        )}><figcaption class="lightbox__caption" data-lightbox-caption>${first?.caption ?? ""}</figcaption></figure>
      <button type="button" class="btn btn--outline btn--icon lightbox__nav lightbox__nav--prev" data-lightbox-prev
        aria-label="Previous image">${Icon("chevronLeft", { size: 18 })}</button><button type="button"
        class="btn btn--outline btn--icon lightbox__nav lightbox__nav--next" data-lightbox-next
        aria-label="Next image">${Icon("chevronRight", { size: 18 })}</button>
    </dialog>
  `;
}

export type LightboxLinkProps = {
  /** The `Lightbox` id. */
  controls: string;
  /** Which item opens (0-based). */
  index: number;
  /** The full-size image — what a page without the script navigates to. */
  href: string;
  /** The thumbnail (an `<img>`), or anything clickable. */
  content: Html;
  attrs?: Attrs;
};

/** A thumbnail that opens its `Lightbox` — and is a plain link to the image without JS. */
export function LightboxLink(props: LightboxLinkProps): Html {
  const attrs = mergeAttrs(props.attrs, {
    href: props.href,
    "data-lightbox": `#${props.controls}`,
    "data-lightbox-index": String(props.index),
  });
  return html`<a${classAttrs("lightbox-link", attrs)}>${props.content}</a>`;
}
