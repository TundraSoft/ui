import { type Html, html } from "@tundralibs/rapid/ui";
import { renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** Monday-first, to match the rest of the library's week handling. */
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export type DatePickerProps = {
  /** Required: the panel is a swap target for month navigation. */
  id: string;
  name: string;
  /** ISO yyyy-mm-dd. */
  start?: string;
  end?: string;
  /** Month shown; defaults to the month of `start`. */
  year?: number;
  month?: number;
  today?: string;
  range?: boolean;
  min?: string;
  max?: string;
  /**
   * Server mode: month nav and day picks are GET links that rAPId swaps
   * (`outer`) into `#<id>` — the route answers with the re-rendered
   * `DatePicker`. Omit both and datepicker.js runs the calendar
   * client-side (month nav, picking, range selection) with no server.
   */
  buildMonthHref?: (year: number, month: number) => string;
  buildDayHref?: (iso: string) => string;
  presets?: { label: string; href: string }[];
  open?: boolean;
  /** Which edge of the trigger the floating panel aligns to. */
  align?: "start" | "end";
  /** Render the panel in normal flow instead of floating below the trigger. */
  inline?: boolean;
  /** Disable the trigger (and the hidden inputs). */
  disabled?: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDate(value?: string): string {
  const m = value ? ISO_RE.exec(value) : null;
  if (!m) return "";
  return `${Number(m[3])} ${SHORT[Number(m[2]) - 1] ?? "?"} ${m[1]}`;
}

const todayIso = () => {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
};

export type DatePickerPanelProps = DatePickerProps;

/**
 * The calendar panel alone — what a route returns for a swap of
 * `#<id>-panel`, and what datepicker.js re-renders client-side.
 */
export function DatePickerPanel(props: DatePickerPanelProps): Html {
  const today = props.today ?? todayIso();
  const anchor = props.start ?? today;
  const year = props.year ?? Number(anchor.slice(0, 4));
  const month = props.month ?? Number(anchor.slice(5, 7)) - 1;

  const len = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const prevLen = new Date(year, month, 0).getDate();
  const cells = Math.ceil((lead + len) / 7) * 7;

  const days: Html[] = [];
  for (let i = 0; i < cells; i++) {
    const offset = i - lead + 1;
    let y = year, m = month, d = offset;
    if (offset < 1) {
      m = month - 1;
      d = prevLen + offset;
      if (m < 0) {
        m = 11;
        y--;
      }
    } else if (offset > len) {
      m = month + 1;
      d = offset - len;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    const key = iso(y, m, d);
    const outside = offset < 1 || offset > len;
    const disabled = Boolean((props.min && key < props.min) || (props.max && key > props.max));
    const isStart = key === props.start;
    const isEnd = key === props.end;
    const between = !!props.start && !!props.end && key > props.start && key < props.end;
    const cls = cx(
      "datepicker__day",
      outside && "datepicker__day--outside",
      key === today && "datepicker__day--today",
      between && "datepicker__day--in-range",
      isStart && "datepicker__day--start",
      isEnd && "datepicker__day--end",
    );
    const a11y = {
      "aria-label": `${d} ${MONTHS[m]} ${y}`,
      "aria-current": key === today ? "date" : undefined,
      "aria-pressed": isStart || isEnd ? "true" : undefined,
    };

    days.push(
      props.buildDayHref && !disabled
        ? html`
          <a class="${cls}" href="${props.buildDayHref(key)}" data-day="${key}" data-action="${props.buildDayHref(
            key,
          )}" data-target="#${props.id}"
            data-swap="outer" data-push${renderAttrs(a11y)}>${d}</a>
        `
        : html`
          <button type="button" class="${cls}" data-day="${key}" ${renderAttrs({
            ...a11y,
            disabled: disabled ? "" : undefined,
          })}>${d}</button>
        `,
    );
  }

  const prev = month === 0 ? [year - 1, 11] : [year, month - 1];
  const next = month === 11 ? [year + 1, 0] : [year, month + 1];

  const prevYear = [year - 1, month];
  const nextYear = [year + 1, month];

  // `data-nav` names the step so datepicker.js can retarget every button
  // after a client-side month change; the server links carry it inertly.
  const nav = (ym: number[], step: string, label: string, icon: Html) => {
    const href = props.buildMonthHref?.(ym[0], ym[1]);
    return href
      ? html`
        <a class="datepicker__nav" href="${href}" aria-label="${label}" data-nav="${step}" data-action="${href}"
          data-target="#${props.id}" data-swap="outer">${icon}</a>
      `
      : html`
        <button type="button" class="datepicker__nav" aria-label="${label}" data-nav="${step}"
          data-month="${ym[0]}-${ym[1]}">${icon}</button>
      `;
  };

  return html`
    <div
      class="datepicker__header"><span class="datepicker__nav-group">${nav(
        prevYear,
        "prev-year",
        "Previous year",
        Icon("chevronsLeft", { size: 14 }),
      )}${nav(
        prev,
        "prev",
        "Previous month",
        Icon("chevronLeft", { size: 14 }),
      )}</span><span class="datepicker__month" aria-live="polite">${MONTHS[
        month
      ]} ${year}</span><span class="datepicker__nav-group">${nav(
        next,
        "next",
        "Next month",
        Icon("chevronRight", { size: 14 }),
      )}${nav(
        nextYear,
        "next-year",
        "Next year",
        Icon("chevronsRight", { size: 14 }),
      )}</span></div><div
      class="datepicker__grid">
      <div class="datepicker__weekdays" aria-hidden="true">${WEEKDAYS.map((w) =>
        html`<span class="datepicker__weekday">${w}</span>`
      )}</div>
      <div class="datepicker__days">${days}</div>
    </div>${props.presets?.length
      ? html`<div class="datepicker__footer">${
        props.presets.map((p) =>
          html`
            <a class="datepicker__preset" href="${p.href}" data-action="${p.href}" data-target="#${props
              .id}" data-swap="outer"
              data-push>${p.label}</a>
          `
        )
      }<button type="submit" class="datepicker__apply">Apply</button></div>`
      : ""}
  `;
}

export function DatePicker(props: DatePickerProps): Html {
  const serverMode = Boolean(props.buildDayHref || props.buildMonthHref);
  const triggerLabel = props.range
    ? `${formatDate(props.start) || "Start date"} – ${formatDate(props.end) || "End date"}`
    : formatDate(props.start);

  return html`
    <div class="${cx(
      "datepicker",
      props.align === "end" && "datepicker--end",
      props.inline && "datepicker--inline",
      props.open && "datepicker--open",
    )}" id="${props.id}"
      data-datepicker${renderAttrs({
        // Client-mode state, read by datepicker.js when it re-renders.
        "data-datepicker-range": props.range ? "" : undefined,
        "data-datepicker-min": props.min,
        "data-datepicker-max": props.max,
        "data-datepicker-today": props.today,
        "data-datepicker-server": serverMode ? "" : undefined,
      })}><button type="button" class="datepicker__trigger"${props.disabled
        ? html`
          disabled
        `
        : ""} aria-expanded="${props.open ? "true" : "false"}" aria-controls="${props
        .id}-panel" data-datepicker-trigger${renderAttrs({
          "aria-label": triggerLabel ? undefined : "Pick a date",
        })}><span class="datepicker__trigger-icon">${Icon("calendar", {
          size: 15,
        })}</span><span data-datepicker-label>${triggerLabel ||
        "Pick a date"}</span></button><input type="hidden" name="${props.name}" value="${props.start ??
        ""}" data-datepicker-start>${props.range
        ? html`<input type="hidden" name="${props.name}_end" value="${props.end ?? ""}" data-datepicker-end>`
        : ""}<div class="datepicker__panel" id="${props.id}-panel" role="group" aria-label="Calendar"${props.open
        ? ""
        : html`
          hidden
        `}>${DatePickerPanel(props)}</div></div>
  `;
}
