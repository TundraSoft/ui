import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

/** Height of each list: sm 12rem, md 16rem, lg 24rem. */
export type TransferSize = "sm" | "md" | "lg";

export type TransferOption = {
  /** What the form posts for this item. */
  value: string;
  label: string | Html;
  /** Starts in the chosen list (`selected` on the native option). */
  selected?: boolean;
  /** Cannot be moved; still posted when it starts chosen. */
  disabled?: boolean;
};

export type TransferProps = {
  /** Required: the native select is `<id>-native`, the lists `<id>-source` / `<id>-target`. */
  id: string;
  /** Posted once per chosen item (`<select multiple>`). */
  name: string;
  options: TransferOption[];
  /** Heading of the available list. @default "Available" */
  sourceTitle?: string;
  /** Heading of the chosen list. @default "Chosen" */
  targetTitle?: string;
  /** A search box above each list that filters its items. @default true */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** @default "md" */
  size?: TransferSize;
  /** At least one item must be chosen. */
  required?: boolean;
  /** Text for `required` (→ `data-msg-required` on the native select). */
  requiredMessage?: string;
  /** Shown in a list with nothing in it. @default "Nothing here" */
  emptyText?: string;
  /** Shown when a search matches nothing. @default "No matches" */
  noMatchText?: string;
  disabled?: boolean;
  attrs?: Attrs;
};

const MOVES = [
  { move: "all-to-target", icon: "chevronsRight", label: "Move all to chosen" },
  { move: "to-target", icon: "chevronRight", label: "Move selected to chosen" },
  { move: "to-source", icon: "chevronLeft", label: "Move selected to available" },
  { move: "all-to-source", icon: "chevronsLeft", label: "Move all to available" },
] as const;

/**
 * Two lists and the buttons between them: pick items on one side, move
 * them to the other. The form control is a native `<select multiple>`
 * carrying `name` — what a no-JS page shows and what every page posts;
 * transfer.js keeps its options' `selected` in step with the chosen list
 * and fires `change` on it, so `filter.js`, `autosubmit` and a form's
 * validation see an ordinary multi select. Lists are `role="listbox"`
 * (`aria-multiselectable`): click or Space marks an item, double-click or
 * Enter moves it, arrows walk, Home/End jump, Ctrl+A marks every visible
 * item; the search box above each list filters it. Below 768px the lists
 * stack and the buttons turn into a row between them.
 */
export function Transfer(props: TransferProps): Html {
  const id = props.id;
  const size = props.size ?? "md";
  const searchable = props.searchable !== false;
  const root = classAttrs(
    "transfer",
    mergeAttrs(props.attrs, {
      id,
      "data-transfer": "",
      "data-validate-group": "",
      "data-transfer-disabled": props.disabled ? "" : undefined,
    }),
    `transfer--${size}`,
  );
  const native = html`<select ${
    classAttrs("transfer__native", {
      id: `${id}-native`,
      name: props.name,
      multiple: "",
      required: props.required ? "" : undefined,
      disabled: props.disabled ? "" : undefined,
      "data-msg-required": props.requiredMessage,
      "data-validate-proxy": `#${id}-target`,
      "aria-label": props.targetTitle ?? "Chosen",
    })
  }>${
    props.options.map((o) =>
      html`<option ${
        classAttrs("", { value: o.value, selected: o.selected ? "" : undefined, disabled: o.disabled ? "" : undefined })
      }>${o.label}</option>`
    )
  }</select>`;

  const list = (side: "source" | "target") => {
    const title = side === "source" ? props.sourceTitle ?? "Available" : props.targetTitle ?? "Chosen";
    const items = props.options.filter((o) => Boolean(o.selected) === (side === "target"));
    const search = searchable
      ? html`<input type="search" ${
        classAttrs("input input--sm transfer__search", {
          "data-transfer-search": "",
          "data-validate-skip": "",
          form: `${id}-search-scope`,
          placeholder: props.searchPlaceholder ?? "Search",
          "aria-label": `Search ${title.toLowerCase()}`,
          autocomplete: "off",
        })
      }>`
      : "";
    return html`<div class="transfer__list" data-transfer-list="${side}">
      <div class="transfer__head">
        <span class="transfer__title" id="${id}-${side}-title">${title}</span>
        <span class="transfer__count" data-transfer-count>${items.length}</span>
      </div>
      ${search}
      <ul ${
      classAttrs("transfer__items", {
        id: `${id}-${side}`,
        role: "listbox",
        "aria-multiselectable": "true",
        "aria-labelledby": `${id}-${side}-title`,
        tabindex: "0",
      })
    }>${
      items.map((o) =>
        html`
          <li
            ${classAttrs("transfer__item", {
              role: "option",
              "aria-selected": "false",
              "aria-disabled": o.disabled ? "true" : undefined,
              "data-value": o.value,
              "data-index": String(props.options.indexOf(o)),
              tabindex: "-1",
            })}><span class="transfer__check" aria-hidden="true">${Icon("check", {
              size: 14,
            })}</span><span class="transfer__label">${o.label}</span></li>
        `
      )
    }</ul>
      <p class="transfer__empty" data-transfer-empty data-empty-text="${
      props.emptyText ?? "Nothing here"
    }" data-no-match-text="${props.noMatchText ?? "No matches"}" ${items.length ? "hidden" : ""}>${
      props.emptyText ?? "Nothing here"
    }</p>
    </div>`;
  };

  const controls = html`<div class="transfer__controls" role="group" aria-label="Move items">${
    MOVES.map((m) =>
      html`<button type="button" ${
        classAttrs("btn btn--outline btn--sm btn--icon transfer__move", {
          "data-transfer-move": m.move,
          "aria-label": m.label,
          title: m.label,
          disabled: props.disabled ? "" : undefined,
        })
      }>${Icon(m.icon, { size: 16 })}</button>`
    )
  }</div>`;

  return html`
    <div ${root}>
      ${native}
      <div class="transfer__ui">${list("source")}${controls}${list("target")}</div>
    </div>
  `;
}
