import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

/** Messages the picker reports (through the validator, or the browser's bubble) instead of its defaults. */
export type TimePickerMessages = {
  /** `required` and nothing entered. Default "Enter a time." */
  required?: string;
  /** Hours without minutes, or the other way round. Default "Enter hours and minutes." */
  incomplete?: string;
  /** Before `min`. Default "Pick {min} or later." */
  min?: string;
  /** After `max`. Default "Pick {max} or earlier." */
  max?: string;
};

export type TimePickerProps = {
  /**
   * Required: goes on the hours segment (so a label's `for` reaches it);
   * the minutes segment, the slot list and the value input derive theirs
   * from it (`<id>-minute`, `<id>-list`, `<id>-value`).
   */
  id: string;
  /** The hidden input that posts the value as ISO `HH:MM` (24-hour). */
  name: string;
  /** ISO `HH:MM`, 24-hour. Anything else renders empty. */
  value?: string;
  /** Minutes between the slots in the popover (default 15). Typing and the arrow keys still reach any minute. */
  step?: number;
  /** Earliest time accepted, ISO `HH:MM`; earlier slots are not offered. */
  min?: string;
  /** Latest time accepted, ISO `HH:MM`. */
  max?: string;
  required?: boolean;
  disabled?: boolean;
  /** Paint the error state (a server-side `RapidFormError` for this field). */
  invalid?: boolean;
  /** A chip after the value naming the zone the time is in (`"UTC"`). Text only — it converts nothing. */
  zone?: string;
  /** Accessible name for the whole control when no `<label for>` points at it. */
  label?: string;
  /** Which edge of the field the slot list aligns to. */
  align?: "start" | "end";
  messages?: TimePickerMessages;
  /** Extra attributes for the root (a caller's `class` is merged). */
  attrs?: Attrs;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `"09:30"` → 570, anything that is not ISO `HH:MM` → undefined. */
export function timeToMinutes(value?: string): number | undefined {
  const m = value ? TIME_RE.exec(value) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 570 → `"09:30"` (wraps into one day). */
export function minutesToTime(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** The slots the popover offers: every `step` minutes from midnight, inside `min`–`max`. */
export function timeSlots(step = 15, min?: string, max?: string): string[] {
  const size = Math.max(1, Math.min(720, Math.floor(step)));
  const lo = timeToMinutes(min) ?? 0;
  const hi = timeToMinutes(max) ?? 1439;
  const out: string[] = [];
  for (let t = 0; t < 1440; t += size) if (t >= lo && t <= hi) out.push(minutesToTime(t));
  return out;
}

/**
 * A 24-hour time: two typeable segments (hours, minutes) and a popover of
 * slots every `step` minutes. Keyboard first — digits fill a segment and
 * jump to the next, ↑/↓ step it, PageUp/PageDown move by `step`, `:`
 * jumps to minutes, Alt+↓ opens the slots (where ↑/↓, Home/End and typed
 * digits move, Enter picks). The value posts as ISO `HH:MM` under `name`.
 *
 * Progressive: the markup's value input is a native `<input type="time">`
 * carrying `name`, `min`, `max` and `required`, which is what a no-JS page
 * shows and submits; timepicker.js turns it into a hidden input and keeps
 * it in step with the segments, and reports `required` / `min` / `max`
 * as a custom validity on the hours segment so `Form({ validate: true })`
 * shows it in the field's error slot. The server must check them too.
 */
export function TimePicker(props: TimePickerProps): Html {
  const id = props.id;
  const listId = `${id}-list`;
  const minutes = timeToMinutes(props.value);
  const value = minutes === undefined ? "" : minutesToTime(minutes);
  const [hh, mm] = value ? value.split(":") : ["", ""];
  const step = props.step ?? 15;
  const lo = timeToMinutes(props.min) ?? 0;
  const hi = timeToMinutes(props.max) ?? 1439;
  const msg = props.messages ?? {};

  const slots = timeSlots(step).map((slot) => {
    const t = timeToMinutes(slot)!;
    const selected = slot === value;
    return html`
      <div class="timepicker__slot" role="option" id="${id}-slot-${slot.replace(":", "")}" data-value="${slot}"
        aria-selected="${selected ? "true" : "false"}"
        ${t < lo || t > hi
          ? html`
            hidden
          `
          : ""}><span>${slot}</span><span class="timepicker__check" aria-hidden="true">${Icon("check", {
            size: 14,
          })}</span></div>
    `;
  });

  const segment = (part: "hour" | "minute", segValue: string) =>
    html`<input ${
      renderAttrs({
        id: part === "hour" ? id : `${id}-minute`,
        class: "timepicker__segment",
        type: "text",
        inputmode: "numeric",
        autocomplete: "off",
        maxlength: "2",
        placeholder: "--",
        value: segValue,
        role: "spinbutton",
        "aria-label": part === "hour" ? "Hours" : "Minutes",
        "aria-valuemin": part === "hour" ? "0" : "0",
        "aria-valuemax": part === "hour" ? "23" : "59",
        "aria-valuenow": segValue ? String(Number(segValue)) : undefined,
        "aria-invalid": props.invalid ? "true" : undefined,
        disabled: props.disabled ? "" : undefined,
        "data-segment": part,
        // The minutes segment never reports: the hours segment carries the
        // whole control's validity, and one error slot has one owner.
        "data-validate-skip": part === "minute" ? "" : undefined,
        "data-msg-required": part === "hour" ? msg.required : undefined,
        "data-msg-incomplete": part === "hour" ? msg.incomplete : undefined,
        "data-msg-min": part === "hour" ? msg.min : undefined,
        "data-msg-max": part === "hour" ? msg.max : undefined,
      })
    }>`;

  const rootAttrs: Attrs = mergeAttrs(props.attrs, {
    "data-timepicker": "",
    "data-validate-group": "",
    "data-timepicker-min": props.min,
    "data-timepicker-max": props.max,
    "data-timepicker-required": props.required ? "" : undefined,
  });

  return html`
    <div
      ${classAttrs(
        cx(
          "timepicker",
          props.align === "end" && "timepicker--end",
          props.invalid && "timepicker--invalid",
          props.disabled && "timepicker--disabled",
        ),
        rootAttrs,
      )}><input ${renderAttrs({
        id: `${id}-value`,
        class: cx("input", "timepicker__native", props.invalid && "input--invalid"),
        type: "time",
        name: props.name,
        value,
        step: "60",
        min: props.min,
        max: props.max,
        required: props.required ? "" : undefined,
        disabled: props.disabled ? "" : undefined,
        "aria-invalid": props.invalid ? "true" : undefined,
        "aria-label": props.label,
        "data-timepicker-value": "",
      })}><div class="timepicker__field" role="group"${renderAttrs({
        "aria-label": props.label,
      })}><span class="timepicker__icon" aria-hidden="true">${Icon("clock", {
        size: 15,
      })}</span>${segment("hour", hh)}<span class="timepicker__sep" aria-hidden="true">:</span>${segment(
        "minute",
        mm,
      )}${props.zone
        ? html`<span class="timepicker__zone">${props.zone}</span>`
        : ""}<button type="button" class="timepicker__toggle" aria-label="Choose a time" aria-haspopup="listbox"
      aria-expanded="false" aria-controls="${listId}" data-timepicker-toggle${props.disabled
        ? html`
          disabled
        `
        : ""}>${Icon("chevronDown", {
          size: 15,
        })}</button></div><div class="timepicker__list" id="${listId}" role="listbox" tabindex="-1"
      aria-label="${props.label ? `${props.label}: times` : "Times"}" data-step="${String(
        step,
      )}" hidden>${slots}</div></div>
  `;
}
