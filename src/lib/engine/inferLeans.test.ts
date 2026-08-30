import { describe, expect, it } from "vitest";
import { inferLeans } from "./inferLeans";
import { parsePracticeFromText } from "./practice";
import type {
  DepthPlayer,
  GameInput,
  ListedPlayer,
  PracticeWeek,
  Role,
  TeamSide,
} from "./types";

const EMPTY_PRACTICE: PracticeWeek = { wed: null, thu: null, fri: null };

function depth(
  id: string,
  name: string,
  role: Role,
  depthOrder: number,
  extra: Partial<DepthPlayer> = {},
): DepthPlayer {
  return {
    id,
    name,
    position: role.replace(/\d/g, ""),
    depthOrder,
    role,
    ...extra,
  };
}

function listed(
  player: DepthPlayer,
  extra: Partial<ListedPlayer> = {},
): ListedPlayer {
  return {
    ...player,
    practice: EMPTY_PRACTICE,
    status: null,
    beatNotes: [],
    sources: ["ESPN injury report"],
    ...extra,
  };
}

function side(
  abbr: string,
  name: string,
  depthChart: DepthPlayer[],
  listedPlayers: ListedPlayer[],
  rbCommittee = false,
): TeamSide {
  return { abbr, name, depth: depthChart, listed: listedPlayers, rbCommittee };
}

function game(home: TeamSide, away: TeamSide): GameInput {
  return {
    id: "game-1",
    kickoff: "2026-09-13T17:00:00.000Z",
    home,
    away,
  };
}

describe("Coach Spo injury-to-props", () => {
  it("Out RB1 → one High Rush elevate for the clear heir, not a spray", () => {
    const rb1 = depth("rb1", "Breece Hall", "RB1", 1);
    const rb2 = depth("rb2", "Braelon Allen", "RB2", 2);
    const wr1 = depth("wr1", "Garrett Wilson", "WR1", 1);
    const jets = side(
      "NYJ",
      "New York Jets",
      [rb1, rb2, wr1],
      [
        listed(rb1, {
          status: "Out",
          practice: { wed: "DNP", thu: "DNP", fri: "DNP" },
        }),
      ],
    );
    const bills = side("BUF", "Buffalo Bills", [depth("e1", "Greg Rousseau", "EDGE1", 1)], []);

    const leans = inferLeans(game(bills, jets));
    const elevates = leans.filter((l) => l.direction === "elevate");

    expect(elevates).toHaveLength(1);
    expect(elevates[0]).toMatchObject({
      player: "Braelon Allen",
      direction: "elevate",
      confidence: "High",
      propFamily: "Rush",
    });
    expect(leans.filter((l) => l.player === "Breece Hall")).toHaveLength(0);
    expect(leans.filter((l) => l.propFamily === "Rec")).toHaveLength(0);
    expect(elevates[0].why).toContain("Braelon Allen");
    expect(elevates[0].why).toContain("Out");
    expect(elevates[0].why).toContain("DNP-DNP-DNP");
    expect(elevates[0].why).toContain("Braelon Allen");
  });

  it("Questionable WR → Low contingent backup + Low-Med snap-risk on the WR", () => {
    const wr1 = depth("wr1", "Garrett Wilson", "WR1", 1);
    const wr2 = depth("wr2", "Josh Reynolds", "WR2", 2);
    const jets = side(
      "NYJ",
      "New York Jets",
      [wr1, wr2],
      [listed(wr1, { status: "Questionable", practice: { wed: "Full", thu: "Limited", fri: "Limited" } })],
    );
    const bills = side("BUF", "Buffalo Bills", [], []);

    const leans = inferLeans(game(bills, jets));
    const wrDown = leans.find((l) => l.player === "Garrett Wilson");
    const heirUp = leans.find((l) => l.player === "Josh Reynolds");

    expect(wrDown).toBeDefined();
    expect(wrDown?.direction).toBe("downgrade");
    expect(wrDown?.propFamily).toBe("Rec");
    expect(["Low", "Med"]).toContain(wrDown?.confidence);
    expect(heirUp).toBeDefined();
    expect(heirUp?.direction).toBe("elevate");
    expect(heirUp?.confidence).toBe("Low");
    expect(heirUp?.propFamily).toBe("Rec");
    expect(heirUp?.why.startsWith("Only if Garrett Wilson sits.")).toBe(true);
  });

  it("Limited week → volume down, backup not fully up", () => {
    const rb1 = depth("rb1", "Saquon Barkley", "RB1", 1);
    const rb2 = depth("rb2", "Will Shipley", "RB2", 2);
    const eagles = side(
      "PHI",
      "Philadelphia Eagles",
      [rb1, rb2],
      [
        listed(rb1, {
          status: null,
          practice: { wed: "Limited", thu: "Limited", fri: "Limited" },
        }),
      ],
    );
    const cowboys = side("DAL", "Dallas Cowboys", [], []);

    const leans = inferLeans(game(eagles, cowboys));
    const down = leans.find((l) => l.player === "Saquon Barkley");
    const backup = leans.filter((l) => l.player === "Will Shipley");

    expect(down).toMatchObject({
      direction: "downgrade",
      confidence: "Med",
      propFamily: "Rush",
    });
    expect(backup.some((l) => l.direction === "elevate" && (l.confidence === "High" || l.confidence === "Med"))).toBe(
      false,
    );
  });

  it("Full Friday after early DNP → row gone", () => {
    const wr1 = depth("wr1", "A.J. Brown", "WR1", 1);
    const wr2 = depth("wr2", "DeVonta Smith", "WR2", 2);
    const eagles = side(
      "PHI",
      "Philadelphia Eagles",
      [wr1, wr2],
      [
        listed(wr1, {
          status: "Questionable",
          practice: { wed: "DNP", thu: "DNP", fri: "Full" },
        }),
      ],
    );

    expect(inferLeans(game(eagles, side("DAL", "Dallas Cowboys", [], [])))).toHaveLength(0);
  });

  it("Limited → Full Friday is Neutral and drops the row", () => {
    const rb1 = depth("rb1", "Bijan Robinson", "RB1", 1);
    const rb2 = depth("rb2", "Tyler Allgeier", "RB2", 2);
    const falcons = side(
      "ATL",
      "Atlanta Falcons",
      [rb1, rb2],
      [listed(rb1, { status: null, practice: { wed: "Limited", thu: "Limited", fri: "Full" } })],
    );
    expect(inferLeans(game(falcons, side("MIN", "Minnesota Vikings", [], [])))).toHaveLength(0);
  });

  it("DNP-DNP-DNP elevates the heir at Med until official Out", () => {
    const rb1 = depth("rb1", "Josh Jacobs", "RB1", 1);
    const rb2 = depth("rb2", "Emanuel Wilson", "RB2", 2);
    const pack = side(
      "GB",
      "Green Bay Packers",
      [rb1, rb2],
      [listed(rb1, { status: null, practice: { wed: "DNP", thu: "DNP", fri: "DNP" } })],
    );
    const leans = inferLeans(game(pack, side("CHI", "Chicago Bears", [], [])));
    expect(leans).toHaveLength(1);
    expect(leans[0]).toMatchObject({
      player: "Emanuel Wilson",
      confidence: "Med",
      propFamily: "Rush",
      direction: "elevate",
    });
  });

  it("Out to a 3-way RB committee caps High", () => {
    const rb1 = depth("rb1", "Alvin Kamara", "RB1", 1);
    const rb2 = depth("rb2", "Kendre Miller", "RB2", 2);
    const rb3 = depth("rb3", "Clyde Edwards-Helaire", "RB3", 3);
    const saints = side(
      "NO",
      "New Orleans Saints",
      [rb1, rb2, rb3],
      [listed(rb1, { status: "Out", practice: { wed: "DNP", thu: "DNP", fri: "DNP" } })],
      true,
    );
    const leans = inferLeans(game(saints, side("ATL", "Atlanta Falcons", [], [])));
    const rushUp = leans.filter((l) => l.direction === "elevate" && l.propFamily === "Rush");
    expect(rushUp).toHaveLength(1);
    expect(rushUp[0].confidence).toBe("Med");
  });

  it("Doubtful elevates the heir at Med and tags if he sits", () => {
    const qb1 = depth("qb1", "Joe Burrow", "QB1", 1);
    const qb2 = depth("qb2", "Jake Browning", "QB2", 2);
    const bengals = side(
      "CIN",
      "Cincinnati Bengals",
      [qb1, qb2],
      [listed(qb1, { status: "Doubtful", practice: { wed: "DNP", thu: "Limited", fri: "DNP" } })],
    );
    const leans = inferLeans(game(bengals, side("CLE", "Cleveland Browns", [depth("e1", "Myles Garrett", "EDGE1", 1)], [])));
    const pass = leans.find((l) => l.player === "Jake Browning" && l.propFamily === "Pass");
    expect(pass?.confidence).toBe("Med");
    expect(pass?.why).toMatch(/If Joe Burrow sits/i);
    expect(leans.some((l) => l.player === "Joe Burrow" && l.direction === "downgrade")).toBe(false);
  });

  it("beat notes cannot create High confidence alone", () => {
    const wr1 = depth("wr1", "Tyreek Hill", "WR1", 1);
    const wr2 = depth("wr2", "Jaylen Waddle", "WR2", 2);
    const mia = side(
      "MIA",
      "Miami Dolphins",
      [wr1, wr2],
      [
        listed(wr1, {
          status: null,
          practice: { wed: "Full", thu: "Full", fri: "Full" },
          beatNotes: ["Hill is expected to be fine, a team source said."],
        }),
      ],
    );
    const leans = inferLeans(game(mia, side("NYJ", "New York Jets", [], [])));
    expect(leans.every((l) => l.confidence !== "High")).toBe(true);
  });

  it("rest DNP that becomes Full does not elevate the backup", () => {
    const rb1 = depth("rb1", "Derrick Henry", "RB1", 1);
    const rb2 = depth("rb2", "Justice Hill", "RB2", 2);
    const ravens = side(
      "BAL",
      "Baltimore Ravens",
      [rb1, rb2],
      [
        listed(rb1, {
          rest: true,
          practice: { wed: "DNP", thu: "DNP", fri: "Full" },
          beatNotes: ["Veteran rest day Wednesday."],
        }),
      ],
    );
    expect(inferLeans(game(ravens, side("PIT", "Pittsburgh Steelers", [], [])))).toHaveLength(0);
  });
});

describe("practice parser", () => {
  it("reads an explicit Wed-Thu-Fri triple", () => {
    expect(parsePracticeFromText("Practice: DNP-DNP-DNP this week")).toEqual({
      wed: "DNP",
      thu: "DNP",
      fri: "DNP",
    });
  });

  it("reads day-tied comments and ignores did-not-play", () => {
    const week = parsePracticeFromText(
      "Did not practice Wednesday. Limited Thursday. Full participant Friday. He did not play in Friday's preseason game.",
    );
    expect(week).toEqual({ wed: "DNP", thu: "Limited", fri: "Full" });
  });
});
