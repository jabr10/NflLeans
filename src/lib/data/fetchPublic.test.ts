import { afterEach, describe, expect, it, vi } from "vitest";
import { writeCache, readCache } from "./cache";
import { fetchPublicJson, isFreshRequest, runFresh } from "./fetchPublic";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fresh ESPN reads", () => {
  it("marks only the runFresh subtree", async () => {
    expect(isFreshRequest()).toBe(false);
    await runFresh(async () => {
      expect(isFreshRequest()).toBe(true);
    });
    expect(isFreshRequest()).toBe(false);
  });

  it("skips a warm file cache when runFresh is set", async () => {
    const key = "fresh-skip-cache";
    await writeCache(key, { from: "cache" }, 60_000);
    await expect(readCache(key)).resolves.toEqual({ from: "cache" });

    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ from: "net" }), { status: 200 }));

    const warm = await fetchPublicJson<{ from: string }>("https://example.test/json", {
      cacheKey: key,
      ttlMs: 60_000,
      source: "test",
    });
    expect(warm).toEqual({ from: "cache" });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    const live = await runFresh(() =>
      fetchPublicJson<{ from: string }>("https://example.test/json", {
        cacheKey: key,
        ttlMs: 60_000,
        source: "test",
      }),
    );
    expect(live).toEqual({ from: "net" });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});
