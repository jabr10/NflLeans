import type { Lean } from "@/lib/engine/types";
import { formatKickoff } from "@/lib/format";

export function LeanRow({ lean }: { lean: Lean }) {
  const up = lean.direction === "elevate";
  return (
    <article className={`lean-row ${up ? "lean-up" : "lean-down"}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[1.35rem] leading-none tracking-tight">{lean.player}</p>
          <p className="mt-1 text-[13px] text-ink-soft">
            {lean.team} · vs {lean.opponent} · {formatKickoff(lean.kickoff)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`stamp ${up ? "stamp-up" : "stamp-down"}`}>
            {up ? "Elevate" : "Downgrade"}
          </span>
          <span className={`stamp stamp-conf conf-${lean.confidence.toLowerCase()}`}>
            {lean.confidence}
          </span>
        </div>
      </header>
      <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft">
        {lean.propFamily}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed">{lean.why}</p>
      <p className="mt-2 font-mono text-[11px] text-ink-soft">{lean.source}</p>
    </article>
  );
}
