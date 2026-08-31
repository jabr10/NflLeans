import type { ExhibitionStatus } from "@/lib/data/types";

/** One-line product description under the Footage lockup. */
export const PRODUCT_TAGLINE = "Who should see more playing time this week.";

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
