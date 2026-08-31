import { describe, expect, it } from "vitest";
import { lastName, leanTag, pillTone } from "./leanDisplay";

describe("lean display tags", () => {
  it("uses last name for contingent elevates", () => {
    expect(
      leanTag({
        direction: "elevate",
        why: "Only if George Kittle sits. Jake Tonges Elevate Rec. George Kittle official Questionable.",
      }),
    ).toEqual({
      kind: "if-sits",
      rail: "if Kittle sits",
      context: "if Kittle sits",
    });
  });

  it("tags doubtful If-sits the same way", () => {
    expect(
      leanTag({
        direction: "elevate",
        why: "If Joe Burrow sits. Jake Browning Elevate Pass.",
      }),
    ).toMatchObject({ kind: "if-sits", rail: "if Burrow sits" });
  });

  it("labels official-Out elevates with starter OUT", () => {
    expect(
      leanTag({
        direction: "elevate",
        why: "MarShawn Lloyd Elevate Rush. Josh Jacobs official Out. Practice DNP-DNP-DNP.",
      }),
    ).toEqual({
      kind: "out",
      rail: "Jacobs OUT",
      context: "Jacobs OUT",
      badge: "OUT",
    });
  });

  it("Questionable starters are Q on the downgrade, not a self-out", () => {
    expect(
      leanTag({
        direction: "downgrade",
        why: "Thin: snap/play-risk only — do not dump the role. Puka Nacua Downgrade Rec. Puka Nacua official Questionable.",
      }),
    ).toEqual({ kind: "q", rail: "", context: "Q", badge: "Q" });
  });

  it("lastName keeps suffixes intact on the final token", () => {
    expect(lastName("Ja'Marr Chase")).toBe("Chase");
    expect(lastName("A.J. Brown")).toBe("Brown");
  });

  it("maps prop families onto Rec/Rush/Pass pill tones", () => {
    expect(pillTone("Rec")).toBe("rec");
    expect(pillTone("Sacks")).toBe("rec");
    expect(pillTone("Rush")).toBe("rush");
    expect(pillTone("TD")).toBe("rush");
    expect(pillTone("Pass")).toBe("pass");
  });
});
