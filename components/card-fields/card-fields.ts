import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { FormField, FormGrid } from "../form-field/form-field.ts";
import { Input, type ValidationMessages } from "../input/input.ts";

export type CardFieldPart = "number" | "expiry" | "name" | "cvc";

export type CardFieldsProps = {
  /** Base of the field names: `<name>-number`, `<name>-expiry`, `<name>-name`, `<name>-cvc`. @default "card" */
  name?: string;
  /** Which parts to render, in this order. Number is always present. @default all four */
  fields?: CardFieldPart[];
  /** Required for every rendered part (default), or per part. */
  required?: boolean | Partial<Record<CardFieldPart, boolean>>;
  /**
   * Also check the number's Luhn checksum (offline; catches a mistyped
   * digit, says nothing about whether the card exists). Off by default —
   * the format rules are length, digits, expiry range and CVC length.
   */
  luhn?: boolean;
  /** Field labels, for translation. */
  labels?: Partial<Record<CardFieldPart, string>>;
  /** Validator messages per part, plus the two rules the script adds. */
  messages?: Partial<Record<CardFieldPart, string>> & { expired?: string; luhn?: string };
  /**
   * Server-side errors per part (`RapidFormError.fields[<name>-number]`
   * etc.), rendered like any FormField error.
   */
  errors?: Partial<Record<CardFieldPart, string>>;
  /**
   * Values to re-render — name and expiry only. The number and CVC are
   * never echoed back into markup, whatever is passed.
   */
  values?: Partial<Record<"name" | "expiry", string>>;
  disabled?: boolean;
  attrs?: Attrs;
};

const LABELS: Record<CardFieldPart, string> = {
  number: "Card number",
  expiry: "Expiry",
  name: "Name on card",
  cvc: "CVC",
};

const SPAN: Record<CardFieldPart, 12 | 6> = { number: 12, name: 12, expiry: 6, cvc: 6 };

/**
 * Card details as a group of FormFields — number (grouped as typed, brand
 * shown from the prefix), expiry (`MM/YY`, the slash inserted, not in the
 * past), name on card and CVC (3 digits, 4 for Amex — the number drives
 * it). Every part is a native input with `autocomplete="cc-*"`, so
 * browsers and password managers fill it. Format checks only: length,
 * digits, expiry range, CVC length, plus the Luhn checksum when `luhn` is
 * set. Pair with `Form({ validate: true })` for inline messages.
 *
 * Rendering card fields means the card number reaches your server unless
 * the form posts to a payment processor's endpoint — which puts the app in
 * PCI scope. Use it knowingly.
 */
export function CardFields(props: CardFieldsProps): Html {
  const name = props.name ?? "card";
  const parts: CardFieldPart[] = props.fields?.length
    ? [...new Set<CardFieldPart>(["number", ...props.fields])]
    : ["number", "expiry", "name", "cvc"];
  const labels = { ...LABELS, ...props.labels };
  const isRequired = (part: CardFieldPart) =>
    typeof props.required === "object" ? props.required[part] ?? true : props.required ?? true;
  const fieldId = (part: CardFieldPart) => `${name}-${part}`;

  const field = (part: CardFieldPart): Html => {
    const id = fieldId(part);
    const required = isRequired(part);
    const messages: ValidationMessages = { required: props.messages?.[part], pattern: props.messages?.[part] };
    const control = (a: { id: string; describedBy?: string; invalid: boolean }) => {
      const common = {
        id: a.id,
        name: id,
        required,
        disabled: props.disabled,
        invalid: a.invalid,
        messages,
        attrs: { "aria-describedby": a.describedBy },
      };
      switch (part) {
        case "number":
          return html`
            <div
              class="input-group card-fields__number-group">${Input({
                ...common,
                type: "text",
                autocomplete: "cc-number",
                pattern: "[0-9 ]{13,23}",
                maxLength: 23,
                placeholder: "1234 5678 9012 3456",
                extraClass: "input-group__control card-fields__number",
                attrs: {
                  ...common.attrs,
                  inputmode: "numeric",
                  "data-card-number": "",
                  "data-msg-luhn": props.messages?.luhn,
                },
              })}<span class="input-group__addon card-fields__brand" data-card-brand aria-live="polite"></span></div>
          `;
        case "expiry":
          return Input({
            ...common,
            type: "text",
            autocomplete: "cc-exp",
            pattern: "(0[1-9]|1[0-2])/[0-9]{2}",
            maxLength: 5,
            placeholder: "MM/YY",
            attrs: {
              ...common.attrs,
              inputmode: "numeric",
              "data-card-expiry": "",
              "data-msg-expired": props.messages?.expired,
            },
            value: props.values?.expiry,
          });
        case "name":
          return Input({
            ...common,
            type: "text",
            autocomplete: "cc-name",
            value: props.values?.name,
            attrs: { ...common.attrs, "data-card-name": "" },
          });
        case "cvc":
          return Input({
            ...common,
            type: "text",
            autocomplete: "cc-csc",
            pattern: "[0-9]{3}",
            maxLength: 3,
            placeholder: "123",
            attrs: { ...common.attrs, inputmode: "numeric", "data-card-cvc": "" },
          });
      }
    };
    return FormField({ id, label: labels[part], required, error: props.errors?.[part], span: SPAN[part], control });
  };

  return html`<div class="card-fields" data-card-fields ${
    renderAttrs({ ...props.attrs, "data-luhn": props.luhn ? "" : undefined })
  }>${FormGrid({ fields: parts.map(field) })}</div>`;
}
