import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type GridColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Columns below 768px, where every `col-N` otherwise collapses to one. */
export type GridPhoneColumns = "1" | "2";

export type GridProps = {
  items: Html[];
  /**
   * Below 768px the grid is one column (every item full width) unless
   * this says `"2"`: then items sit two-up — stat tiles, small cards —
   * instead of stacking one tall tile per row. @default "1"
   */
  phoneColumns?: GridPhoneColumns;
  attrs?: Attrs;
};

export function Grid(props: GridProps): Html {
  return html`
    <div ${classAttrs("grid", props.attrs, props.phoneColumns === "2" && "grid--phone-2")}>${props.items}</div>
  `;
}

/** Wraps `content` with a `col-N` span for direct placement inside a Grid. */
export function GridCol(
  props: { span?: GridColSpan; content: Html; attrs?: Attrs },
): Html {
  return html`
    <div ${classAttrs(props.span ? `col-${props.span}` : undefined, props.attrs)}>${props.content}</div>
  `;
}
