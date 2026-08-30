import { formatPracticeTriple } from "./practice";
import type {
  Confidence,
  DepthPlayer,
  Direction,
  GameInput,
  Lean,
  ListedPlayer,
  OfficialStatus,
  PropFamily,
  Role,
  Situation,
  TeamSide,
} from "./types";

const CONF_RANK: Record<Confidence, number> = { Low: 1, Med: 2, High: 3 };

function opposite(game: GameInput, teamAbbr: string): TeamSide {
  return game.home.abbr === teamAbbr ? game.away : game.home;
}

function sideOf(game: GameInput, teamAbbr: string): TeamSide {
  return game.home.abbr === teamAbbr ? game.home : game.away;
}

function isStarterRole(role: Role): boolean {
  return (
    role === "QB1" ||
    role === "RB1" ||
    role === "WR1" ||
    role === "TE1" ||
    role === "LT" ||
    role === "RT" ||
    role === "EDGE1"
  );
}

function volumeFamily(player: DepthPlayer): PropFamily | null {
  switch (player.role) {
    case "QB1":
    case "QB2":
      return "Pass";
    case "RB1":
    case "RB2":
    case "RB3":
      return "Rush";
    case "WR1":
    case "WR2":
    case "slot":
    case "TE1":
    case "TE2":
      return "Rec";
    case "EDGE1":
    case "EDGE2":
      return "Sacks";
    default:
      return null;
  }
}

function officialStatus(status: OfficialStatus | null): OfficialStatus | null {
  if (status === "IR" || status === "Suspension") return "Out";
  return status;
}

function statusLabel(player: ListedPlayer): string {
  return player.status ?? "none";
}

export function classifySituation(player: ListedPlayer): Situation {
  const { practice } = player;
  const status = officialStatus(player.status);
  const fri = practice.fri;
  const earlyDnp =
    practice.wed === "DNP" || practice.thu === "DNP";
  const earlyLimited =
    practice.wed === "Limited" || practice.thu === "Limited";

  if (player.rest && fri === "Full") return "drop";

  // Official Out wins even when Friday was Full (IR / designated Out).
  if (status === "Out") return "out";

  // DNP/Limited early → Full Friday is Neutral. Drop the row.
  if (fri === "Full" && (earlyDnp || earlyLimited)) return "drop";

  const allFull =
    practice.wed === "Full" && practice.thu === "Full" && practice.fri === "Full";
  if (allFull && !status) return "drop";

  if (status === "Doubtful") return "doubtful";
  if (status === "Questionable") return "questionable";

  const allDnp =
    practice.wed === "DNP" && practice.thu === "DNP" && practice.fri === "DNP";
  if (allDnp) return "out_lean";

  const listedDays = [practice.wed, practice.thu, practice.fri].filter(
    (d): d is NonNullable<typeof d> => d !== null,
  );
  const limitedWeek =
    listedDays.length > 0 &&
    listedDays.every((d) => d === "Limited") &&
    (practice.fri === "Limited" || practice.fri === null);
  if (limitedWeek || practice.fri === "Limited") return "limited";

  // Friday counts most: Friday DNP without official status is an Out-lean.
  if (practice.fri === "DNP") return "out_lean";

  if (player.beatNotes.length > 0 && isStarterRole(player.role)) return "beat_only";
  return "drop";
}

function heirsFor(side: TeamSide, starter: DepthPlayer): DepthPlayer[] {
  const sameFamily = (p: DepthPlayer) => {
    if (starter.role.startsWith("QB")) return p.role.startsWith("QB");
    if (starter.role.startsWith("RB")) return p.role.startsWith("RB");
    if (starter.role === "WR1" || starter.role === "WR2" || starter.role === "slot") {
      return p.role === "WR1" || p.role === "WR2" || p.role === "slot";
    }
    if (starter.role.startsWith("TE")) return p.role.startsWith("TE");
    if (starter.role === "EDGE1" || starter.role === "EDGE2") {
      return p.role === "EDGE1" || p.role === "EDGE2";
    }
    if (starter.role === "LT") return p.role === "LT";
    if (starter.role === "RT") return p.role === "RT";
    return p.position === starter.position;
  };

  return side.depth
    .filter((p) => p.id !== starter.id && sameFamily(p) && p.depthOrder > starter.depthOrder)
    .sort((a, b) => a.depthOrder - b.depthOrder);
}

function primaryHeir(side: TeamSide, starter: DepthPlayer): DepthPlayer | null {
  return heirsFor(side, starter)[0] ?? null;
}

function isClearHeir(side: TeamSide, starter: DepthPlayer): boolean {
  if (starter.role.startsWith("RB") && side.rbCommittee) return false;
  const heirs = heirsFor(side, starter);
  return heirs.length === 1 || (heirs.length > 0 && heirs[0].depthOrder === starter.depthOrder + 1 && heirs.length < 3);
}

function capHigh(confidence: Confidence, side: TeamSide, starter: DepthPlayer): Confidence {
  if (confidence !== "High") return confidence;
  if (starter.role.startsWith("RB") && side.rbCommittee) return "Med";
  if (!isClearHeir(side, starter)) return "Med";
  return "High";
}

function joinWhy(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

function sourcesOf(player: ListedPlayer, extra: string[] = []): string {
  return Array.from(new Set([...player.sources, ...extra])).join(" · ");
}

function leanId(
  gameId: string,
  playerId: string,
  direction: Direction,
  prop: PropFamily,
): string {
  return `${gameId}:${playerId}:${direction}:${prop}`;
}

function makeLean(args: {
  game: GameInput;
  team: string;
  player: DepthPlayer;
  direction: Direction;
  confidence: Confidence;
  propFamily: PropFamily;
  why: string;
  source: string;
}): Lean {
  const opponent = opposite(args.game, args.team).abbr;
  return {
    id: leanId(args.game.id, args.player.id, args.direction, args.propFamily),
    gameId: args.game.id,
    playerId: args.player.id,
    player: args.player.name,
    team: args.team,
    opponent,
    kickoff: args.game.kickoff,
    direction: args.direction,
    confidence: args.confidence,
    propFamily: args.propFamily,
    why: args.why,
    source: args.source,
  };
}

function beatModifier(player: ListedPlayer): string {
  const note = player.beatNotes[0];
  if (!note) return "";
  const clipped = note.length > 160 ? `${note.slice(0, 157)}…` : note;
  return `Beat note: “${clipped}”`;
}

function practiceClause(player: ListedPlayer): string {
  return `Practice ${formatPracticeTriple(player.practice)} (Wed-Thu-Fri).`;
}

function applyOutLike(
  game: GameInput,
  side: TeamSide,
  player: ListedPlayer,
  opts: { official: boolean; confidence: Confidence; tagIfSits: boolean },
  out: Lean[],
) {
  if (!isStarterRole(player.role)) return;

  const opp = opposite(game, side.abbr);
  const heir = primaryHeir(side, player);
  const family = volumeFamily(player);
  const source = sourcesOf(player, heir ? ["ESPN depth chart"] : []);

  if (player.role === "LT" || player.role === "RT") {
    const edge = opp.depth.find((p) => p.role === "EDGE1");
    if (edge) {
      const conf = capHigh(opts.official ? "Med" : "Med", side, player);
      out.push(
        makeLean({
          game,
          team: opp.abbr,
          player: edge,
          direction: "elevate",
          confidence: conf,
          propFamily: "Sacks",
          why: joinWhy([
            `${edge.name} Elevate Sacks.`,
            `${player.name} ${opts.official ? "official" : "Out-lean"} ${statusLabel(player)}.`,
            practiceClause(player),
            `Heir ${heir?.name ?? "none"} on the injured line.`,
            `Opponent ${player.role} is off the board.`,
            beatModifier(player),
          ]),
          source,
        }),
      );
    }
    const rb1 = side.depth.find((p) => p.role === "RB1");
    if (rb1) {
      out.push(
        makeLean({
          game,
          team: side.abbr,
          player: rb1,
          direction: "downgrade",
          confidence: "Low",
          propFamily: "Rush",
          why: joinWhy([
            `${rb1.name} Downgrade Rush.`,
            `${player.name} ${opts.official ? "official" : "Out-lean"} ${statusLabel(player)}.`,
            practiceClause(player),
            `Own ${player.role} out — slight rush down.`,
            beatModifier(player),
          ]),
          source,
        }),
      );
    }
    return;
  }

  if (player.role === "EDGE1") {
    if (!heir) return;
    // Only if the heir inherits obvious pass-rush snaps (same EDGE slot).
    if (heir.role !== "EDGE2" && heir.role !== "EDGE1") return;
    const conf = capHigh(opts.official ? "High" : "Med", side, player);
    out.push(
      makeLean({
        game,
        team: side.abbr,
        player: heir,
        direction: "elevate",
        confidence: conf,
        propFamily: "Sacks",
        why: joinWhy([
          opts.tagIfSits ? `If ${player.name} sits.` : "",
          `${heir.name} Elevate Sacks.`,
          `${player.name} ${opts.official ? "official" : "Out-lean"} ${statusLabel(player)}.`,
          practiceClause(player),
          `Heir ${heir.name} inherits obvious pass-rush snaps.`,
          beatModifier(player),
        ]),
        source,
      }),
    );
    return;
  }

  if (!heir || !family) return;

  // One primary prop family. Second only if obvious (handled below).
  let conf = capHigh(opts.confidence, side, player);
  if (!opts.official && conf === "High") conf = "Med";

  const sitsTag = opts.tagIfSits ? `If ${player.name} sits.` : "";
  out.push(
    makeLean({
      game,
      team: side.abbr,
      player: heir,
      direction: "elevate",
      confidence: conf,
      propFamily: family,
      why: joinWhy([
        sitsTag,
        `${heir.name} Elevate ${family}.`,
        `${player.name} ${opts.official ? "official" : "Out-lean"} ${statusLabel(player)}.`,
        practiceClause(player),
        `Heir ${heir.name}${isClearHeir(side, player) ? " — clear depth-chart heir" : side.rbCommittee ? " — 3-way committee, High capped" : " — committee/shared"}.`,
        beatModifier(player),
      ]),
      source,
    }),
  );

  if (player.role === "QB1") {
    if (heir.dualThreat) {
      out.push(
        makeLean({
          game,
          team: side.abbr,
          player: heir,
          direction: "elevate",
          confidence: "Med",
          propFamily: "Rush",
          why: joinWhy([
            sitsTag,
            `${heir.name} Elevate Rush.`,
            `${player.name} official ${statusLabel(player)}.`,
            practiceClause(player),
            `Heir ${heir.name} — rushing is their game.`,
            beatModifier(player),
          ]),
          source,
        }),
      );
    }
    for (const skill of side.depth.filter((p) =>
      p.role === "WR1" || p.role === "WR2" || p.role === "TE1",
    )) {
      out.push(
        makeLean({
          game,
          team: side.abbr,
          player: skill,
          direction: "downgrade",
          confidence: "Med",
          propFamily: "Rec",
          why: joinWhy([
            `${skill.name} Downgrade Rec.`,
            `${player.name} official ${statusLabel(player)}.`,
            practiceClause(player),
            `Heir ${heir.name} at QB — receiving volume down. Do not elevate WRs on backup-plays-from-behind.`,
            beatModifier(player),
          ]),
          source,
        }),
      );
    }
    const oppEdge = opp.depth.find((p) => p.role === "EDGE1");
    if (oppEdge) {
      out.push(
        makeLean({
          game,
          team: opp.abbr,
          player: oppEdge,
          direction: "elevate",
          confidence: "Med",
          propFamily: "Sacks",
          why: joinWhy([
            `${oppEdge.name} Elevate Sacks.`,
            `${player.name} official ${statusLabel(player)}.`,
            practiceClause(player),
            `Backup QB — opponent sacks up.`,
            beatModifier(player),
          ]),
          source,
        }),
      );
    }
    return;
  }

  if (player.role === "RB1") {
    const goal = side.depth.find((p) => p.goalLineBack && p.id !== player.id);
    if (goal && goal.id !== heir.id) {
      out.push(
        makeLean({
          game,
          team: side.abbr,
          player: goal,
          direction: "elevate",
          confidence: "Med",
          propFamily: "TD",
          why: joinWhy([
            sitsTag,
            `${goal.name} Elevate TD.`,
            `${player.name} official ${statusLabel(player)}.`,
            practiceClause(player),
            `Heir ${heir.name} for Rush; ${goal.name} is the known goal-line back.`,
            beatModifier(player),
          ]),
          source,
        }),
      );
    }
    return;
  }

  if (player.role === "WR1") {
    const slot = side.depth.find((p) => p.role === "slot" && p.id !== heir.id);
    if (slot) {
      out.push(
        makeLean({
          game,
          team: side.abbr,
          player: slot,
          direction: "elevate",
          confidence: "Low",
          propFamily: "Rec",
          why: joinWhy([
            `Thin: smaller slot elevate behind ${heir.name}.`,
            `${slot.name} Elevate Rec.`,
            `${player.name} official ${statusLabel(player)}.`,
            practiceClause(player),
            `Heir ${heir.name}, then slot ${slot.name}.`,
            beatModifier(player),
          ]),
          source,
        }),
      );
    }
  }
}

function applyQuestionable(
  game: GameInput,
  side: TeamSide,
  player: ListedPlayer,
  out: Lean[],
) {
  if (!isStarterRole(player.role) && player.role !== "WR2" && player.role !== "TE2") {
    return;
  }
  const family = volumeFamily(player);
  if (!family || family === "Sacks") return;

  const limitedFri = player.practice.fri === "Limited";
  const starterConf: Confidence = limitedFri ? "Med" : "Low";
  const heir = primaryHeir(side, player);
  const source = sourcesOf(player, heir ? ["ESPN depth chart"] : []);

  out.push(
    makeLean({
      game,
      team: side.abbr,
      player,
      direction: "downgrade",
      confidence: starterConf,
      propFamily: family,
      why: joinWhy([
        starterConf === "Low" ? `Thin: snap/play-risk only — do not dump the role.` : "",
        `${player.name} Downgrade ${family}.`,
        `${player.name} official ${statusLabel(player)}.`,
        practiceClause(player),
        `Heir ${heir?.name ?? "none"}.`,
        `Questionable is not Out.`,
        beatModifier(player),
      ]),
      source,
    }),
  );

  if (heir && family !== "Pass") {
    out.push(
      makeLean({
        game,
        team: side.abbr,
        player: heir,
        direction: "elevate",
        confidence: "Low",
        propFamily: family,
        why: joinWhy([
          `Only if ${player.name} sits.`,
          `${heir.name} Elevate ${family}.`,
          `${player.name} official ${statusLabel(player)}.`,
          practiceClause(player),
          `Heir ${heir.name} — contingent, not a full elevate.`,
          beatModifier(player),
        ]),
        source,
      }),
    );
  }
}

function applyLimited(
  game: GameInput,
  side: TeamSide,
  player: ListedPlayer,
  out: Lean[],
) {
  const family = volumeFamily(player);
  if (!family || family === "Sacks" || family === "TD") return;

  const heir = primaryHeir(side, player);
  out.push(
    makeLean({
      game,
      team: side.abbr,
      player,
      direction: "downgrade",
      confidence: "Med",
      propFamily: family,
      why: joinWhy([
        `${player.name} Downgrade ${family}.`,
        `${player.name} official ${statusLabel(player)}.`,
        practiceClause(player),
        `Heir ${heir?.name ?? "none"} — Limited week is volume down, not Out. Backup is not fully up. TD stays unless they lose the goal line.`,
        beatModifier(player),
      ]),
      source: sourcesOf(player),
    }),
  );
}

function applyBeatOnly(
  game: GameInput,
  side: TeamSide,
  player: ListedPlayer,
  out: Lean[],
) {
  const family = volumeFamily(player);
  if (!family) return;
  const heir = primaryHeir(side, player);
  out.push(
    makeLean({
      game,
      team: side.abbr,
      player,
      direction: "downgrade",
      confidence: "Low",
      propFamily: family,
      why: joinWhy([
        `Thin: beat note only; no official status change for ${player.name}.`,
        `${player.name} Downgrade ${family}.`,
        `${player.name} official ${statusLabel(player)}.`,
        practiceClause(player),
        `Heir ${heir?.name ?? "none"}.`,
        beatModifier(player),
      ]),
      source: sourcesOf(player),
    }),
  );
}

function dedupe(leans: Lean[]): Lean[] {
  const map = new Map<string, Lean>();
  for (const lean of leans) {
    const key = `${lean.playerId}:${lean.direction}:${lean.propFamily}`;
    const prev = map.get(key);
    if (!prev || CONF_RANK[lean.confidence] > CONF_RANK[prev.confidence]) {
      map.set(key, lean);
    }
  }
  return Array.from(map.values());
}

export function inferLeans(game: GameInput): Lean[] {
  const out: Lean[] = [];
  for (const side of [game.home, game.away]) {
    for (const player of side.listed) {
      const situation = classifySituation(player);
      switch (situation) {
        case "drop":
          break;
        case "out":
          applyOutLike(
            game,
            side,
            player,
            { official: true, confidence: "High", tagIfSits: false },
            out,
          );
          break;
        case "out_lean":
          applyOutLike(
            game,
            side,
            player,
            { official: false, confidence: "Med", tagIfSits: false },
            out,
          );
          break;
        case "doubtful":
          applyOutLike(
            game,
            side,
            player,
            { official: false, confidence: "Med", tagIfSits: true },
            out,
          );
          break;
        case "questionable":
          applyQuestionable(game, side, player, out);
          break;
        case "limited":
          applyLimited(game, side, player, out);
          break;
        case "beat_only":
          applyBeatOnly(game, side, player, out);
          break;
      }
    }
  }
  return dedupe(out);
}

export function inferLeansForGames(games: GameInput[]): Lean[] {
  return games.flatMap(inferLeans);
}
