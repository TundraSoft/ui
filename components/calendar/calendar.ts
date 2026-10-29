import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type CalendarTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

/** Which day begins the week. */
export type CalendarWeekStart = "sunday" | "monday";

export type CalendarEvent = {
  id: string;
  /** ISO day (`2026-10-14`). */
  date: string;
  /** ISO day of a multi-day event's last day; it fills every day in between. */
  end?: string;
  title: string;
  /** The chip links here. */
  href?: string;
  /** @default "neutral" */
  tone?: CalendarTone;
  /** Shown before the title (`"09:30"`). */
  time?: string;
};

export type CalendarProps = {
  /** Required: the region a month swap replaces, and the base of every inner id. */
  id: string;
  year: number;
  /** 0-based, like `Date`. */
  month: number;
  events: CalendarEvent[];
  /** ISO day that gets the today ring. Omit and no day is marked — the server knows the date, not this template. */
  today?: string;
  /** @default "monday" */
  weekStart?: CalendarWeekStart;
  /** Prev/next month links — `(year, month) => url`; implement with `withQuery()` so other params survive. */
  buildHref?: (year: number, month: number) => string;
  /**
   * Make the month links rAPId swaps of this selector (`#<id>`, outer,
   * pushed to history) instead of full navigations.
   */
  target?: string;
  /** A day number becomes a link here (`(iso) => url`) — a day view, a "new event on" form. */
  buildDayHref?: (iso: string) => string;
  /** Chips shown per day before the rest fold into "+N more". @default 3 */
  maxEvents?: number;
  /** Wording; `{n}` in `more` stands for the number. */
  labels?: { today?: string; more?: string; prev?: string; next?: string };
  /** Extra attributes on the root; a `class` merges. */
  attrs?: Attrs;
};

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
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A month of events: a 7-column grid with a weekday header, leading and
 * trailing days from the neighbouring months muted, today ringed
 * (`aria-current="date"`), events as tone-coloured chips stacked in their
 * day (multi-day events fill each day), the overflow folded into a
 * "+N more" button calendar.js unfolds. Below 768px the grid becomes a
 * list of the days that have events. Month navigation is links the
 * server answers (a rAPId swap with `target`), so the whole thing works
 * without JS.
 */
export function Calendar(props: CalendarProps): Html {
  const { year, month } = props;
  const labels = { today: "Today", more: "+{n} more", prev: "Previous month", next: "Next month", ...props.labels };
  const maxEvents = props.maxEvents ?? 3;
  const mondayFirst = (props.weekStart ?? "monday") === "monday";
  const dayNames = mondayFirst ? DAYS : [DAYS[6], ...DAYS.slice(0, 6)];

  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() - (mondayFirst ? 1 : 0) + 7) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;

  // Events per ISO day, multi-day spans expanded.
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of props.events) {
    const start = new Date(`${event.date}T00:00:00Z`);
    const end = event.end ? new Date(`${event.end}T00:00:00Z`) : start;
    for (let t = start.getTime(); t <= end.getTime() && t - start.getTime() < 366 * 86400000; t += 86400000) {
      const key = new Date(t).toISOString().slice(0, 10);
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
  }

  const prev = month === 0 ? [year - 1, 11] : [year, month - 1];
  const next = month === 11 ? [year + 1, 0] : [year, month + 1];
  const navLink = (to: number[], label: string, icon: "chevronLeft" | "chevronRight") => {
    if (!props.buildHref) return "";
    const href = props.buildHref(to[0], to[1]);
    return html`
      <a class="btn btn--ghost btn--sm btn--icon calendar__nav" href="${href}" aria-label="${label}" ${renderAttrs({
        "data-action": props.target ? href : undefined,
        "data-target": props.target,
        "data-swap": props.target ? "outer" : undefined,
        "data-push": props.target ? "" : undefined,
      })}
      >${Icon(icon, { size: 16 })}</a>
    `;
  };

  const chip = (event: CalendarEvent, hidden: boolean) => {
    const tone = event.tone ?? "neutral";
    const body = html`
      ${event.time && html`
        <span class="calendar__time">${event.time}</span>
      `}<span
        class="calendar__event-title"
      >${event.title}</span>
    `;
    const cls = cx("calendar__event", tone !== "neutral" && `calendar__event--${tone}`);
    return event.href
      ? html`
        <a class="${cls}" href="${event.href}" ${renderAttrs({ hidden: hidden ? "" : undefined })}>${body}</a>
      `
      : html`
        <span class="${cls}" ${renderAttrs({ hidden: hidden ? "" : undefined })}>${body}</span>
      `;
  };

  const cells: Html[] = [];
  for (let i = 0; i < total; i++) {
    const offset = i - lead;
    const date = new Date(Date.UTC(year, month, offset + 1));
    const key = date.toISOString().slice(0, 10);
    const inMonth = offset >= 0 && offset < daysInMonth;
    const events = byDay.get(key) ?? [];
    const isToday = props.today === key;
    const shown = events.slice(0, maxEvents);
    const rest = events.slice(maxEvents);
    const dayNo = date.getUTCDate();
    const dayLabel = `${dayNo} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    const number = props.buildDayHref
      ? html`
        <a class="calendar__day-number" href="${props.buildDayHref(key)}" aria-label="${dayLabel}">${dayNo}</a>
      `
      : html`
        <span class="calendar__day-number" aria-label="${dayLabel}">${dayNo}</span>
      `;
    cells.push(html`
      <div class="${cx(
        "calendar__day",
        !inMonth && "calendar__day--outside",
        isToday && "calendar__day--today",
        events.length === 0 && "calendar__day--empty",
      )}" role="gridcell" data-date="${key}" ${renderAttrs({ "aria-current": isToday ? "date" : undefined })}>
        <div class="calendar__day-head">${number}${isToday &&
          html`
            <span class="calendar__today-label">${labels.today}</span>
          `}</div>
        <div class="calendar__events">${shown.map((e) => chip(e, false))}${rest.map((e) => chip(e, true))}${rest.length
          ? html`
            <button type="button" class="calendar__more" data-calendar-more aria-expanded="false">${labels.more
              .replace("{n}", String(rest.length))}</button>
          `
          : ""}</div>
      </div>
    `);
  }

  // Rows of seven: a grid's cells must sit in role=row parents.
  const weeks: Html[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(html`
      <div class="calendar__week" role="row">${cells.slice(i, i + 7)}</div>
    `);
  }

  const titleId = `${props.id}-title`;
  return html`
    <div ${classAttrs("calendar", mergeAttrs(props.attrs, { id: props.id }))} data-calendar>
      <div class="calendar__header">
        <h2 class="calendar__title" id="${titleId}">${MONTHS[month]} ${String(year)}</h2>
        <div class="calendar__actions">${navLink(prev, labels.prev, "chevronLeft")}${navLink(
          next,
          labels.next,
          "chevronRight",
        )}</div>
      </div>
      <div class="calendar__grid" role="grid" aria-labelledby="${titleId}">
        <div class="calendar__weekdays" role="row">${dayNames.map((d) =>
          html`
            <div class="calendar__weekday" role="columnheader">${d}</div>
          `
        )}</div>
        <div class="calendar__days">${weeks}</div>
      </div>
    </div>
  `;
}
