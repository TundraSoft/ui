import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";

export function Progress(
  props: { value: number; max?: number; attrs?: Attrs },
): Html {
  const max = props.max ?? 100;
  return html`
    <progress class="progress" value="${String(props.value)}" max="${String(max)}" ${renderAttrs(
      props.attrs ?? {},
    )}></progress>
  `;
}

export function Spinner(props: { label?: string; attrs?: Attrs } = {}): Html {
  const attrs: Attrs = {
    ...props.attrs,
    role: "status",
    "aria-label": props.label ?? "Loading",
  };
  return html`
    <span class="spinner" ${renderAttrs(attrs)}></span>
  `;
}
