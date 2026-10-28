import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type RatioValue = "16x9" | "4x3" | "1x1" | "21x9" | "3x4" | "9x16";

export type RatioProps = {
  /** @default "16x9" */
  ratio?: RatioValue;
  /** What fills the box: an iframe, a video, an image. */
  content: Html;
  attrs?: Attrs;
};

/**
 * A box that keeps its aspect ratio and lets its one child fill it — the
 * frame for an embedded video, a map, a cover image. Rounded, sunken
 * while the content loads.
 */
export function Ratio(props: RatioProps): Html {
  return html`<div${classAttrs("ratio", props.attrs, `ratio--${props.ratio ?? "16x9"}`)}>${props.content}</div>`;
}
