import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";

/** Where the card sits relative to the step's target; flipped by the script when there is no room. */
export type TourPlacement = "top" | "bottom" | "start" | "end";

/** `load`: starts on page load (once, when `storageKey` says it has not been finished); `manual`: a `[data-tour-start]` starts it. */
export type TourStart = "load" | "manual";

export type TourStep = {
  /** CSS selector of the element this step points at; none → the card is centred. */
  target?: string;
  title: string | Html;
  body: string | Html;
  /** @default "bottom" */
  placement?: TourPlacement;
};

export type TourProps = {
  /** Required: `data-tour-start="#<id>"` on any element starts it. */
  id: string;
  steps: TourStep[];
  /** Accessible name of the dialog. @default "Tour" */
  label?: string;
  /** @default "manual" */
  startOn?: TourStart;
  /**
   * A `localStorage` key under which finishing (or skipping) is recorded,
   * so a `load` tour runs once per browser. Omit it and a `load` tour runs
   * on every visit.
   */
  storageKey?: string;
  /** Text of the progress line; `{n}` and `{total}` are filled. @default "{n} of {total}" */
  progress?: string;
  /** Button labels. */
  labels?: { skip?: string; back?: string; next?: string; done?: string };
  attrs?: Attrs;
};

/**
 * A guided walk through a page: one card at a time, pointed at an element
 * through a spotlight cut from a page scrim. The steps are rendered up
 * front (hidden); tour.js shows one, scrolls its target into view,
 * places the card with shared/js/float.js, traps Tab inside it, moves on
 * with Next or →, back with Back or ←, ends with Done, Skip or Escape
 * (focus returns to what started it). It fires `tour:step` ({ index,
 * total, target }) on each step and `tour:done` ({ completed }) at the end.
 * A tour is script-only by nature: without JS nothing shows and the start
 * button does nothing.
 */
export function Tour(props: TourProps): Html {
  const id = props.id;
  const labels = { skip: "Skip", back: "Back", next: "Next", done: "Done", ...props.labels };
  const root = classAttrs(
    "tour",
    mergeAttrs(props.attrs, {
      id,
      hidden: "",
      "data-tour": "",
      "data-tour-start-on": props.startOn ?? "manual",
      "data-tour-key": props.storageKey,
    }),
  );
  const steps = props.steps.map((step, i) =>
    html`
      <li ${classAttrs("tour__step", {
        "data-tour-step": "",
        "data-target": step.target,
        "data-placement": step.placement ?? "bottom",
        hidden: "",
        id: `${id}-step-${i + 1}`,
      })}>
        <h3 class="tour__title" id="${id}-step-${i + 1}-title">${step.title}</h3>
        <div class="tour__body">${step.body}</div>
      </li>
    `
  );
  const progress = props.progress ?? "{n} of {total}";
  return html`
    <div ${root}>
      <div class="tour__scrim" data-tour-scrim></div>
      <div class="tour__spot" aria-hidden="true"></div>
      <div class="tour__card" role="dialog" aria-modal="true" aria-label="${props.label ?? "Tour"}" tabindex="-1">
        <ol class="tour__steps">${steps}</ol>
        <div class="tour__footer">
          <span class="tour__progress" data-tour-progress data-template="${progress}"></span>
          <div class="tour__actions">
            <button type="button" class="btn btn--ghost btn--sm" data-tour-skip>${labels.skip}</button>
            <button type="button" class="btn btn--outline btn--sm" data-tour-back>${labels.back}</button>
            <button type="button" class="btn btn--sm" data-tour-next data-next-label="${labels.next}"
              data-done-label="${labels.done}">${labels.next}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
