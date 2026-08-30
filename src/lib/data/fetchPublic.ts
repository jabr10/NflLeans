import { readCache, writeCache } from "./cache";

const UA = "NflLeans/1.0 (weekly research; +https://github.com/jabr10/NflLeans)";

export class SourceError extends Error {
  constructor(
    message: string,
    readonly source: string,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export async function fetchPublicJson<T>(
  url: string,
  opts: {
    cacheKey: string;
    ttlMs: number;
    timeoutMs?: number;
    source: string;
  },
): Promise<T> {
  const cached = await readCache<T>(opts.cacheKey);
  if (cached !== null) return cached;

  const timeoutMs = opts.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
      next: { revalidate: Math.max(60, Math.round(opts.ttlMs / 1000)) },
    });
    if (!res.ok) {
      throw new SourceError(`${opts.source} returned ${res.status}`, opts.source);
    }
    const data = (await res.json()) as T;
    await writeCache(opts.cacheKey, data, opts.ttlMs);
    return data;
  } catch (err) {
    if (err instanceof SourceError) throw err;
    const message = err instanceof Error ? err.message : "request failed";
    throw new SourceError(`${opts.source} failed: ${message}`, opts.source);
  } finally {
    clearTimeout(timer);
  }
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
