import type { Lean } from "@/lib/engine/types";
import { NY_TZ } from "@/lib/engine/types";

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

export interface BoardTeam {
  id: string;
  abbr: string;
  name: string;
  logo?: string;
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
