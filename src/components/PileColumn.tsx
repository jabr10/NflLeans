import type { BoardGame } from "@/lib/data/week";
import type { Lean } from "@/lib/engine/types";
import { LeanRow } from "./LeanRow";

export function PileColumn({
  kind,
  count,
  rows,
  empty,
}: {
  kind: "elevates" | "downgrades";
  count: number;
  rows: Array<{ lean: Lean; game: BoardGame }>;
  empty: string;
}) {
  const up = kind === "elevates";
  return (
    <section className="pile" aria-label={up ? "Elevates" : "Downgrades"}>
      <header className={`pile-head ${up ? "pile-up" : "pile-down"}`}>
        {up ? (
          <svg className="pile-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6.2 12.1 2.7 8.6a.75.75 0 0 1 1.06-1.06l2.44 2.44 5.97-5.97a.75.75 0 0 1 1.06 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0Z"
            />
          </svg>
        ) : (
          <svg className="pile-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M3.2 2.2h6.04c.3 0 .58.16.73.42l2.83 4.88a.85.85 0 0 1 0 .9L9.97 13.3a.85.85 0 0 1-.73.42H3.2A1.2 1.2 0 0 1 2 12.52V3.4A1.2 1.2 0 0 1 3.2 2.2Z"
            />
          </svg>
        )}
        <h2 className="pile-label">{up ? "ELEVATES" : "DOWNGRADES"}</h2>
        <span className="pile-count">{count}</span>
      </header>
      {rows.length === 0 ? (
        <p className="empty-line">{empty}</p>
      ) : (
        <ul className="pile-list">
          {rows.map((row) => (
            <li key={row.lean.id}>
              <LeanRow lean={row.lean} game={row.game} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
