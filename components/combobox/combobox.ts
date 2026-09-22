import { type Html, html } from "@tundralibs/rapid/ui";
import { renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type ComboboxOption = {
  value: string;
  label: string;
  group?: string;
  meta?: string;
  /** Rendered and announced, but not pickable. */
  disabled?: boolean;
  /** Rendered before the label — an avatar or badge. */
  lead?: Html;
};

export type ComboboxProps = {
  /** Required: the listbox is a swap target and needs a stable id. */
  id: string;
  name: string;
  label?: string;
  placeholder?: string;
  /** Current text in the input (what the server matched against). */
  query?: string;
  options: ComboboxOption[];
  selected?: string | string[];
  open?: boolean;
  multi?: boolean;
  /**
   * URL that returns a fresh `ComboboxList(...)` fragment for `?q=<text>`.
   * combobox.js debounces `input` and calls `window.rapid.swap()` on it;
   * without it (or without rAPId's runtime) the rendered options are
   * filtered client-side instead.
   */
  action?: string;
  emptyText?: string;
  hint?: string;
};

/**
 * Wraps the matched substring in <mark>-equivalent markup. The query is
 * only ever used to *locate* the match — the label itself is what gets
 * interpolated, so it stays escaped.
 */
function withMatch(label: string, query?: string): Html {
  if (!query) return html`${label}`;
  const i = label.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return html`${label}`;
  return html`${label.slice(0, i)}<span class="combobox__match">${label.slice(i, i + query.length)}</span>${
    label.slice(i + query.length)
  }`;
}

const toSet = (selected?: string | string[]) =>
  new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);

export type ComboboxListProps = Pick<ComboboxProps, "id" | "options" | "query" | "selected" | "emptyText">;

/**
 * The listbox alone — what a route returns for a swap of `#<id>-list`
 * (§3: every swap target needs a self-contained partial).
 */
export function ComboboxList(props: ComboboxListProps): Html {
  const selected = toSet(props.selected);
  let lastGroup: string | undefined;
  const rows = props.options.flatMap((opt, i) => {
    const out: Html[] = [];
    if (opt.group && opt.group !== lastGroup) {
      lastGroup = opt.group;
      out.push(html`<div class="combobox__group" role="presentation">${opt.group}</div>`);
    }
    const isSelected = selected.has(opt.value);
    out.push(html`
      <div class="combobox__option" role="option" id="${props.id}-opt-${i}" aria-selected="${isSelected
        ? "true"
        : "false"}" ${opt.disabled
        ? html`
          aria-disabled="true"
        `
        : ""}
        data-value="${opt.value}">${opt.lead
          ? html`<span class="combobox__option-lead">${opt.lead}</span>`
          : ""}<span class="combobox__option-label">${withMatch(
            opt.label,
            props.query,
          )}</span>${opt.meta ? html`<span class="combobox__option-meta">${opt.meta}</span>` : ""}${isSelected
          ? html`<span class="combobox__check">${Icon("check", { size: 15 })}</span>`
          : ""}</div>
    `);
    return out;
  });

  return html`
    ${rows.length ? rows : html`<div class="combobox__empty">${props.emptyText ?? "No matches."}</div>`}<div
      class="combobox__hints"><span>&uarr;&darr; navigate</span><span>&crarr; select</span><span class="combobox__count">${props
          .options.length === 1
        ? "1 match"
        : `${props.options.length} matches`}</span></div>
  `;
}

export function Combobox(props: ComboboxProps): Html {
  const listId = `${props.id}-list`;
  const selected = toSet(props.selected);
  const current = props.multi ? undefined : props.options.find((o) => selected.has(o.value));

  const tokens = props.multi
    ? [...selected].map((v) => {
      const opt = props.options.find((o) => o.value === v);
      return html`
        <span
          class="combobox__token">${opt?.label ??
            v}<button type="button" class="combobox__token-remove" aria-label="Remove ${opt?.label ??
            v}" data-combobox-remove="${v}">${Icon("x", { size: 11 })}</button><input type="hidden" name="${props
            .name}" value="${v}"></span>
      `;
    })
    : [];

  // The *value* travels in a hidden input; the visible text input is
  // unnamed so the form never submits a display label by mistake.
  const valueInput = props.multi
    ? ""
    : html`<input type="hidden" name="${props.name}" value="${current?.value ?? ""}" data-combobox-value>`;

  return html`
    <div class="${cx("combobox", props.multi && "combobox--multi", props.open && "combobox--open")}"
      data-combobox${renderAttrs({ "data-combobox-name": props.multi ? props.name : undefined })}>${props.label
        ? html`<label class="form-field__label" for="${props.id}">${props.label}</label>`
        : ""}<div class="combobox__anchor"><div class="combobox__field">${tokens}${valueInput}<input class="combobox__input" id="${props
        .id}" type="text" role="combobox" autocomplete="off" value="${props.query ?? current?.label ??
        ""}" placeholder="${props.placeholder ?? ""}" aria-expanded="${props.open
        ? "true"
        : "false"}" aria-controls="${listId}" aria-autocomplete="list"${renderAttrs({
          "data-combobox-action": props.action,
          "data-combobox-target": props.action ? `#${listId}` : undefined,
        })}><span class="combobox__caret">${Icon("chevronDown", {
          size: 15,
        })}</span></div><div class="combobox__list" id="${listId}" role="listbox"${props.open ? "" : html`
        hidden
      `}>${ComboboxList(props)}</div></div>${props.hint
        ? html`<span class="form-field__help">${props.hint}</span>`
        : ""}</div>
  `;
}
