import { loadSchedule } from "@/lib/data/week";
import { SourceError } from "@/lib/data/fetchPublic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const week = await loadSchedule();
    return Response.json(week);
  } catch (err) {
    const message = err instanceof SourceError ? err.message : "Schedule unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
}
