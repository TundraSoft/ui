import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Input, type InputSize, type ValidationMessages } from "../input/input.ts";

export type PasswordStrength = 1 | 2 | 3 | 4;

export type PasswordInputProps = {
  /** Required: the reveal toggle and a confirm field's `match` point at it. */
  id: string;
  name: string;
  value?: string;
  placeholder?: string;
  size?: InputSize;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  minLength?: number;
  maxLength?: number;
  /** `new-password` for sign-up / change forms, `current-password` for sign-in. @default "current-password" */
  autocomplete?: "new-password" | "current-password";
  /**
   * Show the strength bar (new passwords). password.js scores the value as
   * it is typed — length, character classes, repeats, sequences, the most
   * common passwords — into four levels; the bar is hidden while empty.
   */
  strength?: boolean;
  /**
   * With `strength`: the lowest level the validator accepts (1 Too weak,
   * 2 Weak, 3 Good, 4 Strong). Below it the field is invalid with the
   * `messages.strength` text. The server must enforce its own rule too.
   */
  strengthMin?: PasswordStrength;
  /** Selector of the password this one must equal — the confirm field: `match: "#password"`. */
  match?: string;
  /** The Show / Hide toggle. @default true */
  reveal?: boolean;
  /** Labels of the toggle and the strength levels, for translation. */
  labels?: Partial<typeof DEFAULT_LABELS>;
  messages?: ValidationMessages & { strength?: string };
  attrs?: Attrs;
};

export const DEFAULT_LABELS = {
  show: "Show",
  hide: "Hide",
  strength: "Password strength",
  levels: ["Too weak", "Weak", "Good", "Strong"] as readonly [string, string, string, string],
};

/**
 * A password field: the plain `Input` with a Show/Hide toggle, an optional
 * strength bar under it, and `match` for a confirm field. Client-side only
 * by nature — without JS the toggle and bar are hidden and the field is a
 * normal password input. Pair with `Form({ validate: true })` for inline
 * messages, including "too weak" (`strengthMin`) and "does not match".
 */
export function PasswordInput(props: PasswordInputProps): Html {
  const labels = { ...DEFAULT_LABELS, ...props.labels };
  const control = Input({
    id: props.id,
    name: props.name,
    type: "password",
    value: props.value,
    placeholder: props.placeholder,
    size: props.size,
    required: props.required,
    disabled: props.disabled,
    invalid: props.invalid,
    minLength: props.minLength,
    maxLength: props.maxLength,
    autocomplete: props.autocomplete ?? "current-password",
    match: props.match,
    messages: props.messages,
    extraClass: "password__input",
    attrs: {
      ...props.attrs,
      "data-strength-min": props.strength && props.strengthMin ? String(props.strengthMin) : undefined,
      "data-msg-strength": props.messages?.strength,
    },
  });
  const reveal = props.reveal === false ? "" : html`
    <button type="button" class="password__reveal js-only" data-password-reveal aria-controls="${props.id}"
      aria-pressed="false" data-label-show="${labels.show}" data-label-hide="${labels.hide}">${labels.show}</button>
  `;
  const strength = props.strength
    ? html`
      <div class="password__strength js-only" data-password-strength hidden>
        <div class="password__bar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <p
          class="password__strength-label"><span class="sr-only">${labels
            .strength}: </span><span data-password-label ${renderAttrs({
              "data-levels": labels.levels.join("|"),
            })}></span></p>
      </div>
    `
    : "";
  return html`
    <div${classAttrs("password", {}, undefined)} data-password
      data-strength-level="0"><div class="password__field">${control}${reveal}</div>${strength}</div>
  `;
}
