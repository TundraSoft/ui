import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";

export type SegmentedOption = {
  value: string;
  label?: string;
  /** Icon-only: `ariaLabel` then becomes required. */
  icon?: Html;
  ariaLabel?: string;
  disabled?: boolean;
};

export type SegmentedProps = {
  id: string;
  name: string;
  options: SegmentedOption[];
  value?: string;
  size?: "sm" | "md";
  block?: boolean;
  legend?: string;
  /** Extra attributes on every radio, e.g. `data-table-filter` for filter.js
   * or `data-view-target` for view-switch.js. */
  inputAttrs?: Attrs;
  attrs?: Attrs;
};

/**
 * A real radiogroup with visually-hidden inputs — it submits inside a
 * form and works with no JS. Never rebuild this out of <button>s.
 *
 * To submit-on-change through rAPId, wrap it in a
 * `<form data-action data-target method="get">`; the runtime intercepts
 * the form's submit, not clicks on the radios (which it would cancel).
 */
export function Segmented(props: SegmentedProps): Html {
  const iconOnly = props.options.every((o) => o.icon && !o.label);

  return html`
    <div${classAttrs(
      "segmented",
      props.attrs,
      props.size === "sm" && "segmented--sm",
      iconOnly && "segmented--icon",
      props.block && "segmented--block",
    )} role="radiogroup" id="${props.id}" data-segmented ${renderAttrs({ "aria-label": props.legend })}>${props.options
      .map(
        (opt, i) => {
          const optId = `${props.id}-${i}`;
          return html`
            <span
              class="segmented__item"><input class="segmented__input" type="radio" id="${optId}" name="${props
                .name}" value="${opt.value}"${renderAttrs({
                  ...props.inputAttrs,
                  checked: opt.value === props.value ? "" : undefined,
                  disabled: opt.disabled ? "" : undefined,
                  "aria-label": opt.ariaLabel,
                })}><label class="segmented__label" for="${optId}">${opt.icon ?? ""}${opt.label ?? ""}</label></span>
          `;
        },
      )}</div>
  `;
}
