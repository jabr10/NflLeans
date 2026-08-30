import { loadGameBoard } from "@/lib/data/board";
import { SourceError } from "@/lib/data/fetchPublic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const game = await loadGameBoard(id);
    if (!game) return Response.json({ error: "Game not found." }, { status: 404 });
    return Response.json(game);
  } catch (err) {
    const message = err instanceof SourceError ? err.message : "Game research unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
}
