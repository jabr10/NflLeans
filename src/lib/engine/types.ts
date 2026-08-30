export const NY_TZ = "America/New_York";

export type PracticeMark = "DNP" | "Limited" | "Full";

export interface PracticeWeek {
  wed: PracticeMark | null;
  thu: PracticeMark | null;
  fri: PracticeMark | null;
}

export type OfficialStatus = "Out" | "Doubtful" | "Questionable" | "IR" | "Suspension";

export type PropFamily = "Pass" | "Rush" | "Rec" | "Sacks" | "TD";
export type Confidence = "High" | "Med" | "Low";
export type Direction = "elevate" | "downgrade";

export type Role =
  | "QB1"
  | "QB2"
  | "RB1"
  | "RB2"
  | "RB3"
  | "WR1"
  | "WR2"
  | "slot"
  | "TE1"
  | "TE2"
  | "LT"
  | "RT"
  | "EDGE1"
  | "EDGE2"
  | "other";

export interface DepthPlayer {
  id: string;
  name: string;
  position: string;
  depthOrder: number;
  role: Role;
  dualThreat?: boolean;
  goalLineBack?: boolean;
}

export interface ListedPlayer extends DepthPlayer {
  practice: PracticeWeek;
  status: OfficialStatus | null;
  rest?: boolean;
  beatNotes: string[];
  sources: string[];
}

export interface TeamSide {
  abbr: string;
  name: string;
  listed: ListedPlayer[];
  depth: DepthPlayer[];
  rbCommittee: boolean;
}

export interface GameInput {
  id: string;
  kickoff: string;
  home: TeamSide;
  away: TeamSide;
}

export interface Lean {
  id: string;
  gameId: string;
  playerId: string;
  player: string;
  team: string;
  opponent: string;
  kickoff: string;
  direction: Direction;
  confidence: Confidence;
  propFamily: PropFamily;
  why: string;
  source: string;
}

export type Situation =
  | "drop"
  | "out"
  | "out_lean"
  | "doubtful"
  | "questionable"
  | "limited"
  | "beat_only";
