"use client";

import { useCallback, useMemo, useState } from "react";
import type { ResearchBoard } from "@/lib/data/types";
import type { BoardGame } from "@/lib/data/types";
import { exhibitionChip } from "@/lib/boardCopy";
import { fetchLiveBoard } from "@/lib/boardRefresh";
import type { Lean } from "@/lib/engine/types";
import { formatSlateSpan } from "@/lib/format";
import { AppHeader } from "./AppHeader";
import { PileColumn } from "./PileColumn";
import { usePullToRefresh } from "./usePullToRefresh";

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

export function WeekBoard({
  board: initial,
  error: loadError,
}: {
  board: ResearchBoard | null;
  error?: string;
}) {
  const [board, setBoard] = useState<ResearchBoard | null>(initial);
  const [error, setError] = useState<string | null>(loadError ?? null);
  const [filter, setFilter] = useState<Filter>("all");

  const reload = useCallback(async () => {
    const next = await fetchLiveBoard();
    setBoard(next);
    setError(null);
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh the board.");
    }
  }, [reload]);

  const { pull, armed, dragging, refreshing, refresh } = usePullToRefresh(onRefresh);

  const week = board?.thisWeek;
  const hasSlate = Boolean(week && week.games.length > 0);

  const { elevates, downgrades } = useMemo(() => {
    const up: Row[] = [];
    const down: Row[] = [];
    if (!board) return { elevates: up, downgrades: down };
    for (const g of board.games) {
      for (const lean of g.elevates) up.push({ lean, game: g.game });
      for (const lean of g.downgrades) down.push({ lean, game: g.game });
    }
    return { elevates: sortRows(up), downgrades: sortRows(down) };
  }, [board]);

  const chip = week
    ? exhibitionChip({
        exhibition: week.exhibition,
        weekLabel: week.resolved.label,
        hasSlate,
      })
    : null;

  const warnings = (board?.warnings ?? []).filter((w) => !w.includes(PRACTICE_WARN));
  const span = week ? formatSlateSpan(week.games, week.resolved.startDate, week.resolved.endDate) : "";
  const title = week ? weekHeadline(week.resolved.label, week.resolved.week, week.resolved.isPostseason) : "";

  let pullLabel = "";
  if (refreshing) pullLabel = "Refreshing research…";
  else if (armed) pullLabel = "Release to refresh";
  else if (pull > 12) pullLabel = "Pull to refresh";

  return (
    <div
      className="pull-root"
      data-dragging={dragging ? "true" : undefined}
      data-armed={armed ? "true" : undefined}
      data-refreshing={refreshing ? "true" : undefined}
      aria-busy={refreshing}
    >
      <div
        className="pull-slot"
        style={{ height: pull }}
        role="status"
        aria-live="polite"
        aria-hidden={!pullLabel}
      >
        {pullLabel ? (
          <>
            <span className="live-dot" aria-hidden="true" />
            <span>{pullLabel}</span>
          </>
        ) : null}
      </div>
      <AppHeader asOf={board?.asOf} onRefresh={() => void refresh()} refreshing={refreshing} />
      <main className="page">
        {chip ? (
          <div className="live-chip">
            <span className="live-dot" aria-hidden="true" />
            <span>{chip}</span>
          </div>
        ) : null}

        {error ? (
          <p className="warn-line" role="alert">
            {error}
          </p>
        ) : null}

        {warnings.map((w) => (
          <p key={w} className="warn-line">
            {w}
          </p>
        ))}

        {!board ? (
          <p className="empty-page">Pull down or refresh to load the board.</p>
        ) : !hasSlate ? (
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
    </div>
  );
}