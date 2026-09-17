import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type GridColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type GridProps = {
  items: Html[];
  attrs?: Attrs;
};

export function Grid(props: GridProps): Html {
  return html`<div${classAttrs("grid", props.attrs)}>${props.items}</div>`;
}

/** Wraps `content` with a `col-N` span for direct placement inside a Grid. */
export function GridCol(
  props: { span?: GridColSpan; content: Html; attrs?: Attrs },
): Html {
  return html`<div${classAttrs(props.span ? `col-${props.span}` : undefined, props.attrs)}>${props.content}</div>`;
}
