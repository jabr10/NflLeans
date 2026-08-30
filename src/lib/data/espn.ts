import type { OfficialStatus, PracticeWeek, Role } from "@/lib/engine/types";
import { looksLikeRest, mergePractice, parsePracticeFromText } from "@/lib/engine/practice";
import { fetchPublicJson, mapPool, SourceError } from "./fetchPublic";

const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

export interface CalendarEntry {
  label: string;
  alternateLabel?: string;
  detail?: string;
  value: string;
  startDate: string;
  endDate: string;
}

export interface CalendarGroup {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
  entries: CalendarEntry[];
}

export interface ScoreboardJson {
  leagues?: Array<{
    season?: { year?: number; type?: { type?: number; name?: string } };
    calendar?: CalendarGroup[];
  }>;
  season?: { type?: number; year?: number };
  week?: { number?: number };
  events?: EspnEvent[];
}

export interface EspnEvent {
  id: string;
  date: string;
  name: string;
  shortName?: string;
  season?: { type?: number; year?: number };
  week?: { number?: number };
  competitions?: Array<{
    id?: string;
    date?: string;
    competitors?: EspnCompetitor[];
    status?: { type?: { completed?: boolean; description?: string; shortDetail?: string } };
    notes?: Array<{ headline?: string }>;
    venue?: { fullName?: string };
  }>;
  status?: { type?: { completed?: boolean; description?: string; shortDetail?: string } };
}

export interface EspnCompetitor {
  homeAway?: string;
  team?: {
    id?: string;
    abbreviation?: string;
    displayName?: string;
    shortDisplayName?: string;
    logo?: string;
  };
}

export interface InjuryJson {
  injuries?: Array<{
    id?: string;
    displayName?: string;
    injuries?: EspnInjury[];
  }>;
}

export interface EspnInjury {
  id?: string;
  longComment?: string;
  shortComment?: string;
  status?: string;
  date?: string;
  athlete?: {
    id?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    links?: Array<{ href?: string; rel?: string[] }>;
    position?: { abbreviation?: string; displayName?: string };
  };
  details?: { type?: string; detail?: string };
}

export interface DepthJson {
  team?: { id?: string; abbreviation?: string; displayName?: string };
  depthchart?: Array<{
    name?: string;
    positions?: Record<
      string,
      {
        position?: { abbreviation?: string };
        athletes?: Array<{ id?: string; displayName?: string }>;
      }
    >;
  }>;
}

export interface NewsJson {
  articles?: Array<{
    headline?: string;
    description?: string;
    published?: string;
    byline?: string;
  }>;
}

export async function fetchScoreboard(params: {
  seasonType: number;
  week: number;
}): Promise<ScoreboardJson> {
  const url = `${SITE}/scoreboard?seasontype=${params.seasonType}&week=${params.week}`;
  return fetchPublicJson<ScoreboardJson>(url, {
    cacheKey: `scoreboard-${params.seasonType}-${params.week}`,
    ttlMs: 5 * 60 * 1000,
    timeoutMs: 8000,
    source: "ESPN scoreboard",
  });
}

export async function fetchCurrentScoreboard(): Promise<ScoreboardJson> {
  return fetchPublicJson<ScoreboardJson>(`${SITE}/scoreboard`, {
    cacheKey: "scoreboard-current",
    ttlMs: 5 * 60 * 1000,
    timeoutMs: 8000,
    source: "ESPN scoreboard",
  });
}

export async function fetchInjuries(): Promise<InjuryJson> {
  return fetchPublicJson<InjuryJson>(`${SITE}/injuries`, {
    cacheKey: "injuries",
    ttlMs: 15 * 60 * 1000,
    timeoutMs: 12_000,
    source: "ESPN injuries",
  });
}

export async function fetchNews(): Promise<NewsJson> {
  return fetchPublicJson<NewsJson>(`${SITE}/news?limit=50`, {
    cacheKey: "news",
    ttlMs: 15 * 60 * 1000,
    timeoutMs: 8000,
    source: "ESPN news",
  });
}

export async function fetchDepthChart(teamId: string): Promise<DepthJson> {
  return fetchPublicJson<DepthJson>(`${SITE}/teams/${teamId}/depthcharts`, {
    cacheKey: `depth-${teamId}`,
    ttlMs: 6 * 60 * 60 * 1000,
    timeoutMs: 8000,
    source: "ESPN depth chart",
  });
}

export async function fetchDepthCharts(
  teamIds: string[],
): Promise<{ charts: Record<string, DepthJson>; warnings: string[] }> {
  const warnings: string[] = [];
  const unique = Array.from(new Set(teamIds));
  const charts: Record<string, DepthJson> = {};
  const results = await mapPool(unique, 6, async (id) => {
    try {
      return { id, chart: await fetchDepthChart(id) };
    } catch (err) {
      const msg = err instanceof SourceError ? err.message : `ESPN depth chart failed for team ${id}`;
      warnings.push(msg);
      return { id, chart: null };
    }
  });
  for (const row of results) {
    if (row.chart) charts[row.id] = row.chart;
  }
  return { charts, warnings };
}

export function athleteIdFromInjury(injury: EspnInjury): string | null {
  const raw = injury.athlete?.id;
  if (raw) return String(raw);
  const hrefs = injury.athlete?.links?.map((l) => l.href ?? "") ?? [];
  for (const href of hrefs) {
    const m = href.match(/\/id\/(\d+)/);
    if (m) return m[1];
  }
  return null;
}

export function mapOfficialStatus(status: string | undefined): OfficialStatus | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "out") return "Out";
  if (s === "doubtful") return "Doubtful";
  if (s === "questionable") return "Questionable";
  if (s.includes("injured reserve") || s === "ir") return "IR";
  if (s === "suspension" || s === "suspended") return "Suspension";
  return null;
}

export function practiceAndRestFromInjury(injury: EspnInjury): {
  practice: PracticeWeek;
  rest: boolean;
} {
  const text = [injury.shortComment, injury.longComment].filter(Boolean).join(" ");
  return {
    practice: parsePracticeFromText(text),
    rest: looksLikeRest(text),
  };
}

export function mergeInjuryPractice(
  injury: EspnInjury,
  extraText?: string,
): { practice: PracticeWeek; rest: boolean } {
  const fromInjury = practiceAndRestFromInjury(injury);
  const fromExtra = extraText
    ? { practice: parsePracticeFromText(extraText), rest: looksLikeRest(extraText) }
    : null;
  return {
    practice: fromExtra ? mergePractice(fromInjury.practice, fromExtra.practice) : fromInjury.practice,
    rest: fromInjury.rest || Boolean(fromExtra?.rest),
  };
}

const OFFENSE_KEYS = ["3WR", "1TE", "offense", "3WR 1TE"] as const;

export interface NormalizedDepthPlayer {
  id: string;
  name: string;
  position: string;
  depthOrder: number;
  role: Role;
}

export function normalizeDepthChart(chart: DepthJson | null | undefined): NormalizedDepthPlayer[] {
  if (!chart?.depthchart?.length) return [];
  const offense =
    chart.depthchart.find((c) => OFFENSE_KEYS.some((k) => (c.name ?? "").includes(k))) ??
    chart.depthchart.find((c) => c.positions && "qb" in c.positions);
  const defense = chart.depthchart.find((c) =>
    /base|nickel|dime|3-4|4-3|defense/i.test(c.name ?? ""),
  );

  const out: NormalizedDepthPlayer[] = [];
  const seen = new Set<string>();

  const push = (id: string, name: string, position: string, depthOrder: number, role: Role) => {
    if (!id || seen.has(`${id}:${role}`)) return;
    seen.add(`${id}:${role}`);
    out.push({ id, name, position, depthOrder, role });
  };

  const take = (
    positions: Record<string, { athletes?: Array<{ id?: string; displayName?: string }> }> | undefined,
    key: string,
    roleForIndex: (i: number) => Role,
    position: string,
    limit = 3,
  ) => {
    const athletes = positions?.[key]?.athletes ?? [];
    athletes.slice(0, limit).forEach((a, i) => {
      if (a.id && a.displayName) {
        push(String(a.id), a.displayName, position, i + 1, roleForIndex(i));
      }
    });
  };

  if (offense?.positions) {
    const p = offense.positions;
    take(p, "qb", (i) => (i === 0 ? "QB1" : "QB2"), "QB", 2);
    take(p, "rb", (i) => (i === 0 ? "RB1" : i === 1 ? "RB2" : "RB3"), "RB", 3);
    take(p, "wr1", () => "WR1", "WR", 1);
    take(p, "wr2", () => "WR2", "WR", 1);
    take(p, "wr3", () => "slot", "WR", 1);
    take(p, "te", (i) => (i === 0 ? "TE1" : "TE2"), "TE", 2);
    take(p, "lt", () => "LT", "LT", 1);
    take(p, "rt", () => "RT", "RT", 1);
  }

  if (defense?.positions) {
    const p = defense.positions;
    const edgeKeys = ["lde", "rde", "re", "le", "lolb", "rolb", "edge", "lbolb", "rbolb"];
    const edges: NormalizedDepthPlayer[] = [];
    for (const key of edgeKeys) {
      const athletes = p[key]?.athletes ?? [];
      if (athletes[0]?.id && athletes[0].displayName) {
        edges.push({
          id: String(athletes[0].id),
          name: athletes[0].displayName,
          position: "EDGE",
          depthOrder: edges.length + 1,
          role: edges.length === 0 ? "EDGE1" : "EDGE2",
        });
      }
    }
    // Heir at the same end as the starter when we only have one named end.
    const firstEnd = edgeKeys.find((k) => (p[k]?.athletes?.length ?? 0) > 1);
    if (firstEnd) {
      const athletes = p[firstEnd].athletes ?? [];
      if (athletes[1]?.id && athletes[1].displayName && !edges.some((e) => e.id === String(athletes[1].id))) {
        edges.push({
          id: String(athletes[1].id),
          name: athletes[1].displayName,
          position: "EDGE",
          depthOrder: 2,
          role: "EDGE2",
        });
      }
    }
    edges.forEach((e) => push(e.id, e.name, e.position, e.depthOrder, e.role));
  }

  return out;
}

export function isRbCommittee(depth: NormalizedDepthPlayer[]): boolean {
  return depth.filter((p) => p.role === "RB1" || p.role === "RB2" || p.role === "RB3").length >= 3;
}
