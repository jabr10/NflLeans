import Link from "next/link";
import { notFound } from "next/navigation";
import { GameCard } from "@/components/GameCard";
import { loadGameBoard } from "@/lib/data/board";
import { formatKickoff } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function GamePage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  const board = await loadGameBoard(id);
  if (!board) notFound();

  return (
    <main className="page">
      <Link href="/" className="back tap-target">
        ← This week
      </Link>
      <p className="eyebrow mt-4">Matchup research</p>
      <h1 className="font-display text-[2.2rem] leading-none tracking-tight">
        {board.game.away.abbr} at {board.game.home.abbr}
      </h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        {formatKickoff(board.game.kickoff)}
        {board.game.venue ? ` · ${board.game.venue}` : ""}
      </p>

      <div className="mt-6">
        <GameCard board={board} filter="all" />
      </div>

      <section className="notes">
        <h2 className="slate-title">Raw notes</h2>
        <p className="mb-3 text-[13px] text-ink-soft">
          Public source text only. NflLeans does not invent injuries or quotes.
        </p>
        {board.rawNotes.length === 0 ? (
          <p className="honest">No sourced notes for this matchup.</p>
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
  );
}
