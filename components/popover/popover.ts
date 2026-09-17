import { type Html, html } from "@tundralibs/rapid/ui";
import { renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type PopoverProps = {
  /** Required: the panel can be lazily loaded into, so it needs an id. */
  id: string;
  trigger: Html;
  /** Panel contents. Omit and pass `loadFrom` to fetch on first open. */
  content?: Html;
  align?: "center" | "start" | "end";
  open?: boolean;
  /** Lazy-load the panel body on mount (rAPId `data-action` + `data-load`, GET only). */
  loadFrom?: string;
  /** Accessible name for the dialog panel. */
  label?: string;
};

export function Popover(props: PopoverProps): Html {
  return html`
    <div class="${cx("popover", props.align === "start" && "popover--start", props.align === "end" && "popover--end")}"
      data-popover>${props.trigger}<div class="popover__panel" id="${props.id}" role="dialog"${renderAttrs({
        "aria-label": props.label,
        hidden: props.open ? undefined : "",
        // rAPId reads the URL from data-action; data-load is only the marker.
        "data-action": props.loadFrom,
        "data-load": props.loadFrom ? "" : undefined,
      })}><span class="popover__arrow"></span>${props.content ?? ""}</div></div>
  `;
}

export type PopoverTriggerProps = {
  controls: string;
  label: string;
  open?: boolean;
  className?: string;
};

/** Convenience trigger; any element with data-popover-trigger works. */
export function PopoverTrigger(props: PopoverTriggerProps): Html {
  return html`
    <button type="button" class="${props.className ?? "btn btn--outline btn--sm"}" aria-expanded="${props.open
      ? "true"
      : "false"}" aria-controls="${props.controls}"
      data-popover-trigger>${props.label}</button>
  `;
}
