/** Usage examples for components/calendar — merged into examples/docs/usage.ts. */
import { Calendar } from "../../../components/calendar/calendar.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/calendar": [
    {
      title: "The team's month, month links as swaps",
      note:
        "`buildHref` answers prev/next with the same route; with `target` they swap the calendar in place and push history.",
      render: () =>
        Calendar({
          id: "team-calendar",
          year: 2026,
          month: 9,
          today: "2026-10-14",
          events: [
            { id: "1", date: "2026-10-06", end: "2026-10-09", title: "Offsite", tone: "info" },
            { id: "2", date: "2026-10-14", time: "11:00", title: "Design review", tone: "success", href: "/events/2" },
            { id: "3", date: "2026-10-22", time: "08:00", title: "Payroll", tone: "danger" },
          ],
          buildHref: (y, m) => `/calendar?month=${y}-${String(m + 1).padStart(2, "0")}`,
          target: "#team-calendar",
          buildDayHref: (iso) => `/events/new?on=${iso}`,
        }),
    },
  ],
};
