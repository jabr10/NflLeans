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

export interface WeekSchedule {
  resolved: ResolvedWeek;
  games: BoardGame[];
  warnings: string[];
  timezone: typeof NY_TZ;
  asOf: string;
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
  const resolved = resolveWeekFromCalendar(current);
  let events = current.events ?? [];

  const currentType = current.season?.type;
  const currentWeek = current.week?.number;
  const needsExact =
    currentType !== resolved.seasonType || currentWeek !== resolved.week || events.length === 0;

  if (needsExact) {
    try {
      const exact = await fetchScoreboard({
        seasonType: resolved.seasonType,
        week: resolved.week,
      });
      events = exact.events ?? events;
    } catch (err) {
      warnings.push(err instanceof SourceError ? err.message : "Could not load this week's exact slate.");
    }
  }

  const games = events
    .map((e) => mapEvent(e, resolved.seasonType, resolved.week))
    .filter((g): g is BoardGame => Boolean(g))
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));

  return {
    resolved,
    games,
    warnings,
    timezone: NY_TZ,
    asOf: new Date().toISOString(),
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
      weeks.push({
        resolved: {
          seasonYear: thisWeek.seasonYear,
          seasonType: 2,
          seasonTypeName: "Regular Season",
          week: 1,
          label: "Week 1",
          isPreseason: false,
          isPostseason: false,
        },
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
