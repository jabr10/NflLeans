import { loadBoard } from "@/lib/data/board";
import { SourceError } from "@/lib/data/fetchPublic";
import { WeekBoard } from "./WeekBoard";

export async function LeansSection() {
  try {
    const board = await loadBoard();
    return <WeekBoard board={board} />;
  } catch (err) {
    const message =
      err instanceof SourceError
        ? err.message
        : "The research board could not be built. The schedule above is still the public slate.";
    return (
      <div className="honest">
        <p>{message}</p>
      </div>
    );
  }
}
