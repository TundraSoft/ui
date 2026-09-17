import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type DropdownProps = {
  id: string;
  trigger: string | Html;
  content: Html;
  align?: "start" | "end";
  /** Extra classes on the trigger, e.g. `btn btn--outline btn--icon` to
   * make it the caret half of a split button inside a `ButtonGroup`. */
  triggerClass?: string;
  attrs?: Attrs;
};

export function Dropdown(props: DropdownProps): Html {
  const panelId = `${props.id}-panel`;
  const panelClass = cx(
    "dropdown__panel",
    props.align === "end" && "dropdown__panel--end",
  );

  // A plain-text trigger is a real button with a caret; a custom trigger
  // (an icon, a split-button half) styles itself via `triggerClass`.
  const plain = typeof props.trigger === "string";
  const triggerClass = props.triggerClass ?? (plain ? "btn btn--outline" : undefined);
  const trigger = plain ? html`${props.trigger}${Icon("chevronDown", { size: 14 })}` : props.trigger;

  return html`<div${classAttrs("dropdown", { ...props.attrs, id: props.id })}><button type="button" class="${
    cx("dropdown__trigger", triggerClass)
  }" data-toggle="#${panelId}" aria-expanded="false" aria-controls="${panelId}">${trigger}</button><div class="${panelClass}" id="${panelId}" data-toggle-panel hidden>${props.content}</div></div>`;
}
