import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type ToolbarProps = {
  /** Controls at the start (search, filters). */
  start?: Html;
  /** Controls pushed to the end (a primary action, a date range). */
  end?: Html;
  attrs?: Attrs;
};

/** A wrapping row of controls above a list or table. */
export function Toolbar(props: ToolbarProps): Html {
  return html`<div${classAttrs("toolbar", props.attrs)}>${props.start ?? ""}${
    props.end && html`<div class="toolbar__end">${props.end}</div>`
  }</div>`;
}
