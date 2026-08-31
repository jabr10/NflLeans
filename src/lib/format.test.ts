import { describe, expect, it } from "vitest";
import { formatAsOf, formatKickCompact, formatSlateSpan, formatWeekSpan } from "./format";

describe("display dates (America/New_York)", () => {
  it("compacts Thursday night kickoff without AM/PM", () => {
    expect(formatKickCompact("2026-09-11T00:35:00.000Z")).toBe("Thu 8:35");
  });

  it("stamps as-of with weekday, time, and ET", () => {
    expect(formatAsOf("2026-08-31T01:20:00.000Z")).toBe("Sun 9:20 PM ET");
  });

  it("renders a same-month week span with an en dash", () => {
    expect(formatWeekSpan("2026-09-10T07:00:00.000Z", "2026-09-16T06:59:00.000Z")).toBe(
      "Sep 10–16",
    );
  });

  it("uses first and last kickoff for the slate span", () => {
    expect(
      formatSlateSpan([
        { kickoff: "2026-09-12T00:20:00.000Z" },
        { kickoff: "2026-09-14T17:00:00.000Z" },
      ]),
    ).toBe("Sep 11–14");
  });
});
