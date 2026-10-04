import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type WizardStepStatus = "pending" | "active" | "done";

export type WizardStep = {
  label: string | Html;
  status?: WizardStepStatus;
};

export type WizardProps = {
  id?: string;
  steps: WizardStep[];
  /**
   * The current step's body. Leave it out to draw the step strip alone —
   * a multi-page flow whose pages carry their own content.
   */
  content?: Html;
  /** The step list's accessible name ("Import steps"). */
  label?: string;
  /** Read before a done step's label by screen readers (the visible mark is a check). @default "Done" */
  doneLabel?: string;
  /** Attributes on the `<ol>` itself (a class merges). */
  listAttrs?: Attrs;
  attrs?: Attrs;
};

export function Wizard(props: WizardProps): Html {
  const items = props.steps.map((step, index) => {
    const status = step.status ?? "pending";
    const className = cx(
      "wizard__step",
      status === "active" && "wizard__step--active",
      status === "done" && "wizard__step--done",
    );
    return html`
      <li
        class="${className}"
        ${renderAttrs({
          "aria-current": status === "active" ? "step" : undefined,
        })}><span class="wizard__step-index" aria-hidden="true">${status ===
            "done"
          ? html`&#10003;`
          : String(index + 1)}</span><span class="wizard__step-label">${status === "done"
          ? html`<span class="sr-only">${props.doneLabel ?? "Done"}: </span>`
          : ""}${step.label}</span></li>
    `;
  });

  return html`
    <div ${classAttrs(
      "wizard",
      mergeAttrs(props.attrs, { id: props.id }),
      props.content === undefined && "wizard--steps-only",
    )}>
      <ol ${classAttrs("wizard__steps", mergeAttrs(props.listAttrs, { "aria-label": props.label }))}>${items}</ol>
      ${props.content === undefined ? "" : html`<div class="wizard__content">${props.content}</div>`}
    </div>
  `;
}
