import { NY_TZ } from "@/lib/engine/types";

function partsOf(
  iso: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return {};
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    ...options,
  }).formatToParts(date);
  const out: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return out;
}

export function formatKickoff(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Compact kickoff: "Thu 8:35" in America/New_York. */
export function formatKickCompact(iso: string): string {
  const p = partsOf(iso, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!p.weekday || !p.hour || !p.minute) return formatKickoff(iso);
  return `${p.weekday} ${p.hour}:${p.minute}`;
}

/** Header stamp: "Sun 9:20 PM ET" */
export function formatAsOf(iso: string): string {
  const p = partsOf(iso, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!p.weekday || !p.hour || !p.minute) return iso;
  return `${p.weekday} ${p.hour}:${p.minute} ${p.dayPeriod} ET`;
}

/** Calendar or slate window: "Sep 9–14" */
export function formatWeekSpan(start?: string, end?: string): string {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
  const endInclusive = new Date(Math.max(s.getTime(), e.getTime() - 1));
  const startParts = partsOf(s.toISOString(), { month: "short", day: "numeric" });
  const endParts = partsOf(endInclusive.toISOString(), { month: "short", day: "numeric" });
  if (!startParts.month || !startParts.day || !endParts.month || !endParts.day) return "";
  if (startParts.month === endParts.month && startParts.day === endParts.day) {
    return `${startParts.month} ${startParts.day}`;
  }
  if (startParts.month === endParts.month) {
    return `${startParts.month} ${startParts.day}–${endParts.day}`;
  }
  return `${startParts.month} ${startParts.day}–${endParts.month} ${endParts.day}`;
}

export function formatSlateSpan(
  games: Array<{ kickoff: string }>,
  start?: string,
  end?: string,
): string {
  const times = games
    .map((g) => Date.parse(g.kickoff))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  if (times.length > 0) {
    return formatWeekSpan(new Date(times[0]).toISOString(), new Date(times[times.length - 1]).toISOString());
  }
  return formatWeekSpan(start, end);
}
