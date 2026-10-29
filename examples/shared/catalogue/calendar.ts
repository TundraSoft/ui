/** Catalogue cases for components/calendar — see examples/shared/catalogue.ts. */
import { Calendar, type CalendarEvent } from "../../../components/calendar/calendar.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const tones = ["neutral", "accent", "success", "warning", "danger", "info"] as const;
const weekStarts = ["sunday", "monday"] as const;

const events: CalendarEvent[] = [
  { id: "e1", date: "2026-10-01", title: "Sprint planning", time: "09:30", tone: "accent", href: "#e1" },
  { id: "e2", date: "2026-10-06", end: "2026-10-09", title: "Offsite in Lisbon", tone: "info" },
  { id: "e3", date: "2026-10-14", title: "Invoice run", time: "02:00", tone: "neutral" },
  { id: "e4", date: "2026-10-14", title: "Design review", time: "11:00", tone: "success", href: "#e4" },
  { id: "e5", date: "2026-10-14", title: "1:1 with Priya", time: "14:00", tone: "neutral" },
  { id: "e6", date: "2026-10-14", title: "Release 0.25", time: "16:00", tone: "warning" },
  { id: "e7", date: "2026-10-14", title: "Retro", time: "17:00", tone: "danger" },
  { id: "e8", date: "2026-10-22", title: "Payroll", time: "08:00", tone: "danger" },
  { id: "e9", date: "2026-10-28", end: "2026-10-30", title: "Conference", tone: "accent" },
  { id: "e10", date: "2026-11-02", title: "Next month leaks in", tone: "neutral" },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  const month = (y: number, m: number) => `?month=${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    name: "calendar",
    cases: [
      caseOf(
        `every tone, a multi-day span, "+2 more" on the 14th, today ringed, day numbers link (#cat-cal-month; tones: ${
          tones.join(", ")
        })`,
        Calendar({
          id: "cat-cal-month",
          year: 2026,
          month: 9,
          today: "2026-10-14",
          events,
          buildHref: month,
          buildDayHref: (iso) => `?day=${iso}`,
          labels: { more: "+{n} more" },
        }),
      ),
      ...weekStarts.map((weekStart) =>
        caseOf(
          `weekStart ${weekStart}, month links as swaps, maxEvents 1`,
          Calendar({
            id: `cat-cal-${weekStart}`,
            year: 2026,
            month: 9,
            weekStart,
            events: events.slice(0, 4),
            maxEvents: 1,
            buildHref: month,
            target: `#cat-cal-${weekStart}`,
          }),
        )
      ),
    ],
  };
}
