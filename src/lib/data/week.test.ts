import { describe, expect, it } from "vitest";
import type { ScoreboardJson } from "./espn";
import { resolveWeekFromCalendar } from "./week";

const calendarBoard: ScoreboardJson = {
  season: { type: 2, year: 2026 },
  week: { number: 1 },
  leagues: [
    {
      season: { year: 2026, type: { type: 1, name: "Preseason" } },
      calendar: [
        {
          label: "Preseason",
          value: "1",
          startDate: "2026-08-06T07:00Z",
          endDate: "2026-09-06T06:59Z",
          entries: [
            {
              label: "Preseason Week 3",
              value: "4",
              detail: "Aug 27-Sep 5",
              startDate: "2026-08-27T07:00Z",
              endDate: "2026-09-06T06:59Z",
            },
          ],
        },
        {
          label: "Regular Season",
          value: "2",
          startDate: "2026-09-06T07:00Z",
          endDate: "2027-01-06T07:59Z",
          entries: [
            {
              label: "Week 1",
              value: "1",
              startDate: "2026-09-10T07:00Z",
              endDate: "2026-09-16T06:59Z",
            },
          ],
        },
      ],
    },
  ],
};

describe("this NFL week (America/New_York)", () => {
  it("treats 2026-08-30 as preseason week 3, not regular-season Week 1", () => {
    const resolved = resolveWeekFromCalendar(calendarBoard, new Date("2026-08-30T18:00:00Z"));
    expect(resolved.isPreseason).toBe(true);
    expect(resolved.label).toBe("Preseason Week 3");
    expect(resolved.week).toBe(4);
    expect(resolved.seasonType).toBe(1);
  });
});
