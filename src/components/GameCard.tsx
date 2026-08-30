import Link from "next/link";
import type { GameBoard } from "@/lib/data/board";
import { formatKickoff } from "@/lib/format";
import { LeanRow } from "./LeanRow";

export function GameCard({
  board,
  filter,
}: {
  board: GameBoard;
  filter: "all" | "elevated" | "downgraded";
}) {
  const elevates = filter === "downgraded" ? [] : board.elevates;
  const downgrades = filter === "elevated" ? [] : board.downgrades;
  const { game } = board;

  return (
    <section className="game-card">
      <Link href={`/game/${game.id}`} className="game-card-head tap-target">
        <div className="flex items-center gap-3">
          {game.away.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.away.logo} alt="" width={28} height={28} className="h-7 w-7" />
          ) : null}
          <span className="font-display text-2xl leading-none tracking-tight">
            {game.away.abbr}
          </span>
          <span className="text-[12px] uppercase tracking-[0.16em] text-ink-soft">at</span>
          {game.home.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.home.logo} alt="" width={28} height={28} className="h-7 w-7" />
          ) : null}
          <span className="font-display text-2xl leading-none tracking-tight">
            {game.home.abbr}
          </span>
        </div>
        <p className="mt-2 text-[13px] text-ink-soft">
          {formatKickoff(game.kickoff)}
          {game.completed ? " · Final" : ""}
          {game.statusText && !game.completed ? ` · ${game.statusText}` : ""}
        </p>
      </Link>

      {elevates.length === 0 && downgrades.length === 0 ? (
        <p className="empty-pile">No injury-driven leans for this matchup.</p>
      ) : (
        <div className="piles">
          {filter !== "downgraded" ? (
            <div>
              <h3 className="pile-label pile-up">Elevates · {elevates.length}</h3>
              <div className="stack">
                {elevates.map((lean) => (
                  <LeanRow key={lean.id} lean={lean} />
                ))}
                {elevates.length === 0 ? <p className="empty-pile">Empty pile.</p> : null}
              </div>
            </div>
          ) : null}
          {filter !== "elevated" ? (
            <div>
              <h3 className="pile-label pile-down">Downgrades · {downgrades.length}</h3>
              <div className="stack">
                {downgrades.map((lean) => (
                  <LeanRow key={lean.id} lean={lean} />
                ))}
                {downgrades.length === 0 ? <p className="empty-pile">Empty pile.</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
