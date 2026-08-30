import { inferLeans } from "@/lib/engine/inferLeans";
import { looksLikeInjuryNote } from "@/lib/engine/practice";
import type { GameInput, Lean, ListedPlayer, PracticeMark, TeamSide } from "@/lib/engine/types";
import {
  athleteIdFromInjury,
  fetchDepthCharts,
  fetchInjuries,
  fetchNews,
  isRbCommittee,
  mapOfficialStatus,
  mergeInjuryPractice,
  normalizeDepthChart,
  type EspnInjury,
  type NewsJson,
} from "./espn";
import { SourceError } from "./fetchPublic";
import { loadExtraWeeks, loadSchedule, type BoardGame, type WeekSchedule } from "./week";

export interface RawNote {
  player?: string;
  team?: string;
  text: string;
  source: string;
}

export interface GameBoard {
  game: BoardGame;
  elevates: Lean[];
  downgrades: Lean[];
  rawNotes: RawNote[];
}

export interface ResearchBoard {
  thisWeek: WeekSchedule;
  extraWeeks: WeekSchedule[];
  games: GameBoard[];
  warnings: string[];
  timezone: "America/New_York";
  asOf: string;
}

function buildSide(
  game: BoardGame,
  which: "home" | "away",
  depthPlayers: ReturnType<typeof normalizeDepthChart>,
  teamInjuries: EspnInjury[],
): TeamSide {
  const team = game[which];
  const depth = depthPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    depthOrder: p.depthOrder,
    role: p.role,
  }));

  const listed: ListedPlayer[] = [];
  for (const injury of teamInjuries) {
    const id = athleteIdFromInjury(injury);
    const name = injury.athlete?.displayName;
    if (!id || !name) continue;
    const status = mapOfficialStatus(injury.status);
    const { practice, rest } = mergeInjuryPractice(injury);
    const notes = [injury.shortComment, injury.longComment].filter((x): x is string => Boolean(x));
    const practiceSignal = (["wed", "thu", "fri"] as const).some((day) => {
      const mark: PracticeMark | null = practice[day];
      return mark === "DNP" || mark === "Limited";
    });
    if (!status && !practiceSignal) {
      continue;
    }
    const onDepth = depth.find((p) => p.id === id);
    const position = injury.athlete?.position?.abbreviation ?? onDepth?.position ?? "UNK";
    listed.push({
      id,
      name,
      position,
      depthOrder: onDepth?.depthOrder ?? 99,
      role: onDepth?.role ?? "other",
      practice,
      status,
      rest,
      beatNotes: notes,
      sources: ["ESPN injury report"],
    });
  }

  return {
    abbr: team.abbr,
    name: team.name,
    listed,
    depth,
    rbCommittee: isRbCommittee(depthPlayers),
  };
}

function notesForGame(
  game: BoardGame,
  teamInjuries: Record<string, EspnInjury[]>,
  news: NewsJson | null,
): RawNote[] {
  const notes: RawNote[] = [];
  for (const headline of game.notes) {
    notes.push({ team: game.shortName, text: headline, source: "ESPN game notes" });
  }
  for (const team of [game.home, game.away]) {
    for (const injury of teamInjuries[team.id] ?? []) {
      const text = injury.shortComment || injury.longComment;
      if (!text) continue;
      if (!mapOfficialStatus(injury.status) && !looksLikeInjuryNote(text)) continue;
      notes.push({
        player: injury.athlete?.displayName,
        team: team.abbr,
        text,
        source: "ESPN injury report",
      });
    }
  }
  const abbrs = [game.home.abbr, game.away.abbr, game.home.name, game.away.name];
  for (const article of news?.articles ?? []) {
    const blob = `${article.headline ?? ""} ${article.description ?? ""}`;
    if (!abbrs.some((a) => a && blob.includes(a))) continue;
    if (article.headline) {
      notes.push({
        text: article.description
          ? `${article.headline} — ${article.description}`
          : article.headline,
        source: article.byline ? `ESPN news · ${article.byline}` : "ESPN news",
      });
    }
  }
  return notes;
}

export async function loadBoard(): Promise<ResearchBoard> {
  const warnings: string[] = [];
  let thisWeek: WeekSchedule;
  try {
    thisWeek = await loadSchedule();
    warnings.push(...thisWeek.warnings);
  } catch (err) {
    throw err instanceof SourceError ? err : new SourceError("Could not load the NFL schedule.", "ESPN scoreboard");
  }

  const extra = await loadExtraWeeks(thisWeek.resolved);
  warnings.push(...extra.warnings);

  const slates = [thisWeek, ...extra.weeks];
  const games = slates.flatMap((s) => s.games);
  const teamIds = games.flatMap((g) => [g.home.id, g.away.id]);

  let injuryByTeam: Record<string, EspnInjury[]> = {};
  try {
    const injuryJson = await fetchInjuries();
    for (const team of injuryJson.injuries ?? []) {
      if (team.id) injuryByTeam[String(team.id)] = team.injuries ?? [];
    }
  } catch (err) {
    warnings.push(err instanceof SourceError ? err.message : "ESPN injuries were unavailable.");
  }

  let news: NewsJson | null = null;
  try {
    news = await fetchNews();
  } catch (err) {
    warnings.push(err instanceof SourceError ? err.message : "ESPN news was unavailable.");
  }

  const depths = await fetchDepthCharts(teamIds);
  warnings.push(...depths.warnings);
  if (!Object.keys(injuryByTeam).length) {
    warnings.push("No official injury rows loaded. Leans will stay empty rather than inventing injuries.");
  }
  warnings.push(
    "Official NFL.com Wed–Thu–Fri practice columns were not available as structured public JSON. Practice days are unlisted unless an ESPN comment names the day.",
  );

  const gameBoards: GameBoard[] = games.map((game) => {
    const homeDepth = normalizeDepthChart(depths.charts[game.home.id]);
    const awayDepth = normalizeDepthChart(depths.charts[game.away.id]);
    const input: GameInput = {
      id: game.id,
      kickoff: game.kickoff,
      home: buildSide(game, "home", homeDepth, injuryByTeam[game.home.id] ?? []),
      away: buildSide(game, "away", awayDepth, injuryByTeam[game.away.id] ?? []),
    };
    const leans = game.completed ? [] : inferLeans(input);
    return {
      game,
      elevates: leans.filter((l) => l.direction === "elevate"),
      downgrades: leans.filter((l) => l.direction === "downgrade"),
      rawNotes: notesForGame(game, injuryByTeam, news),
    };
  });

  return {
    thisWeek,
    extraWeeks: extra.weeks,
    games: gameBoards,
    warnings: Array.from(new Set(warnings)),
    timezone: "America/New_York",
    asOf: new Date().toISOString(),
  };
}

export async function loadGameBoard(id: string): Promise<GameBoard | null> {
  const board = await loadBoard();
  return board.games.find((g) => g.game.id === id) ?? null;
}
