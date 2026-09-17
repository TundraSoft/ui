import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type WizardStepStatus = "pending" | "active" | "done";

export type WizardStep = {
  label: string | Html;
  status?: WizardStepStatus;
};

export type WizardProps = {
  id?: string;
  steps: WizardStep[];
  content: Html;
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
        class="${className}"><span class="wizard__step-index">${status === "done"
          ? html`&#10003;`
          : String(index + 1)}</span><span class="wizard__step-label">${step.label}</span></li>
    `;
  });

  return html`
    <div class="wizard" ${renderAttrs({ ...props.attrs, id: props.id })}>
      <ol class="wizard__steps">${items}</ol>
      <div class="wizard__content">${props.content}</div>
    </div>
  `;
}
