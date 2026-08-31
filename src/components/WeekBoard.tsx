"use client";

import { useMemo, useState } from "react";
import type { ResearchBoard } from "@/lib/data/board";
import type { BoardGame } from "@/lib/data/week";
import { exhibitionChip } from "@/lib/data/week";
import type { Lean } from "@/lib/engine/types";
import { formatSlateSpan } from "@/lib/format";
import { AppHeader } from "./AppHeader";
import { PileColumn } from "./PileColumn";

type Filter = "all" | "elevated" | "downgraded";
type Row = { lean: Lean; game: BoardGame };

const PRACTICE_WARN = "Official NFL.com Wed–Thu–Fri practice columns";

function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const kick = Date.parse(a.game.kickoff) - Date.parse(b.game.kickoff);
    if (kick !== 0) return kick;
    return a.lean.player.localeCompare(b.lean.player);
  });
}

function weekHeadline(label: string, week: number, isPostseason: boolean): string {
  if (isPostseason) return label;
  if (/^week\s+/i.test(label)) return label;
  return `Week ${week}`;
}

export function WeekBoard({ board }: { board: ResearchBoard }) {
  const [filter, setFilter] = useState<Filter>("all");
  const week = board.thisWeek;
  const hasSlate = week.games.length > 0;

  const { elevates, downgrades } = useMemo(() => {
    const up: Row[] = [];
    const down: Row[] = [];
    for (const g of board.games) {
      for (const lean of g.elevates) up.push({ lean, game: g.game });
      for (const lean of g.downgrades) down.push({ lean, game: g.game });
    }
    return { elevates: sortRows(up), downgrades: sortRows(down) };
  }, [board.games]);

  const chip = exhibitionChip({
    exhibition: week.exhibition,
    weekLabel: week.resolved.label,
    hasSlate,
  });

  const warnings = board.warnings.filter((w) => !w.includes(PRACTICE_WARN));
  const span = formatSlateSpan(week.games, week.resolved.startDate, week.resolved.endDate);
  const title = weekHeadline(week.resolved.label, week.resolved.week, week.resolved.isPostseason);

  return (
    <>
      <AppHeader asOf={board.asOf} />
      <main className="page">
        {chip ? (
          <div className="live-chip">
            <span className="live-dot" aria-hidden="true" />
            <span>{chip}</span>
          </div>
        ) : null}

        {warnings.map((w) => (
          <p key={w} className="warn-line">
            {w}
          </p>
        ))}

        {!hasSlate ? (
          <p className="empty-page">No betting slate yet</p>
        ) : (
          <>
            <div className="week-bar">
              <div className="week-kicker">
                <h1 className="week-title">{title}</h1>
                {span ? <p className="week-span">{span}</p> : null}
              </div>
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
                    className={`chip ${filter === key ? "chip-on" : ""}`}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`columns ${filter === "all" ? "" : "columns-one"}`}>
              {filter !== "downgraded" ? (
                <PileColumn
                  kind="elevates"
                  count={elevates.length}
                  rows={elevates}
                  empty="No elevates yet."
                />
              ) : null}
              {filter !== "elevated" ? (
                <PileColumn
                  kind="downgrades"
                  count={downgrades.length}
                  rows={downgrades}
                  empty="No downgrades yet."
                />
              ) : null}
            </div>
          </>
        )}
      </main>
    </>
  );
}
