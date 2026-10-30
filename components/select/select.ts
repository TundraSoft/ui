import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";
import { ComboboxList } from "../combobox/combobox.ts";
import type { InputSize } from "../input/input.ts";

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
  /**
   * The message for a missing required value (`data-msg-required`).
   * Shown on the visible field — by form.js in a `Form({ validate })`, and
   * in a plain form too, where the browser cannot show its own bubble on a
   * hidden native control. @default the browser's text
   */
  requiredMessage?: string;
  invalid?: boolean;
  /** Control height and type size, matching `Input({ size })`. @default "md" */
  size?: InputSize;
  /**
   * A search box at the top of the open list that filters the options as
   * you type (and typing on the closed field starts a search). It is
   * unnamed and belongs to no form, so it never submits and never stops
   * Enter in a sibling field from submitting. @default true
   */
  searchable?: boolean;
  /** Placeholder of the search box. @default "Search…" */
  searchPlaceholder?: string;
  /** Accessible name of the search box. @default "Search options" */
  searchLabel?: string;
  /** Shown when nothing matches the search. @default "No matches." */
  emptyText?: string;
  extraClass?: string;
  attrs?: Attrs;
};

/**
 * A single-choice select that looks and behaves like the Combobox (same
 * field, caret, list, keyboard navigation) — minus free typing. Its
 * visible control is a `<button role="combobox">`, so it never blocks a
 * form's implicit submission (Enter in a search box beside it submits). Two
 * controls, one value: a native `<select>` carries `name` and submits
 * (and is what a no-JS page shows); the combobox UI is what an enhanced
 * page shows, and select.js keeps the two in step both ways. Give it an
 * `id` or `name` so the list and options get stable ids. The open list
 * caps at `--dropdown-max-height` and scrolls, with a search box on top
 * unless `searchable: false`.
 */
export function Select(props: SelectProps): Html {
  const base = props.id ?? (props.name ? `select-${props.name}` : "select");
  // `<base>-list` is the popup (what opens and closes), `<base>-listbox`
  // the scrolling listbox inside it, under the search box.
  const listId = `${base}-list`;
  const listboxId = `${base}-listbox`;
  const searchable = props.searchable !== false;
  // Like a native select: with no value and no placeholder, the first
  // option is the selection (and what submits).
  const current = props.options.find((o) => o.value === props.value) ??
    (props.placeholder ? undefined : props.options.find((o) => !o.disabled));
  const wrapperClass = cx(
    "select",
    props.invalid && "select--invalid",
    props.disabled && "select--disabled",
    props.size === "sm" && "select--sm",
    props.size === "lg" && "select--lg",
    props.extraClass,
  );

  const nativeAttrs: Attrs = mergeAttrs(props.attrs, {
    id: `${base}-native`,
    name: props.name,
    disabled: props.disabled ? "" : undefined,
    required: props.required ? "" : undefined,
    "aria-invalid": props.invalid ? "true" : undefined,
    "data-msg-required": props.requiredMessage,
    // Hidden behind the UI, so its errors are reported on the button.
    "data-validate-proxy": `#${base}`,
  });

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

  // `form` names no form, so the box has no form owner: it is not a field
  // that blocks implicit submission (a search box beside this Select still
  // submits on Enter), and it is unnamed, so it never posts.
  const search = searchable
    ? html`
      <div
        class="combobox__search">${Icon("search", {
          size: 14,
        })}<input type="search" class="combobox__search-input" id="${base}-search" form="${base}-search-scope" placeholder="${props
          .searchPlaceholder ?? "Search…"}" aria-label="${props.searchLabel ??
          "Search options"}" aria-controls="${listboxId}" autocomplete="off" spellcheck="false" data-combobox-search data-validate-skip></div>
    `
    : "";

  // The visible control is a button (the APG "select-only combobox"): a
  // read-only text input would count as a second text field and stop
  // Enter in a sibling search box from submitting its form.
  return html`
    <div class="${wrapperClass}"
      data-select data-validate-group>
      <select${classAttrs(
        "select__native",
        nativeAttrs,
      )}>${placeholderOption}${options}</select><div class="combobox select__ui" data-combobox data-select-ui><div class="combobox__anchor"><div class="combobox__field">${hasLeads
        ? html`<span class="select__lead" data-select-lead aria-hidden="true">${current?.lead ?? ""}</span>`
        : ""}<input type="hidden" value="${current
        ?.value ??
        ""}" data-combobox-value><button type="button" class="combobox__input select__button" id="${base}" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${listboxId}"${renderAttrs(
          {
            disabled: props.disabled ? "" : undefined,
            "aria-invalid": props.invalid ? "true" : undefined,
            "aria-required": props.required ? "true" : undefined,
            // A label given through attrs names the visible control too.
            "aria-label": props.attrs?.["aria-label"],
            "aria-labelledby": props.attrs?.["aria-labelledby"],
            "data-placeholder": props.placeholder,
          },
        )}><span class="${cx("select__text", !current && "select__text--placeholder")}" data-select-text>${current
        ?.label ?? props.placeholder ?? ""}</span></button><span class="combobox__caret">${Icon("chevronDown", {
          size: 15,
        })}</span></div><div class="combobox__list combobox__list--popup" id="${listId}" hidden>${search}<div class="combobox__options" id="${listboxId}" role="listbox"${renderAttrs(
          { "data-combobox-empty": props.emptyText },
        )}>${ComboboxList({
          id: base,
          options: props.options,
          selected: current?.value,
          emptyText: props.emptyText,
        })}</div></div></div></div></div>
  `;
}
