import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { DatePicker } from "../datepicker/datepicker.ts";
import { Select } from "../select/select.ts";
import { Icon } from "../../shared/icons.ts";

export type InputSize = "sm" | "md" | "lg";

/**
 * A country code for `Input({ type: "tel", countries })`:
 * `{ code: "+44", label: "UK" }`. `flag` is any `Html` shown before the
 * code in the list and in the closed field — the library ships no flag
 * artwork (it is multicolour, heavy, and changes), so bring a set:
 * `flag: raw(flags.gb)` over any package that gives you SVG strings.
 */
export type CountryCode = { code: string; label?: string; flag?: Html };

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
   * Browsers compile it with the `v` flag, which is strict inside a
   * character class: escape `-`, `(`, `)`, `/`, `|`, `[`, `]`, `{`, `}`
   * there (`[a-z0-9\\-]+`, `[0-9 \\(\\)\\-]+`).
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
   * A route that checks one value on the server ("username taken"): on
   * blur, once the native rules pass, the validator POSTs `<name>=<value>`
   * (urlencoded, with the CSRF header) and shows a non-empty text reply
   * as the field's error; an empty reply means fine. Without JS the
   * server catches it on submit.
   */
  validateAction?: string;
  /** With `maxLength`: a live "12 / 280" counter under the control (turns warning near the limit). Needs an `id` or `name`. */
  counter?: boolean;
  /** Text or an icon inside the field's frame before the value (`$`), an `InputGroup` without the ceremony. */
  prefix?: string | Html;
  /** Same, after the value (`per seat`, `kg`). */
  suffix?: string | Html;
  /**
   * `type: "email"`: only these domains are allowed. The field becomes the
   * local part (`name`), a fixed `@`, and the domain — a select named
   * `<name>-domain`, or fixed text with one domain. The form submits the
   * two parts; join them with `emailFrom()` (`@tundralibs/ui/shared/compose`).
   */
  domains?: string[];
  /**
   * `type: "tel"`: a country-code select named `<name>-country` before the
   * number. Two parts, joined with `telFrom()`.
   */
  countries?: CountryCode[];
  /**
   * `type: "url"`: a fixed scheme (`https://`) before the field, submitted
   * as a hidden `<name>-scheme`; the field takes the rest. Joined with
   * `urlFrom()`.
   */
  scheme?: string;
  /** `type: "search"`: a clear button inside the field (default on for search). Clearing fires `input`, so a `filter.js` scope resets too. */
  clearable?: boolean;
  /**
   * `type: "password"` only: show the strength bar (new passwords). The
   * password field has a Show/Hide toggle by default, the bar with
   * `strength`, `strengthMin` as the validator's floor, `match` for a
   * confirm field, and a Caps Lock notice while it is on.
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
  /** `type: "password"` only: the toggle's, strength levels' and Caps Lock notice's text, for translation. */
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

export type PasswordStrength = 1 | 2 | 3 | 4;

/** Text of the password field's toggle, strength levels and Caps Lock notice, for translation (`passwordLabels`). */
export type PasswordLabels = {
  show: string;
  hide: string;
  strength: string;
  levels: readonly [string, string, string, string];
  capsLock: string;
};

const PASSWORD_LABELS: PasswordLabels = {
  show: "Show",
  hide: "Hide",
  strength: "Password strength",
  levels: ["Too weak", "Weak", "Good", "Strong"],
  capsLock: "Caps Lock is on",
};

/** The `<input>` itself, with every native attribute — what every variant below wraps. */
function nativeInput(props: InputProps, over: Partial<InputProps> = {}, extraAttrs: Attrs = {}): Html {
  const p = { ...props, ...over };
  const className = cx(
    "input",
    SIZE_CLASS[p.size ?? "md"],
    p.invalid && "input--invalid",
    p.extraClass,
  );
  const attrs: Attrs = {
    ...messageAttrs(p.messages),
    ...p.attrs,
    ...extraAttrs,
    id: p.id,
    name: p.name,
    value: p.value,
    placeholder: p.placeholder,
    disabled: p.disabled ? "" : undefined,
    readonly: p.readonly ? "" : undefined,
    required: p.required ? "" : undefined,
    minlength: attr(p.minLength),
    maxlength: attr(p.maxLength),
    pattern: p.pattern,
    min: attr(p.min),
    max: attr(p.max),
    step: attr(p.step),
    autocomplete: p.autocomplete,
    "data-match": p.match,
    "data-validate-action": p.validateAction,
    "data-counter": p.counter && p.maxLength ? "" : undefined,
    "aria-invalid": p.invalid ? "true" : undefined,
  };
  return html`<input type="${p.type ?? "text"}" ${classAttrs(className, attrs)}>`;
}

/** The live counter under a control with `counter` + `maxLength` (input.js keeps it current). */
export function Counter(forId: string, max: number, length = 0): Html {
  return html`<span class="input__counter js-only" data-counter-for="${forId}" aria-live="polite">${String(length)} / ${
    String(max)
  }</span>`;
}

const groupControl = (props: InputProps): string =>
  props.extraClass ? `input-group__control ${props.extraClass}` : "input-group__control";

/** Wrap a control with the search clear button (`type: "search"`). */
function ClearableField(control: Html, id: string): Html {
  return html`
    <span class="input-clear"
      data-input-clear>${control}<button type="button" class="input-clear__button js-only" data-input-clear-button aria-controls="${id}" aria-label="Clear" hidden>&times;</button></span>
  `;
}

/**
 * What `Input({ type: "password" })` renders: the bare control inside a
 * wrapper with a Show/Hide toggle (`.js-only`), an optional strength bar
 * (`strength`; input.js scores the value into `data-strength-level` 0–4,
 * `strengthMin` becomes a custom validity the validator reports), a Caps
 * Lock notice, and `match` for a confirm field. Without JS it is a
 * password input, nothing more; `reveal: false` renders the bare control.
 */
function PasswordField(props: InputProps): Html {
  const id = props.id ?? props.name ?? "password";
  const labels = { ...PASSWORD_LABELS, ...props.passwordLabels };
  const control = nativeInput(props, {
    id,
    name: props.name ?? id,
    type: "password",
    autocomplete: props.autocomplete ?? "current-password",
    extraClass: props.extraClass ? `password__input ${props.extraClass}` : "password__input",
  }, {
    "data-strength-min": props.strength && props.strengthMin ? String(props.strengthMin) : undefined,
    "data-msg-strength": props.messages?.strength,
  });
  const reveal = html`
    <button type="button" class="password__reveal js-only" data-password-reveal aria-controls="${id}"
      aria-pressed="false" data-label-show="${labels.show}"
      data-label-hide="${labels.hide}"><span class="password__reveal-icon" data-icon-show>${Icon("eye", {
        size: 16,
      })}</span><span class="password__reveal-icon" data-icon-hide hidden>${Icon("eyeOff", {
        size: 16,
      })}</span><span class="sr-only" data-password-reveal-label>${labels.show}</span></button>
  `;
  const caps = html`<p class="password__caps js-only" data-password-caps role="status" hidden>${labels.capsLock}</p>`;
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
      data-strength-level="0"><div class="password__field">${control}${reveal}</div>${caps}${strength}</div>
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

/** `type: "email"` + `domains`: local part, a fixed `@`, the domain. */
function EmailDomainsField(props: InputProps, domains: string[]): Html {
  const name = props.name ?? props.id ?? "email";
  const id = props.id ?? name;
  const at = props.value?.indexOf("@") ?? -1;
  const local = at >= 0 ? props.value!.slice(0, at) : props.value;
  const chosen = at >= 0 ? props.value!.slice(at + 1) : undefined;
  const control = nativeInput(props, {
    id,
    name,
    type: "text",
    value: local,
    pattern: props.pattern ?? "[^@\\s]+",
    autocomplete: props.autocomplete ?? "off",
    extraClass: groupControl(props),
  }, { inputmode: "email", "data-email-local": "" });
  const domain = domains.length === 1
    ? html`<span class="input-group__addon">${domains[0]}<input type="hidden" name="${name}-domain" value="${
      domains[0]
    }"></span>`
    : html`<span class="input-group__addon">${
      Select({
        id: `${id}-domain`,
        name: `${name}-domain`,
        value: chosen && domains.includes(chosen) ? chosen : domains[0],
        options: domains.map((d) => ({ value: d, label: d })),
        disabled: props.disabled,
        attrs: { "aria-label": "Email domain" },
      })
    }</span>`;
  return html`
    <div class="input-group input-group--email"
      data-email-domains>${control}<span class="input-group__addon input-group__at" aria-hidden="true">@</span>${domain}</div>
  `;
}

/** `type: "tel"` + `countries`: a country-code select, then the number. */
function TelCountriesField(props: InputProps, countries: CountryCode[]): Html {
  const name = props.name ?? props.id ?? "phone";
  const id = props.id ?? name;
  const match = props.value ? countries.find((c) => props.value!.startsWith(c.code)) : undefined;
  const number = match ? props.value!.slice(match.code.length).trim() : props.value;
  const control = nativeInput(props, {
    id,
    name,
    type: "tel",
    value: number,
    pattern: props.pattern ?? "[0-9 \\(\\)\\-]{4,20}",
    autocomplete: props.autocomplete ?? "tel-national",
    extraClass: groupControl(props),
  }, { inputmode: "tel" });
  return html`
    <div class="input-group input-group--tel"
      data-tel-countries><span class="input-group__addon">${Select({
        id: `${id}-country`,
        name: `${name}-country`,
        value: match?.code ?? countries[0]?.code,
        options: countries.map((c) => ({
          value: c.code,
          label: c.label ? `${c.code} ${c.label}` : c.code,
          lead: c.flag,
        })),
        disabled: props.disabled,
        attrs: { "aria-label": "Country code", autocomplete: "tel-country-code" },
      })}</span>${control}</div>
  `;
}

/** `type: "url"` + `scheme`: the scheme fixed in front, submitted hidden. */
function UrlSchemeField(props: InputProps, scheme: string): Html {
  const name = props.name ?? props.id ?? "url";
  const id = props.id ?? name;
  const value = props.value?.startsWith(scheme) ? props.value.slice(scheme.length) : props.value;
  const control = nativeInput(props, {
    id,
    name,
    type: "text",
    value,
    pattern: props.pattern ?? "[^\\s\\/][^\\s]*",
    autocomplete: props.autocomplete ?? "url",
    extraClass: groupControl(props),
  }, { inputmode: "url" });
  return html`
    <div class="input-group input-group--url"
      data-url-scheme><span class="input-group__addon">${scheme}<input type="hidden" name="${name}-scheme" value="${scheme}"></span>${control}</div>
  `;
}

export function Input(props: InputProps): Html {
  if (props.type === "date") return DateInput(props);
  if (props.type === "password" && props.reveal !== false) return PasswordField(props);

  let control: Html;
  if (props.type === "email" && props.domains?.length) control = EmailDomainsField(props, props.domains);
  else if (props.type === "tel" && props.countries?.length) control = TelCountriesField(props, props.countries);
  else if (props.type === "url" && props.scheme) control = UrlSchemeField(props, props.scheme);
  else if (props.prefix !== undefined || props.suffix !== undefined) {
    control = InputGroup({
      start: props.prefix,
      end: props.suffix,
      control: nativeInput(
        props,
        { extraClass: groupControl(props) },
        props.type === "number" ? { inputmode: "decimal" } : {},
      ),
    });
  } else if (props.type === "search" && props.clearable !== false) {
    const id = props.id ?? props.name ?? "search";
    control = ClearableField(nativeInput(props, { id }), id);
  } else control = nativeInput(props);

  if (props.counter && props.maxLength) {
    const id = props.id ?? props.name ?? "";
    return html`${control}${Counter(id, props.maxLength, props.value?.length ?? 0)}`;
  }
  return control;
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
    <div class="input-group" ${renderAttrs(props.attrs ?? {})}>${props.start !== undefined && props.start !== "" &&
      html`<span class="input-group__addon">${props.start}</span>`}${props.control}${props.end !== undefined &&
      props.end !== "" && html`<span class="input-group__addon">${props.end}</span>`}</div>
  `;
}
