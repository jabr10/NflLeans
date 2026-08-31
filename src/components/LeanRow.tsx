import type { BoardGame } from "@/lib/data/week";
import type { Lean } from "@/lib/engine/types";
import { formatKickCompact } from "@/lib/format";
import { leanTag, pillTone } from "@/lib/leanDisplay";

export function LeanRow({ lean, game }: { lean: Lean; game: BoardGame }) {
  const tag = leanTag(lean);
  const tone = pillTone(lean.propFamily);
  const matchup = `${game.away.abbr} @ ${game.home.abbr}`;
  const kick = formatKickCompact(game.kickoff);

  return (
    <details className="lean-row">
      <summary>
        <div className="lean-text">
          <div className="lean-top">
            <span className="lean-name">{lean.player}</span>
            <span className={`pill pill-${tone}`}>{lean.propFamily}</span>
          </div>
          <p className="lean-meta">
            {tag ? <span className="meta-context">{tag.context} · </span> : null}
            <span>{matchup}</span>
            <span className="meta-kick"> · {kick}</span>
          </p>
        </div>
        <div className="lean-aside">
          <span className={`pill pill-${tone}`}>{lean.propFamily}</span>
          {tag?.rail ? <span className="tag-rail">{tag.rail}</span> : null}
          {tag?.badge === "Q" ? <span className="status-badge">Q</span> : null}
          {tag?.badge === "OUT" ? <span className="status-badge status-out">OUT</span> : null}
          <svg className="chevron" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6.2 3.2a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06l-4 4A.75.75 0 0 1 6.2 11.2L9.48 8 6.2 4.74a.75.75 0 0 1 0-1.54Z"
            />
          </svg>
        </div>
      </summary>
      <div className="beat">
        {lean.why}
        <span className="beat-src">{lean.source}</span>
      </div>
    </details>
  );
}
