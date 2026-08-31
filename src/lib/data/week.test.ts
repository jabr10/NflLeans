import { describe, expect, it } from "vitest";
import { exhibitionChip } from "@/lib/boardCopy";
import type { ScoreboardJson } from "./espn";
import {
  nextWeekAfter,
  resolveBettingWeek,
  resolveWeekFromCalendar,
  shouldAdvanceSlate,
  type BoardGame,
} from "./week";

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
            {
              label: "Week 2",
              value: "2",
              startDate: "2026-09-16T07:00Z",
              endDate: "2026-09-23T06:59Z",
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

  it("selects Week 1 as the betting slate while the calendar is still preseason", () => {
    const betting = resolveBettingWeek(calendarBoard, new Date("2026-08-30T18:00:00Z"));
    expect(betting.isPreseason).toBe(false);
    expect(betting.label).toBe("Week 1");
    expect(betting.week).toBe(1);
    expect(betting.seasonType).toBe(2);
    expect(betting.startDate).toBe("2026-09-10T07:00Z");
  });

  it("advances from a fully completed Week 1 to Week 2", () => {
    const week1 = resolveBettingWeek(calendarBoard, new Date("2026-09-11T18:00:00Z"));
    const next = nextWeekAfter(calendarBoard, week1);
    expect(next?.label).toBe("Week 2");
    expect(
      shouldAdvanceSlate([
        { completed: true } as BoardGame,
        { completed: true } as BoardGame,
      ]),
    ).toBe(true);
    expect(shouldAdvanceSlate([])).toBe(false);
    expect(shouldAdvanceSlate([{ completed: false } as BoardGame])).toBe(false);
  });

  it("writes the preseason chip without listing a 16-game schedule", () => {
    expect(
      exhibitionChip({
        exhibition: { completed: 16, total: 16 },
        weekLabel: "Week 1",
        hasSlate: true,
      }),
    ).toBe("16 exhibitions final — Week 1 board is live.");
    expect(
      exhibitionChip({
        exhibition: { completed: 16, total: 16 },
        weekLabel: "Week 1",
        hasSlate: false,
      }),
    ).toBe("16 exhibitions final.");
  });
});
