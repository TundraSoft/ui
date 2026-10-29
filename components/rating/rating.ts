import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

export type RatingSize = "sm" | "md" | "lg";

export type RatingProps = {
  id: string;
  /** Field name; the picked star submits as its number. */
  name?: string;
  /** Current value, 0–`max`; a half (4.5) shows as a half star when `readOnly`. */
  value?: number;
  /** @default 5 */
  max?: number;
  /** Display only: no inputs, a `role="img"` with the value as its name. */
  readOnly?: boolean;
  size?: RatingSize;
  /** The group's accessible name ("Your rating", "Average rating"). */
  label: string;
  /** Per-star accessible names; default "N of max stars". */
  labels?: string[];
  /** Clicking the picked star again clears the rating (rating.js). */
  clearable?: boolean;
  disabled?: boolean;
  attrs?: Attrs;
};

/**
 * Stars. Interactive, it is a real radiogroup — visually hidden radios,
 * star labels, arrows move the pick like any radio group — and the fill
 * is pure CSS (the stars sit reversed in the DOM so the sibling
 * combinator can colour "every star up to the picked one"). Read-only, it
 * is an image with the value as its name, halves included. Nothing here
 * needs the script.
 */
export function Rating(props: RatingProps): Html {
  const max = props.max ?? 5;
  const size = props.size ?? "md";
  const value = Math.max(0, Math.min(max, props.value ?? 0));
  const star = (cls: string) =>
    html`<span class="${cls}" aria-hidden="true">${
      Icon("star", { size: size === "sm" ? 14 : size === "lg" ? 28 : 20 })
    }</span>`;

  if (props.readOnly) {
    const stars = Array.from({ length: max }, (_, i) => {
      const n = i + 1;
      const kind = value >= n
        ? "rating__star rating__star--full"
        : value >= n - 0.5
        ? "rating__star rating__star--half"
        : "rating__star";
      return kind.includes("--half")
        ? html`<span class="${kind}" aria-hidden="true">${
          Icon("star", { size: size === "sm" ? 14 : size === "lg" ? 28 : 20 })
        }<span class="rating__half">${
          Icon("star", { size: size === "sm" ? 14 : size === "lg" ? 28 : 20 })
        }</span></span>`
        : star(kind);
    });
    return html`<span${
      classAttrs(
        "rating rating--readonly",
        mergeAttrs(props.attrs, {
          id: props.id,
          role: "img",
          "aria-label": `${props.label}: ${value} out of ${max}`,
        }),
        `rating--${size}`,
      )
    }>${stars}</span>`;
  }

  // Reversed order: the last star in the DOM is star 1, so `input:checked ~ label`
  // (later siblings) are the stars *below* the pick — the ones that fill.
  const items = Array.from({ length: max }, (_, i) => max - i).map((n) => {
    const inputId = `${props.id}-${n}`;
    const name = props.labels?.[n - 1] ?? `${n} of ${max} stars`;
    return html`
      <input type="radio" class="rating__input sr-only" id="${inputId}" ${renderAttrs({
        name: props.name,
        value: String(n),
        checked: value === n ? "" : undefined,
        disabled: props.disabled ? "" : undefined,
      })}><label class="rating__label"
        for="${inputId}" title="${name}"><span class="sr-only">${name}</span>${star("rating__star")}</label>
    `;
  });

  return html`<fieldset${
    classAttrs(
      "rating",
      mergeAttrs(props.attrs, {
        id: props.id,
        role: "radiogroup",
        "aria-label": props.label,
        "data-rating": "",
        "data-rating-clearable": props.clearable ? "" : undefined,
        disabled: props.disabled ? "" : undefined,
      }),
      `rating--${size}`,
      props.disabled && "rating--disabled",
    )
  }><legend class="sr-only">${props.label}</legend>${items}</fieldset>`;
}
