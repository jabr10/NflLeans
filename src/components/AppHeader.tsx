import Link from "next/link";
import { formatAsOf } from "@/lib/format";

export function AppHeader({ asOf }: { asOf?: string }) {
  return (
    <header className="masthead">
      <Link href="/" className="brand" aria-label="Footage">
        <span className="brand-lockup">
          {/* Arthur football-oo mark: drop the PNG in this slot to replace typeset FOOTAGE. */}
          <span className="brand-oo-slot" aria-hidden="true" />
          <span className="brand-mark">FOOTAGE</span>
        </span>
      </Link>
      {asOf ? <p className="asof">as of {formatAsOf(asOf)}</p> : null}
    </header>
  );
}
