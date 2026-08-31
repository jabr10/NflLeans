import type { Lean, PropFamily } from "@/lib/engine/types";

export function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] ?? full;
}

export type LeanTag = {
  kind: "if-sits" | "out" | "q";
  /** Desktop right-rail text ("if Kittle sits" / "Jacobs OUT"). Empty for Q. */
  rail: string;
  /** Mobile meta prefix. */
  context: string;
  badge?: "Q" | "OUT";
};

const NAME = "([A-Z][A-Za-z.'-]*(?:\\s+[A-Z][A-Za-z.'-]+)*)";

export function leanTag(lean: Pick<Lean, "why" | "direction">): LeanTag | null {
  const onlyIf = lean.why.match(new RegExp(`^Only if ${NAME} sits\\.`));
  if (onlyIf) {
    const text = `if ${lastName(onlyIf[1])} sits`;
    return { kind: "if-sits", rail: text, context: text };
  }
  const ifSits = lean.why.match(new RegExp(`^If ${NAME} sits\\.`, "i"));
  if (ifSits) {
    const text = `if ${lastName(ifSits[1])} sits`;
    return { kind: "if-sits", rail: text, context: text };
  }
  if (lean.direction === "downgrade" && /Questionable/.test(lean.why)) {
    return { kind: "q", rail: "", context: "Q", badge: "Q" };
  }
  if (lean.direction === "elevate") {
    const officialOut = lean.why.match(new RegExp(`${NAME} official Out\\b`));
    const outLean = lean.why.match(new RegExp(`${NAME} Out-lean\\b`));
    const name = officialOut?.[1] ?? outLean?.[1];
    if (name) {
      const text = `${lastName(name)} OUT`;
      return { kind: "out", rail: text, context: text, badge: "OUT" };
    }
  }
  return null;
}

export function pillTone(family: PropFamily): "rec" | "rush" | "pass" {
  if (family === "Rush" || family === "TD") return "rush";
  if (family === "Pass") return "pass";
  return "rec";
}
