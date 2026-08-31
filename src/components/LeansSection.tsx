import { loadBoard } from "@/lib/data/board";
import { SourceError } from "@/lib/data/fetchPublic";
import { WeekBoard } from "./WeekBoard";

export async function LeansSection() {
  let board;
  let message: string | undefined;
  try {
    board = await loadBoard();
  } catch (err) {
    message =
      err instanceof SourceError
        ? err.message
        : "The research board could not be built.";
  }

  if (!board) {
    return <WeekBoard board={null} error={message} />;
  }

  return <WeekBoard board={board} />;
}
