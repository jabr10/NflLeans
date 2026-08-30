import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

function cacheRoot(): string {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return "/tmp/nflleans-cache";
  }
  return join(process.cwd(), ".cache/nflleans");
}

function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

interface Envelope<T> {
  expiresAt: number;
  value: T;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await readFile(join(cacheRoot(), `${safeKey(key)}.json`), "utf8");
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || typeof env.expiresAt !== "number") return null;
    if (Date.now() > env.expiresAt) return null;
    return env.value;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const dir = cacheRoot();
    await mkdir(dir, { recursive: true });
    const env: Envelope<T> = { expiresAt: Date.now() + ttlMs, value };
    await writeFile(join(dir, `${safeKey(key)}.json`), JSON.stringify(env), "utf8");
  } catch {
    // Never crash the request because /tmp or .cache is not writable.
  }
}
