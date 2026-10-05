import { type Html, html } from "@tundralibs/rapid/ui";
import { inline } from "../../shared/inline.ts";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";

export function Progress(
  props: { value: number; max?: number; attrs?: Attrs },
): Html {
  const max = props.max ?? 100;
  return inline(html`
    <progress value="${String(props.value)}" max="${String(max)}" ${classAttrs("progress", props.attrs)}></progress>
  `);
}

export function Spinner(props: { label?: string; attrs?: Attrs } = {}): Html {
  const attrs: Attrs = mergeAttrs(props.attrs, {
    role: "status",
    "aria-label": props.label ?? "Loading",
  });
  return inline(html`
    <span ${classAttrs("spinner", attrs)}></span>
  `);
}
