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

/** When the list opens: on focus (the whole list at once) or only once something is typed. */
export type ComboboxOpenOn = "focus" | "type";

export type ComboboxProps = {
  /** Required: the listbox is a swap target and needs a stable id. */
  id: string;
  name: string;
  label?: string;
  /**
   * The input's accessible name when there is no visible `label` — a
   * toolbar filter ("Organisation"). Names the listbox too. Ignored when
   * `label` or `labelledBy` is given.
   */
  ariaLabel?: string;
  /**
   * Id(s) of the element(s) that name the input — a heading or a toolbar
   * caption already on the page. Wins over `label` and `ariaLabel`.
   */
  labelledBy?: string;
  placeholder?: string;
  /** Current text in the input (what the server matched against). */
  query?: string;
  options: ComboboxOption[];
  selected?: string | string[];
  /**
   * Options for picked values that `options` does not hold — with a
   * server-searched list the first page rarely contains them, and a token
   * (or a single combobox's text) would otherwise show the raw value.
   * Used for labels only; never rendered in the list.
   */
  selectedOptions?: ComboboxOption[];
  open?: boolean;
  multi?: boolean;
  /**
   * A pick is required: one option (single) or at least one token
   * (`multi`). combobox.js keeps a custom validity on the input while
   * nothing is picked — typed text that matches nothing does not count —
   * so the browser (a plain form) or form.js (`Form({ validate })`)
   * reports it like any rule. The server must check it too.
   */
  required?: boolean;
  /**
   * The message while nothing is picked.
   * @default "Please select an item in the list." / "Please select at least one item."
   */
  requiredMessage?: string;
  /**
   * URL that returns a fresh `ComboboxList(...)` fragment for `?q=<text>`.
   * combobox.js debounces `input` and calls `window.rapid.swap()` on it;
   * without it (or without rAPId's runtime) the rendered options are
   * filtered client-side instead.
   */
  action?: string;
  /**
   * With `action`: fetch the list once when the field first gets focus,
   * before anything is typed (`?q=` empty) — "the organisation's tags"
   * rather than an empty box. Without it the first fetch waits for typing.
   */
  loadOnFocus?: boolean;
  /**
   * When the list opens. `"type"` keeps it shut on focus and click, and
   * opens it (fetching first, with `action`) only once `minChars`
   * characters are typed — nothing loads for someone who only tabs past.
   * @default "focus"
   */
  openOn?: ComboboxOpenOn;
  /** With `openOn: "type"`: characters needed before the list opens. @default 1 */
  minChars?: number;
  /**
   * The chevron at the end of the field (a click on it toggles the list).
   * @default true, false with `openOn: "type"` (there is no list to show
   * until something is typed)
   */
  caret?: boolean;
  /**
   * `multi` only: options already picked (shown as tokens) are left out of
   * the list each time it opens or is searched. While it stays open a pick
   * keeps its row, ticked, so the rows under the pointer do not move.
   * @default true
   */
  hideSelected?: boolean;
  /** Shown when a search matches only options that are already picked. @default "Already selected." */
  selectedText?: string;
  /**
   * How many options match in all, when `options` is one page of them
   * (a server-searched list capped at, say, 50). Above `options.length`
   * the list ends with a note — `moreText` — and the hints count shows it.
   */
  total?: number;
  /**
   * The note under a capped list; `{shown}` and `{total}` are filled in.
   * @default "Showing {shown} of {total}. Keep typing to narrow."
   */
  moreText?: string;
  emptyText?: string;
  hint?: string;
  /**
   * The keyboard-hint bar under the list ("↑↓ navigate · ↵ select · 12
   * matches"). Turn it off where the list reads as a dropdown, not a
   * search. @default true
   */
  hints?: boolean;
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

export type ComboboxListProps = Pick<
  ComboboxProps,
  "id" | "options" | "query" | "selected" | "emptyText" | "total" | "moreText"
>;

const count = (n: number) => n.toLocaleString("en");

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
          )}</span>${opt.meta
          ? html`<span class="combobox__option-meta">${opt.meta}</span>`
          : ""}<span class="combobox__check" aria-hidden="true">${Icon("check", { size: 15 })}</span></div>
    `);
    return out;
  });

  const shown = props.options.length;
  const total = props.total !== undefined && props.total > shown ? props.total : undefined;
  const more = total === undefined ? "" : html`<div class="combobox__more" role="presentation">${
    (props.moreText ??
      "Showing {shown} of {total}. Keep typing to narrow.").replace("{shown}", count(shown)).replace(
        "{total}",
        count(total),
      )
  }</div>`;
  const matches = total ?? shown;

  return html`
    ${rows.length
      ? rows
      : html`<div class="combobox__empty" role="option" aria-disabled="true">${
        props.emptyText ?? "No matches."
      }</div>`}${more}<div
      class="combobox__hints"><span>&uarr;&darr; navigate</span><span>&crarr; select</span><span class="combobox__count"${renderAttrs(
        { "data-combobox-total": total === undefined ? undefined : String(total) },
      )}>${matches === 1 ? "1 match" : `${count(matches)} matches`}</span></div>
  `;
}

export function Combobox(props: ComboboxProps): Html {
  const listId = `${props.id}-list`;
  const selected = toSet(props.selected);
  const known = [...props.options, ...(props.selectedOptions ?? [])];
  const current = props.multi ? undefined : known.find((o) => selected.has(o.value));
  const typeOnly = props.openOn === "type";
  // One name for the input and its listbox: an explicit labelledBy, else
  // the visible label, else ariaLabel.
  const labelId = props.label ? `${props.id}-label` : undefined;
  const labelledBy = props.labelledBy ?? labelId;
  const ariaLabel = labelledBy ? undefined : props.ariaLabel;

  const tokens = props.multi
    ? [...selected].map((v) => {
      const opt = known.find((o) => o.value === v);
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
    <div class="${cx(
      "combobox",
      props.multi && "combobox--multi",
      props.open && "combobox--open",
      props.hints === false && "combobox--no-hints",
    )}"
      data-combobox${renderAttrs({
        "data-combobox-name": props.multi ? props.name : undefined,
        "data-combobox-hide-selected": props.multi && props.hideSelected !== false ? "" : undefined,
      })}>${props.label
        ? html`<label class="form-field__label" id="${labelId}" for="${props.id}">${props.label}</label>`
        : ""}<div class="combobox__anchor"><div class="combobox__field">${tokens}${valueInput}<input class="combobox__input" id="${props
        .id}" type="text" role="combobox" autocomplete="off" value="${props.query ?? current?.label ??
        ""}" placeholder="${props.placeholder ?? ""}" aria-expanded="${props.open
        ? "true"
        : "false"}" aria-controls="${listId}" aria-autocomplete="list"${renderAttrs({
          "aria-label": ariaLabel,
          // A visible <label for> already names the input; only a caller's
          // own labelledBy goes on it.
          "aria-labelledby": props.labelledBy,
          "data-combobox-action": props.action,
          "data-combobox-load-on-focus": props.action && props.loadOnFocus && !typeOnly ? "" : undefined,
          "data-combobox-open-on": typeOnly ? "type" : undefined,
          "data-combobox-min-chars": typeOnly && props.minChars !== undefined ? String(props.minChars) : undefined,
          "data-combobox-target": props.action ? `#${listId}` : undefined,
          "aria-required": props.required ? "true" : undefined,
          "data-combobox-required": props.required
            ? props.requiredMessage ??
              (props.multi ? "Please select at least one item." : "Please select an item in the list.")
            : undefined,
        })}>${(props.caret ?? !typeOnly)
        ? html`<span class="combobox__caret">${Icon("chevronDown", { size: 15 })}</span>`
        : ""}</div><div class="combobox__list" id="${listId}" role="listbox"${renderAttrs({
          "aria-label": ariaLabel,
          "aria-labelledby": labelledBy,
          "aria-multiselectable": props.multi ? "true" : undefined,
          "data-combobox-empty": props.emptyText,
          "data-combobox-selected-text": props.multi ? props.selectedText : undefined,
        })}${props.open ? "" : html`
        hidden
      `}>${ComboboxList(props)}</div></div>${props.hint
        ? html`<span class="form-field__help">${props.hint}</span>`
        : ""}</div>
  `;
}
