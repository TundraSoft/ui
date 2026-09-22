import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { DatePicker } from "../datepicker/datepicker.ts";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = {
  id?: string;
  name?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  size?: InputSize;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** Native constraints — the browser enforces them without JS, `Form({ validate: true })` shows them inline. */
  minLength?: number;
  maxLength?: number;
  /**
   * A regular expression the whole value must match (native `pattern`).
   * Browsers compile it with the `v` flag: escape `-` inside a character
   * class (`[a-z0-9\\-]+`), and `[`, `]`, `{`, `}` literally.
   */
  pattern?: string;
  min?: number | string;
  max?: number | string;
  step?: number | "any";
  autocomplete?: string;
  /**
   * Selector of the control this value must equal (a confirm field):
   * `match: "#password"`. Checked by the validator; the server must
   * check it too.
   */
  match?: string;
  /** Per-rule messages for the validator, replacing the browser's wording. */
  messages?: ValidationMessages;
  /**
   * `type: "password"` only: show the strength bar (new passwords). The
   * password field has a Show/Hide toggle by default, the
   * bar with `strength`, `strengthMin` as the validator's floor, `match`
   * for a confirm field.
   */
  strength?: boolean;
  /** `type: "password"` only, with `strength`: the lowest level (1–4) the validator accepts. */
  strengthMin?: PasswordStrength;
  /**
   * `type: "password"` only: `false` renders the bare native control (no
   * toggle, no bar) — inside an `InputGroup`, or when the page must not
   * offer to reveal the value.
   */
  reveal?: boolean;
  /** `type: "password"` only: the toggle's and strength levels' text, for translation. */
  passwordLabels?: Partial<PasswordLabels>;
  /** Extra classes, e.g. `input-group__control` when nested in an InputGroup. */
  extraClass?: string;
  attrs?: Attrs;
};

/** Messages the client-side validator shows instead of the browser's, per rule. */
export type ValidationMessages = {
  required?: string;
  /** Wrong shape for the type (email, url, number). */
  type?: string;
  pattern?: string;
  minLength?: string;
  maxLength?: string;
  min?: string;
  max?: string;
  step?: string;
  /** For `match`. */
  match?: string;
  /** For a password's `strengthMin`. */
  strength?: string;
};

/** A number or string prop as an attribute value; undefined stays omitted. */
export const attr = (v: number | string | undefined): string | undefined => (v === undefined ? undefined : String(v));

/** `data-msg-*` attributes from `messages` (what form.js reads). */
export function messageAttrs(messages?: ValidationMessages): Attrs {
  if (!messages) return {};
  return {
    "data-msg-required": messages.required,
    "data-msg-type": messages.type,
    "data-msg-pattern": messages.pattern,
    "data-msg-min-length": messages.minLength,
    "data-msg-max-length": messages.maxLength,
    "data-msg-min": messages.min,
    "data-msg-max": messages.max,
    "data-msg-step": messages.step,
    "data-msg-match": messages.match,
  };
}

const SIZE_CLASS: Record<InputSize, string> = {
  sm: "input--sm",
  md: "",
  lg: "input--lg",
};

/**
 * `type="date"` renders the library's DatePicker (client mode) instead of
 * the native control — one look across browsers, keyboard navigation,
 * min/max, tokens. Its hidden input carries `name` and the ISO value, so
 * a form posts exactly what a native date input would. Needs a stable
 * `id` or `name` (ids are deterministic, §4). `disabled` disables the
 * trigger; `required`/`invalid` are the surrounding FormField's job.
 */
export type PasswordStrength = 1 | 2 | 3 | 4;

/** Text of the password field's toggle and strength levels, for translation (`passwordLabels`). */
export type PasswordLabels = {
  show: string;
  hide: string;
  strength: string;
  levels: readonly [string, string, string, string];
};

const PASSWORD_LABELS: PasswordLabels = {
  show: "Show",
  hide: "Hide",
  strength: "Password strength",
  levels: ["Too weak", "Weak", "Good", "Strong"],
};

/**
 * What `Input({ type: "password" })` renders: the bare control inside a
 * wrapper with a Show/Hide toggle (`.js-only`), an optional strength bar
 * (`strength`; input.js scores the value into `data-strength-level` 0–4,
 * `strengthMin` becomes a custom validity the validator reports) and
 * `match` for a confirm field. Without JS it is a password input, nothing
 * more; `reveal: false` renders the bare control alone.
 */
function PasswordField(props: InputProps): Html {
  const id = props.id ?? props.name ?? "password";
  const labels = { ...PASSWORD_LABELS, ...props.passwordLabels };
  const control = Input({
    ...props,
    id,
    name: props.name ?? id,
    autocomplete: props.autocomplete ?? "current-password",
    reveal: false,
    extraClass: props.extraClass ? `password__input ${props.extraClass}` : "password__input",
    attrs: {
      ...props.attrs,
      "data-strength-min": props.strength && props.strengthMin ? String(props.strengthMin) : undefined,
      "data-msg-strength": props.messages?.strength,
    },
  });
  const reveal = html`
    <button type="button" class="password__reveal js-only" data-password-reveal aria-controls="${id}"
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
    <div class="password" data-password
      data-strength-level="0"><div class="password__field">${control}${reveal}</div>${strength}</div>
  `;
}

function DateInput(props: InputProps): Html {
  const name = props.name ?? props.id ?? "date";
  return DatePicker({
    id: props.id ?? `${name}-date`,
    name,
    start: props.value,
    min: props.attrs?.min,
    max: props.attrs?.max,
    disabled: props.disabled,
  });
}

export function Input(props: InputProps): Html {
  if (props.type === "date") return DateInput(props);
  if (props.type === "password" && props.reveal !== false) return PasswordField(props);

  const className = cx(
    "input",
    SIZE_CLASS[props.size ?? "md"],
    props.invalid && "input--invalid",
    props.extraClass,
  );

  const attrs: Attrs = {
    ...messageAttrs(props.messages),
    ...props.attrs,
    id: props.id,
    name: props.name,
    value: props.value,
    placeholder: props.placeholder,
    disabled: props.disabled ? "" : undefined,
    readonly: props.readonly ? "" : undefined,
    required: props.required ? "" : undefined,
    minlength: attr(props.minLength),
    maxlength: attr(props.maxLength),
    pattern: props.pattern,
    min: attr(props.min),
    max: attr(props.max),
    step: attr(props.step),
    autocomplete: props.autocomplete,
    "data-match": props.match,
    "aria-invalid": props.invalid ? "true" : undefined,
  };

  return html`
    <input type="${props.type ?? "text"}" ${classAttrs(className, attrs)}>
  `;
}

export type FloatingInputProps = InputProps & {
  label: string | Html;
};

export function FloatingInput(props: FloatingInputProps): Html {
  const inputId = props.id ?? props.name;
  const input = Input({ ...props, id: inputId, placeholder: " " });
  return html`<div class="input-float">${input}<label class="input-float__label" for="${
    inputId ?? ""
  }">${props.label}</label></div>`;
}

export type InputGroupProps = {
  /** Text/icon/select addon rendered before the control. */
  start?: string | Html;
  /** Text/icon/select addon rendered after the control. */
  end?: string | Html;
  /** The control itself — usually `Input({ extraClass: "input-group__control", ... })`. */
  control: Html;
  attrs?: Attrs;
};

export type InputIconProps = {
  /** The glyph — usually `Icon("search", { size: 16 })`. */
  icon: Html;
  /** Put the glyph after the control instead of before. */
  end?: boolean;
  /** The control itself — a plain `Input(...)`. */
  control: Html;
  attrs?: Attrs;
};

/** An input with an inset icon (search, mail…). The glyph is decorative. */
export function InputIcon(props: InputIconProps): Html {
  return html`
    <span class="${cx("input-icon", props.end && "input-icon--end")}"
      ${renderAttrs(props.attrs ?? {})}><span class="input-icon__glyph" aria-hidden="true">${props.icon}</span>${props
        .control}</span>
  `;
}

export function InputGroup(props: InputGroupProps): Html {
  return html`
    <div class="input-group" ${renderAttrs(props.attrs ?? {})}>${props.start &&
      html`<span class="input-group__addon">${props.start}</span>`}${props.control}${props.end &&
      html`<span class="input-group__addon">${props.end}</span>`}</div>
  `;
}
