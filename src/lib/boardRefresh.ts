import type { ResearchBoard } from "@/lib/data/types";

export const PULL_THRESHOLD = 64;
export const PULL_MAX = 112;
export const REFRESH_SLOT = 52;

export function resistedPull(dy: number, max = PULL_MAX): number {
  if (dy <= 0) return 0;
  return Math.min(max, dy * 0.5);
}

export function wantsFresh(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.get("fresh") === "1") return true;
  const cc = request.headers.get("cache-control") ?? "";
  return /\bno-cache\b/i.test(cc);
}

export function isResearchBoard(data: unknown): data is ResearchBoard {
  if (!data || typeof data !== "object") return false;
  const board = data as ResearchBoard;
  return Array.isArray(board.games) && Boolean(board.thisWeek) && typeof board.asOf === "string";
}

export async function fetchLiveBoard(): Promise<ResearchBoard> {
  const res = await fetch("/api/leans?fresh=1", { cache: "no-store" });
  const data: unknown = await res.json().catch(() => null);
  if (!isResearchBoard(data)) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Could not refresh the board.";
    throw new Error(message);
  }
  return data;
}
