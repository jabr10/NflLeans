import type { PracticeMark, PracticeWeek } from "./types";

const DAY_TO_KEY: Record<string, keyof PracticeWeek> = {
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  wed: "wed",
  thu: "thu",
  fri: "fri",
};

const EMPTY: PracticeWeek = { wed: null, thu: null, fri: null };

function markFromWord(word: string): PracticeMark | null {
  const w = word.toLowerCase();
  if (w === "dnp" || w.includes("did not practice") || w === "out of practice") {
    return "DNP";
  }
  if (w.startsWith("limited")) return "Limited";
  if (w.startsWith("full")) return "Full";
  return null;
}

function apply(week: PracticeWeek, day: keyof PracticeWeek, mark: PracticeMark) {
  week[day] = mark;
}

/**
 * Conservative parser. Only fills a day when the text clearly ties
 * DNP / Limited / Full to Wednesday, Thursday, or Friday.
 * Does not treat "did not play" (game) as practice DNP.
 */
export function parsePracticeFromText(text: string | null | undefined): PracticeWeek {
  const week: PracticeWeek = { ...EMPTY };
  if (!text) return week;

  const src = text.replace(/\s+/g, " ");

  const triple = src.match(
    /\b(DNP|Limited|Full)\s*[-/]\s*(DNP|Limited|Full)\s*[-/]\s*(DNP|Limited|Full)\b/i,
  );
  if (triple) {
    week.wed = markFromWord(triple[1]);
    week.thu = markFromWord(triple[2]);
    week.fri = markFromWord(triple[3]);
    return week;
  }

  const patterns: RegExp[] = [
    /\b(did not practice|DNP|limited(?: participant)?|full(?: participant| practice)?)\b[^.]{0,40}\b(wednesday|thursday|friday|wed|thu|fri)\b/gi,
    /\b(wednesday|thursday|friday|wed|thu|fri)\b[^.]{0,40}\b(did not practice|DNP|limited(?: participant)?|full(?: participant| practice)?)\b/gi,
  ];

  for (const re of patterns) {
    for (const match of src.matchAll(re)) {
      const a = match[1].toLowerCase();
      const b = match[2].toLowerCase();
      const dayKey = DAY_TO_KEY[a] ?? DAY_TO_KEY[b];
      const mark = markFromWord(DAY_TO_KEY[a] ? b : a);
      if (dayKey && mark) apply(week, dayKey, mark);
    }
  }

  return week;
}

export function looksLikeRest(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\b(veteran rest|rest day|not injury[- ]related|rested? (him|them|the )\w+)\b/i.test(
    text,
  );
}

export function formatPracticeTriple(practice: PracticeWeek): string {
  const cell = (m: PracticeMark | null) => m ?? "unlisted";
  return `${cell(practice.wed)}-${cell(practice.thu)}-${cell(practice.fri)}`;
}

export function mergePractice(a: PracticeWeek, b: PracticeWeek): PracticeWeek {
  return {
    wed: a.wed ?? b.wed,
    thu: a.thu ?? b.thu,
    fri: a.fri ?? b.fri,
  };
}
