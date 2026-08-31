import { loadBoard } from "@/lib/data/board";
import { SourceError } from "@/lib/data/fetchPublic";
import { AppHeader } from "./AppHeader";
import { WeekBoard } from "./WeekBoard";

export async function LeansSection() {
  let board;
  try {
    board = await loadBoard();
  } catch (err) {
    const message =
      err instanceof SourceError
        ? err.message
        : "The research board could not be built.";
    return (
      <>
        <AppHeader />
        <main className="page">
          <p className="empty-page">{message}</p>
        </main>
      </>
    );
  }

  return <WeekBoard board={board} />;
}
