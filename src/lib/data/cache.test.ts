import { describe, expect, it } from "vitest";
import { readCache, writeCache } from "./cache";

describe("file cache", () => {
  it("round-trips a value and never throws on write", async () => {
    await expect(writeCache("spec-roundtrip", { ok: true }, 60_000)).resolves.toBeUndefined();
    await expect(readCache<{ ok: boolean }>("spec-roundtrip")).resolves.toEqual({ ok: true });
  });
});
