import { describe, expect, it } from "vitest";
import {
  PULL_THRESHOLD,
  isResearchBoard,
  resistedPull,
  wantsFresh,
} from "./boardRefresh";

describe("pull distance", () => {
  it("rubber-bands downward pull and ignores upward", () => {
    expect(resistedPull(-20)).toBe(0);
    expect(resistedPull(0)).toBe(0);
    expect(resistedPull(80)).toBe(40);
    expect(resistedPull(400)).toBeLessThanOrEqual(112);
  });

  it("arms once resisted pull reaches the threshold", () => {
    expect(resistedPull(PULL_THRESHOLD * 2)).toBe(PULL_THRESHOLD);
  });
});

describe("fresh board request", () => {
  it("treats fresh=1 and Cache-Control: no-cache as a live fetch", () => {
    expect(wantsFresh(new Request("http://footage.test/api/leans"))).toBe(false);
    expect(wantsFresh(new Request("http://footage.test/api/leans?fresh=1"))).toBe(true);
    expect(
      wantsFresh(
        new Request("http://footage.test/api/leans", { headers: { "Cache-Control": "no-cache" } }),
      ),
    ).toBe(true);
  });
});

describe("research board payload", () => {
  it("accepts a live /api/leans body and rejects error payloads", () => {
    expect(isResearchBoard({ error: "Leans unavailable." })).toBe(false);
    expect(
      isResearchBoard({
        thisWeek: { games: [] },
        games: [],
        asOf: "2026-08-31T02:00:00.000Z",
      }),
    ).toBe(true);
  });
});
