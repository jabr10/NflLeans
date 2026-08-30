"use client";

import { useMemo, useState } from "react";
import type { ResearchBoard } from "@/lib/data/board";
import { formatAsOf } from "@/lib/format";
import { GameCard } from "./GameCard";

type Filter = "all" | "elevated" | "downgraded";

export function WeekBoard({ board }: { board: ResearchBoard }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const thisIds = new Set(board.thisWeek.games.map((g) => g.id));
  const extraIds = new Set(board.extraWeeks.flatMap((w) => w.games.map((g) => g.id)));

  const visible = useMemo(() => {
    return board.games.filter((g) => {
      const rows = [...g.elevates, ...g.downgrades];
      if (q && !rows.some((r) => r.player.toLowerCase().includes(q))) return false;
      if (filter === "elevated" && g.elevates.length === 0 && q === "") return true;
      if (filter === "downgraded" && g.downgrades.length === 0 && q === "") return true;
      return true;
    });
  }, [board.games, filter, q]);

  const thisWeekGames = visible.filter((g) => thisIds.has(g.game.id));
  const extraGames = visible.filter((g) => extraIds.has(g.game.id) && !thisIds.has(g.game.id));

  const week = board.thisWeek.resolved;
  const emptyThisWeek =
    thisWeekGames.every((g) => g.elevates.length === 0 && g.downgrades.length === 0) ||
    week.isPreseason;

  return (
    <div>
      <div className="toolbar">
        <div className="filters" role="tablist" aria-label="Lean direction">
          {(
            [
              ["all", "All"],
              ["elevated", "Elevated"],
              ["downgraded", "Downgraded"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`tap-target chip ${filter === key ? "chip-on" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="player-search">
          Search players
        </label>
        <input
          id="player-search"
          className="tap-target search"
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search players"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {board.warnings.length > 0 ? (
        <aside className="warn" aria-live="polite">
          {board.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </aside>
      ) : null}

      <p className="asof">
        America/New_York · research as of {formatAsOf(board.asOf)}. Betting only — not a sportsbook.
      </p>

      <section>
        <h2 className="slate-title">{week.label}</h2>
        {week.isPreseason || board.thisWeek.games.length === 0 ? (
          <div className="honest">
            <p>
              {week.isPreseason
                ? `${week.label} is still preseason. NflLeans does not invent injury-to-prop leans for an empty regular-season card.`
                : "No NFL games on the board for this week in America/New_York."}
            </p>
            {board.extraWeeks.length > 0 ? (
              <p>Week 1 regular-season games are posted below from the public ESPN slate.</p>
            ) : null}
          </div>
        ) : null}

        {emptyThisWeek && !week.isPreseason && thisWeekGames.length > 0 ? (
          <div className="honest">
            <p>
              No injury-driven leans yet. Healthy players who were Full all week stay off the board.
            </p>
          </div>
        ) : null}

        <div className="slate">
          {thisWeekGames.map((g) => (
            <GameCard key={g.game.id} board={g} filter={filter} />
          ))}
        </div>
      </section>

      {extraGames.length > 0
        ? board.extraWeeks.map((slate) => (
            <section key={slate.resolved.label} className="mt-10">
              <h2 className="slate-title">{slate.resolved.label} · available</h2>
              <div className="slate">
                {extraGames
                  .filter((g) => slate.games.some((sg) => sg.id === g.game.id))
                  .map((g) => (
                    <GameCard key={g.game.id} board={g} filter={filter} />
                  ))}
              </div>
            </section>
          ))
        : null}
    </div>
  );
}
