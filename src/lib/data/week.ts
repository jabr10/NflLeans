import { NY_TZ } from "@/lib/engine/types";
import {
  fetchCurrentScoreboard,
  fetchScoreboard,
  type CalendarEntry,
  type CalendarGroup,
  type EspnEvent,
  type ScoreboardJson,
} from "./espn";
import { SourceError } from "./fetchPublic";

export interface ResolvedWeek {
  seasonYear: number;
  seasonType: number;
  seasonTypeName: string;
  week: number;
  label: string;
  detail?: string;
  isPreseason: boolean;
  isPostseason: boolean;
  startDate?: string;
  endDate?: string;
}

export interface BoardGame {
  id: string;
  name: string;
  shortName: string;
  kickoff: string;
  completed: boolean;
  statusText: string;
  venue?: string;
  notes: string[];
  home: BoardTeam;
  away: BoardTeam;
  seasonType: number;
  week: number;
}

export interface BoardTeam {
  id: string;
  abbr: string;
  name: string;
  logo?: string;
}

export interface ExhibitionStatus {
  completed: number;
  total: number;
}

export interface WeekSchedule {
  resolved: ResolvedWeek;
  calendarWeek: ResolvedWeek;
  games: BoardGame[];
  warnings: string[];
  timezone: typeof NY_TZ;
  asOf: string;
  exhibition?: ExhibitionStatus;
}

const SEASON_TYPE_NAME: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

export function nowInNewYork(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return new Date(
    Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second")),
  );
}

function inRange(nowIso: number, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return nowIso >= s && nowIso < e;
}

export function resolveWeekFromCalendar(
  scoreboard: ScoreboardJson,
  now = new Date(),
): ResolvedWeek {
  const nowMs = now.getTime();
  const calendar = scoreboard.leagues?.[0]?.calendar ?? [];
  const year = scoreboard.leagues?.[0]?.season?.year ?? scoreboard.season?.year ?? now.getUTCFullYear();

  for (const group of calendar as CalendarGroup[]) {
    const seasonType = Number(group.value);
    if (!group.entries) continue;
    for (const entry of group.entries as CalendarEntry[]) {
      if (inRange(nowMs, entry.startDate, entry.endDate)) {
        return {
          seasonYear: year,
          seasonType,
          seasonTypeName: group.label || SEASON_TYPE_NAME[seasonType] || "Season",
          week: Number(entry.value),
          label: entry.label,
          detail: entry.detail,
          isPreseason: seasonType === 1,
          isPostseason: seasonType === 3,
          startDate: entry.startDate,
          endDate: entry.endDate,
        };
      }
    }
  }

  const type = scoreboard.season?.type ?? 2;
  const week = scoreboard.week?.number ?? 1;
  return {
    seasonYear: year,
    seasonType: type,
    seasonTypeName: SEASON_TYPE_NAME[type] ?? "Season",
    week,
    label: `${SEASON_TYPE_NAME[type] ?? "Week"} ${week}`,
    isPreseason: type === 1,
    isPostseason: type === 3,
  };
}

export function flattenCalendar(scoreboard: ScoreboardJson): ResolvedWeek[] {
  const year =
    scoreboard.leagues?.[0]?.season?.year ?? scoreboard.season?.year ?? new Date().getUTCFullYear();
  const calendar = scoreboard.leagues?.[0]?.calendar ?? [];
  const weeks: ResolvedWeek[] = [];
  for (const group of calendar as CalendarGroup[]) {
    const seasonType = Number(group.value);
    if (!group.entries) continue;
    for (const entry of group.entries as CalendarEntry[]) {
      weeks.push({
        seasonYear: year,
        seasonType,
        seasonTypeName: group.label || SEASON_TYPE_NAME[seasonType] || "Season",
        week: Number(entry.value),
        label: entry.label,
        detail: entry.detail,
        isPreseason: seasonType === 1,
        isPostseason: seasonType === 3,
        startDate: entry.startDate,
        endDate: entry.endDate,
      });
    }
  }
  return weeks;
}

export function firstRegularSeasonWeek(scoreboard: ScoreboardJson): ResolvedWeek | null {
  return flattenCalendar(scoreboard).find((w) => w.seasonType === 2) ?? null;
}

/** Next unplayed betting slate: skip preseason; do not sit on a finished exhibition week. */
export function resolveBettingWeek(scoreboard: ScoreboardJson, now = new Date()): ResolvedWeek {
  const calendar = resolveWeekFromCalendar(scoreboard, now);
  if (!calendar.isPreseason) return calendar;
  return (
    firstRegularSeasonWeek(scoreboard) ?? {
      seasonYear: calendar.seasonYear,
      seasonType: 2,
      seasonTypeName: "Regular Season",
      week: 1,
      label: "Week 1",
      isPreseason: false,
      isPostseason: false,
    }
  );
}

export function nextWeekAfter(
  scoreboard: ScoreboardJson,
  current: ResolvedWeek,
): ResolvedWeek | null {
  const weeks = flattenCalendar(scoreboard);
  const idx = weeks.findIndex(
    (w) => w.seasonType === current.seasonType && w.week === current.week,
  );
  if (idx === -1) return null;
  for (let i = idx + 1; i < weeks.length; i++) {
    if (!weeks[i].isPreseason) return weeks[i];
  }
  return null;
}

export function shouldAdvanceSlate(games: BoardGame[]): boolean {
  return games.length > 0 && games.every((g) => g.completed);
}

export function exhibitionChip(opts: {
  exhibition?: ExhibitionStatus;
  weekLabel: string;
  hasSlate: boolean;
}): string | null {
  const ex = opts.exhibition;
  if (!ex || ex.total === 0) return null;
  const final =
    ex.completed === ex.total
      ? `${ex.completed} exhibitions final`
      : `${ex.completed} of ${ex.total} exhibitions complete`;
  if (!opts.hasSlate) return `${final}.`;
  return `${final} — ${opts.weekLabel} board is live.`;
}

function mapGames(events: EspnEvent[], type: number, week: number): BoardGame[] {
  return events
    .map((e) => mapEvent(e, type, week))
    .filter((g): g is BoardGame => Boolean(g))
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
}

async function fetchWeekGames(
  target: ResolvedWeek,
  warnings: string[],
): Promise<BoardGame[]> {
  try {
    const exact = await fetchScoreboard({
      seasonType: target.seasonType,
      week: target.week,
    });
    return mapGames(exact.events ?? [], target.seasonType, target.week);
  } catch (err) {
    warnings.push(
      err instanceof SourceError ? err.message : "Could not load this week's exact slate.",
    );
    return [];
  }
}

export function mapEvent(event: EspnEvent, fallbackType: number, fallbackWeek: number): BoardGame | null {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team?.id || !away?.team?.id) return null;
  const completed = Boolean(comp?.status?.type?.completed ?? event.status?.type?.completed);
  return {
    id: event.id,
    name: event.name,
    shortName: event.shortName ?? event.name,
    kickoff: comp?.date ?? event.date,
    completed,
    statusText: comp?.status?.type?.shortDetail ?? event.status?.type?.shortDetail ?? "",
    venue: comp?.venue?.fullName,
    notes: (comp?.notes ?? []).map((n) => n.headline).filter((h): h is string => Boolean(h)),
    home: {
      id: String(home.team.id),
      abbr: home.team.abbreviation ?? home.team.shortDisplayName ?? "HOME",
      name: home.team.displayName ?? "Home",
      logo: home.team.logo,
    },
    away: {
      id: String(away.team.id),
      abbr: away.team.abbreviation ?? away.team.shortDisplayName ?? "AWAY",
      name: away.team.displayName ?? "Away",
      logo: away.team.logo,
    },
    seasonType: event.season?.type ?? fallbackType,
    week: event.week?.number ?? fallbackWeek,
  };
}

export async function loadSchedule(): Promise<WeekSchedule> {
  const warnings: string[] = [];
  const current = await fetchCurrentScoreboard();
  const calendarWeek = resolveWeekFromCalendar(current);
  let resolved = resolveBettingWeek(current);

  let exhibition: ExhibitionStatus | undefined;
  if (calendarWeek.isPreseason) {
    const currentType = current.season?.type;
    const currentWeekNum = current.week?.number;
    let preGames: BoardGame[] = [];
    if (currentType === 1 && (current.events?.length ?? 0) > 0) {
      preGames = mapGames(current.events ?? [], 1, currentWeekNum ?? calendarWeek.week);
    } else {
      try {
        const pre = await fetchScoreboard({
          seasonType: calendarWeek.seasonType,
          week: calendarWeek.week,
        });
        preGames = mapGames(pre.events ?? [], calendarWeek.seasonType, calendarWeek.week);
      } catch {
        preGames = mapGames(current.events ?? [], 1, calendarWeek.week);
      }
    }
    if (preGames.length > 0) {
      exhibition = {
        completed: preGames.filter((g) => g.completed).length,
        total: preGames.length,
      };
    }
  }

  const currentType = current.season?.type;
  const currentWeek = current.week?.number;
  const currentIsTarget =
    currentType === resolved.seasonType &&
    currentWeek === resolved.week &&
    (current.events?.length ?? 0) > 0 &&
    !resolved.isPreseason;

  let games = currentIsTarget
    ? mapGames(current.events ?? [], resolved.seasonType, resolved.week)
    : await fetchWeekGames(resolved, warnings);

  if (shouldAdvanceSlate(games)) {
    const next = nextWeekAfter(current, resolved);
    if (next) {
      const nextGames = await fetchWeekGames(next, warnings);
      if (nextGames.length > 0) {
        games = nextGames;
        resolved = next;
      }
    }
  }

  return {
    resolved,
    calendarWeek,
    games,
    warnings,
    timezone: NY_TZ,
    asOf: new Date().toISOString(),
    exhibition,
  };
}

export async function loadExtraWeeks(thisWeek: ResolvedWeek): Promise<{
  weeks: WeekSchedule[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const weeks: WeekSchedule[] = [];

  if (thisWeek.isPreseason) {
    try {
      const reg1 = await fetchScoreboard({ seasonType: 2, week: 1 });
      const games = (reg1.events ?? [])
        .map((e) => mapEvent(e, 2, 1))
        .filter((g): g is BoardGame => Boolean(g))
        .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
      const fromCal = firstRegularSeasonWeek(reg1);
      const resolved: ResolvedWeek = {
        seasonYear: thisWeek.seasonYear,
        seasonType: 2,
        seasonTypeName: "Regular Season",
        week: 1,
        label: fromCal?.label ?? "Week 1",
        isPreseason: false,
        isPostseason: false,
        startDate: fromCal?.startDate,
        endDate: fromCal?.endDate,
      };
      weeks.push({
        resolved,
        calendarWeek: thisWeek,
        games,
        warnings: [],
        timezone: NY_TZ,
        asOf: new Date().toISOString(),
      });
    } catch (err) {
      warnings.push(err instanceof SourceError ? err.message : "Week 1 regular-season slate was unavailable.");
    }
  }

  return { weeks, warnings };
}
