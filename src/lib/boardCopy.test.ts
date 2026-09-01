import { describe, expect, it } from "vitest";
import { PRODUCT_TAGLINE } from "./boardCopy";

describe("product tagline", () => {
  it("is the exact one-line board description", () => {
    expect(PRODUCT_TAGLINE).toBe("Who should see more playing time this week.");
  });
});
