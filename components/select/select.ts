import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";
import { ComboboxList } from "../combobox/combobox.ts";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /**
   * Rendered before the label in the list, and beside the value in the
   * closed field — a flag, an avatar, a colour swatch, a brand mark. The
   * library ships no flag artwork; pass your own (see `CountryCode.flag`).
   */
  lead?: Html;
};

export type SelectProps = {
  /** Goes on the visible control (so a label's `for` reaches it). */
  id?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  extraClass?: string;
  attrs?: Attrs;
};

/**
 * A single-choice select that looks and behaves like the Combobox (same
 * field, caret, list, keyboard navigation) — minus free typing. Two
 * controls, one value: a native `<select>` carries `name` and submits
 * (and is what a no-JS page shows); the combobox UI is what an enhanced
 * page shows, and select.js keeps the two in step both ways. Give it an
 * `id` or `name` so the list and options get stable ids.
 */
export function Select(props: SelectProps): Html {
  const base = props.id ?? (props.name ? `select-${props.name}` : "select");
  const listId = `${base}-list`;
  // Like a native select: with no value and no placeholder, the first
  // option is the selection (and what submits).
  const current = props.options.find((o) => o.value === props.value) ??
    (props.placeholder ? undefined : props.options.find((o) => !o.disabled));
  const wrapperClass = cx(
    "select",
    props.invalid && "select--invalid",
    props.disabled && "select--disabled",
    props.extraClass,
  );

  const nativeAttrs: Attrs = {
    ...props.attrs,
    id: `${base}-native`,
    name: props.name,
    disabled: props.disabled ? "" : undefined,
    required: props.required ? "" : undefined,
    "aria-invalid": props.invalid ? "true" : undefined,
  };

  const placeholderOption = props.placeholder
    ? html`<option value="" disabled${
      !props.value
        ? html`
          selected
        `
        : ""
    }>${props.placeholder}</option>`
    : "";
  const options = props.options.map((option) =>
    html`
      <option value="${option.value}" ${option.value === props.value
        ? html`
          selected
        `
        : ""}${option.disabled
        ? html`
          disabled
        `
        : ""}>${option.label}</option>
    `
  );

  const hasLeads = props.options.some((o) => o.lead);

  return html`
    <div class="${wrapperClass}"
      data-select><select class="select__native"${renderAttrs(
        nativeAttrs,
      )}>${placeholderOption}${options}</select><div class="combobox select__ui" data-combobox data-select-ui><div class="combobox__anchor"><div class="combobox__field">${hasLeads
        ? html`<span class="select__lead" data-select-lead aria-hidden="true">${current?.lead ?? ""}</span>`
        : ""}<input type="hidden" value="${current
        ?.value ??
        ""}" data-combobox-value><input class="combobox__input" id="${base}" type="text" role="combobox" readonly autocomplete="off" value="${current
        ?.label ?? ""}" placeholder="${props.placeholder ??
        ""}" aria-expanded="false" aria-controls="${listId}" aria-autocomplete="none"${renderAttrs({
          disabled: props.disabled ? "" : undefined,
          "aria-invalid": props.invalid ? "true" : undefined,
        })}><span class="combobox__caret">${Icon("chevronDown", {
          size: 15,
        })}</span></div><div class="combobox__list" id="${listId}" role="listbox" hidden>${ComboboxList({
          id: base,
          options: props.options,
          selected: current?.value,
        })}</div></div></div></div>
  `;
}
