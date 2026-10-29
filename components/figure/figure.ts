import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

/** `wide` bleeds to the container's edges; `center` is a centred block. */
export type FigureAlign = "start" | "center" | "end" | "wide";
/** The figure's maximum inline size. */
export type FigureSize = "sm" | "md" | "lg";

export type FigureProps = {
  /** An image, a video, a chart. */
  media: Html;
  caption?: string | Html;
  align?: FigureAlign;
  size?: FigureSize;
  attrs?: Attrs;
};

/** Media with a caption, for pages that are not prose. */
export function Figure(props: FigureProps): Html {
  return html`<figure${
    classAttrs(
      "figure",
      props.attrs,
      props.align && props.align !== "start" && `figure--${props.align}`,
      props.size && `figure--${props.size}`,
    )
  }><div class="figure__media">${props.media}</div>${
    props.caption && html`<figcaption class="figure__caption">${props.caption}</figcaption>`
  }</figure>`;
}
