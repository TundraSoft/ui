import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";

export type OtpProps = {
  /** Required: cells are `<id>-1 … <id>-N`, the label targets the first. */
  id: string;
  /** The submitted field — ONE value, the joined code. */
  name: string;
  /** Number of cells. Default 6. */
  length?: number;
  /** Prefilled code (e.g. re-rendered after a failed attempt). */
  value?: string;
  label?: string | Html;
  hint?: string | Html;
  /** Set from `RapidFormError.fields[name]` (§6). */
  error?: string;
  /** `numeric` (default) uses the numeric keyboard and accepts digits only. */
  mode?: "numeric" | "alphanumeric";
  /** Visual separator after every `groups` cells, e.g. 3 → `123 · 456`. */
  groups?: number;
  autofocus?: boolean;
  disabled?: boolean;
  /** Submit the surrounding form as soon as every cell is filled. */
  autoSubmit?: boolean;
  attrs?: Attrs;
};

/**
 * One-time code entry. Progressive: without JS a single
 * `autocomplete="one-time-code"` input is what the user sees and
 * submits; with JS (otp.js) it becomes the hidden value carrier behind
 * N cells that auto-advance, accept a pasted/autofilled code across all
 * cells, and walk back on Backspace. The form always submits exactly one
 * field, `name`, whichever way it was entered.
 */
export function Otp(props: OtpProps): Html {
  const length = Math.max(1, props.length ?? 6);
  const value = (props.value ?? "").slice(0, length);
  const numeric = props.mode !== "alphanumeric";
  const describedBy = props.error ? `${props.id}-error` : props.hint ? `${props.id}-hint` : undefined;

  const cells: Html[] = [];
  for (let i = 0; i < length; i++) {
    if (props.groups && i > 0 && i % props.groups === 0) {
      cells.push(html`<span class="otp__sep" aria-hidden="true"></span>`);
    }
    cells.push(html`
      <input class="otp__cell" id="${props.id}-${i + 1}" type="text" value="${value[i] ?? ""}"
        aria-label="Digit ${i + 1} of ${length}" autocapitalize="off" autocorrect="off" spellcheck="false" tabindex="-1"
        ${renderAttrs({
          inputmode: numeric ? "numeric" : "text",
          pattern: numeric ? "[0-9]*" : undefined,
          // SMS/password-manager autofill targets the focused cell; the
          // script spreads a multi-character fill across the rest.
          autocomplete: i === 0 ? "one-time-code" : "off",
          autofocus: props.autofocus && i === 0 ? "" : undefined,
          disabled: props.disabled ? "" : undefined,
          "aria-invalid": props.error ? "true" : undefined,
          "aria-describedby": describedBy,
        })}>
    `);
  }

  return html`
    <div${classAttrs("otp", props.attrs, props.error && "otp--invalid", props.disabled && "otp--disabled")}
      data-otp${renderAttrs({
        "data-otp-mode": numeric ? "numeric" : "alphanumeric",
        "data-otp-submit": props.autoSubmit ? "" : undefined,
      })}>${props.label &&
        html`<label class="form-field__label" for="${props.id}-value">${props.label}</label>`}<input class="otp__value" id="${props
        .id}-value" name="${props
        .name}" type="text" value="${value}" maxlength="${length}" autocomplete="one-time-code" autocapitalize="off" spellcheck="false"${renderAttrs(
          {
            inputmode: numeric ? "numeric" : "text",
            pattern: numeric ? `[0-9]{${length}}` : undefined,
            disabled: props.disabled ? "" : undefined,
            "aria-invalid": props.error ? "true" : undefined,
            "aria-describedby": describedBy,
          },
        )}><div class="otp__cells" role="group" aria-label="${typeof props.label === "string"
        ? props.label
        : "One-time code"}">${cells}</div>${props.error
        ? html`<p class="form-field__error" id="${props.id}-error" role="alert">${props.error}</p>`
        : props.hint && html`<p class="form-field__help" id="${props.id}-hint">${props.hint}</p>`}</div>
  `;
}
