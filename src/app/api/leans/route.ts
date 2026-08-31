import { wantsFresh } from "@/lib/boardRefresh";
import { loadBoard } from "@/lib/data/board";
import { runFresh, SourceError } from "@/lib/data/fetchPublic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const board = wantsFresh(request) ? await runFresh(loadBoard) : await loadBoard();
    return Response.json(board);
  } catch (err) {
    const message = err instanceof SourceError ? err.message : "Leans unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
}
