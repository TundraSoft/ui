import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { DatePicker } from "../datepicker/datepicker.ts";
import { TimePicker, type TimePickerMessages } from "../timepicker/timepicker.ts";

/** A one-click value: `value` is an ISO instant (`2026-10-01T09:00:00Z`). See `dateTimePresets()`. */
export type DateTimePreset = { label: string; value: string };

export type DateTimePickerMessages = TimePickerMessages & {
  /** A time without a date (or `required` and no date). Default "Pick a date." */
  date?: string;
};

export type DateTimePickerProps = {
  /** Required: the date part is `<id>-date`, the time part `<id>-time` (its hours segment — point a label there). */
  id: string;
  /**
   * The hidden input that posts the value as one ISO UTC instant
   * (`2026-10-01T09:00:00Z`). The parts post too, as `<name>-date` and
   * `<name>-time` — all a no-JS page can send; `dateTimeFrom()`
   * (`@tundralibs/ui/shared/compose`) reads either.
   */
  name: string;
  /** An ISO instant. Without a zone designator it is read as UTC. */
  value?: string;
  /** Earliest instant accepted (ISO); earlier days are disabled, and on that day earlier times. */
  min?: string;
  /** Latest instant accepted (ISO). */
  max?: string;
  /** Minutes between the time slots (default 15). */
  step?: number;
  /**
   * The parts are the viewer's own wall time: the script converts the
   * value and bounds into the browser's zone, names it in the zone chip,
   * and posts the UTC instant. Default: the parts are UTC.
   */
  local?: boolean;
  /** The zone chip's text. Default `"UTC"` (in `local` mode the script replaces it with the browser's zone). */
  zone?: string;
  /** One-click values under the fields (`dateTimePresets(now)` builds the usual three). Shown only with JS. */
  presets?: DateTimePreset[];
  /** Today's date for the calendar (ISO `yyyy-mm-dd`); defaults to the clock. */
  today?: string;
  required?: boolean;
  disabled?: boolean;
  /** Paint the error state (a server-side `RapidFormError` for this field). */
  invalid?: boolean;
  /** Which edge the floating panels align to. */
  align?: "start" | "end";
  messages?: DateTimePickerMessages;
  /** Extra attributes for the root (a caller's `class` is merged). */
  attrs?: Attrs;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** An ISO string as a Date; a value with no zone designator is UTC. */
function instant(value?: string): Date | undefined {
  if (!value) return undefined;
  const zoned = /(?:Z|[+-]\d\d:?\d\d)$/i.test(value) ? value : `${value}Z`;
  const d = new Date(zoned);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** A Date as `2026-10-01T09:00:00Z` (whole minutes). */
export function toUtcIso(date: Date): string {
  return `${date.toISOString().slice(0, 16)}:00Z`;
}

/** An ISO string normalised to `toUtcIso`, or undefined when it does not parse. */
const normal = (value?: string) => {
  const d = instant(value);
  return d ? toUtcIso(d) : undefined;
};

/** UTC `yyyy-mm-dd` and `HH:MM` of an ISO instant. */
export function utcParts(value?: string): { date: string; time: string } | undefined {
  const d = instant(value);
  if (!d) return undefined;
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

export type DateTimePresetOptions = {
  /** The time "Tomorrow" lands on, UTC `HH:MM` (default `"09:00"`). */
  time?: string;
  labels?: { tomorrow?: string; week?: string; monthEnd?: string };
};

/**
 * The usual three presets, computed from `now` on the server (pass the
 * request's clock; a fixed date in tests): tomorrow at `time` UTC, one
 * week from now (to the minute), and the last minute of this month
 * (23:59 UTC on its last day).
 */
export function dateTimePresets(now: Date, options: DateTimePresetOptions = {}): DateTimePreset[] {
  const time = options.time ?? "09:00";
  const [h, m] = time.split(":").map(Number);
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, h, m));
  const week = new Date(Math.floor(now.getTime() / 60000) * 60000 + 7 * 86400000);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59));
  return [
    { label: options.labels?.tomorrow ?? `Tomorrow ${time}`, value: toUtcIso(tomorrow) },
    { label: options.labels?.week ?? "In 1 week", value: toUtcIso(week) },
    { label: options.labels?.monthEnd ?? "End of month", value: toUtcIso(monthEnd) },
  ];
}

/**
 * A date and a time as one control that posts one ISO UTC instant: a
 * `DatePicker` (client mode) beside a `TimePicker`, a zone chip, and
 * optional one-click presets. datetimepicker.js joins the parts into the
 * `name` input on every change, moves the time bounds when the date is
 * the first or last allowed day, reports a missing half through the time
 * picker's validity, and — with `local` — shows and edits the value in
 * the viewer's zone. The server must check the bounds too.
 */
export function DateTimePicker(props: DateTimePickerProps): Html {
  const parts = utcParts(props.value);
  const lo = utcParts(props.min);
  const hi = utcParts(props.max);
  const date = parts?.date;
  const msg = props.messages ?? {};
  const presets = (props.presets ?? []).flatMap((p) => {
    const value = normal(p.value);
    return value ? [{ label: p.label, value }] : [];
  });

  const rootAttrs: Attrs = {
    ...props.attrs,
    id: props.id,
    "data-datetimepicker": "",
    "data-datetimepicker-local": props.local ? "" : undefined,
    // The chip says UTC until the script can name the viewer's zone.
    "data-datetimepicker-zone": props.local && !props.zone ? "auto" : undefined,
    "data-datetimepicker-min": normal(props.min),
    "data-datetimepicker-max": normal(props.max),
    "data-datetimepicker-required": props.required ? "" : undefined,
    "data-msg-date": msg.date,
  };

  return html`
    <div
      ${classAttrs(
        cx("datetimepicker", props.invalid && "datetimepicker--invalid"),
        rootAttrs,
      )}><div class="datetimepicker__fields">${DatePicker({
        id: `${props.id}-date`,
        name: `${props.name}-date`,
        start: date,
        min: lo?.date,
        max: hi?.date,
        today: props.today,
        align: props.align,
        disabled: props.disabled,
      })}${TimePicker({
        id: `${props.id}-time`,
        name: `${props.name}-time`,
        value: parts?.time,
        step: props.step,
        min: lo && date === lo.date ? lo.time : undefined,
        max: hi && date === hi.date ? hi.time : undefined,
        required: props.required,
        disabled: props.disabled,
        invalid: props.invalid,
        zone: props.zone ?? "UTC",
        align: props.align,
        messages: msg,
      })}</div><input type="hidden" name="${props.name}" value="${normal(
        props.value,
      ) ?? ""}" data-datetime-value disabled>${presets.length
        ? html`<div class="datetimepicker__presets js-only" role="group" aria-label="Presets">${
          presets.map((p) =>
            html`
              <button type="button" class="datetimepicker__preset" ${renderAttrs({
                "data-datetime-preset": p.value,
                disabled: props.disabled ? "" : undefined,
              })}>${p.label}</button>
            `
          )
        }</div>`
        : ""}</div>
  `;
}
