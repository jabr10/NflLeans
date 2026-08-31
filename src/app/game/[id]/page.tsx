import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { PileColumn } from "@/components/PileColumn";
import { loadGameBoard } from "@/lib/data/board";
import { formatKickCompact } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function GamePage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  const board = await loadGameBoard(id);
  if (!board) notFound();

  const elevates = board.elevates.map((lean) => ({ lean, game: board.game }));
  const downgrades = board.downgrades.map((lean) => ({ lean, game: board.game }));

  return (
    <>
      <AppHeader />
      <main className="page">
        <Link href="/" className="back">
          ← This week
        </Link>
        <h1 className="match-title">
          {board.game.away.abbr} @ {board.game.home.abbr}
        </h1>
        <p className="empty-page" style={{ marginTop: 6 }}>
          {formatKickCompact(board.game.kickoff)}
          {board.game.venue ? ` · ${board.game.venue}` : ""}
        </p>

        <div className="columns" style={{ marginTop: 16 }}>
          <PileColumn
            kind="elevates"
            count={elevates.length}
            rows={elevates}
            empty="No elevates for this matchup."
          />
          <PileColumn
            kind="downgrades"
            count={downgrades.length}
            rows={downgrades}
            empty="No downgrades for this matchup."
          />
        </div>

        <section className="notes">
          <h2 className="pile-label" style={{ color: "var(--mute)", marginBottom: 8 }}>
            RAW NOTES
          </h2>
          <p className="empty-line" style={{ padding: 0, marginBottom: 10 }}>
            Public source text only. Footage does not invent injuries or quotes.
          </p>
          {board.rawNotes.length === 0 ? (
            <p className="empty-page">No sourced notes for this matchup.</p>
          ) : (
            <ul className="note-list">
              {board.rawNotes.map((note, i) => (
                <li key={`${note.source}-${i}`}>
                  {note.player ? <strong>{note.player}. </strong> : null}
                  {note.team && !note.player ? <strong>{note.team}. </strong> : null}
                  {note.text}
                  <span className="note-src"> {note.source}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
