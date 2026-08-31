import Link from "next/link";
import { formatAsOf } from "@/lib/format";

export function AppHeader({
  asOf,
  onRefresh,
  refreshing,
}: {
  asOf?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <header className="masthead">
      <Link href="/" className="brand" aria-label="Footage">
        <picture className="brand-lockup brand-lockup-dark">
          <source media="(min-width: 840px)" srcSet="/footage-wordmark.png" />
          <img
            className="brand-mark-img"
            src="/footage-wordmark-compact.png"
            alt=""
            height={28}
          />
        </picture>
        <picture className="brand-lockup brand-lockup-light">
          <source media="(min-width: 840px)" srcSet="/footage-wordmark-light.png" />
          <img
            className="brand-mark-img"
            src="/footage-wordmark-compact-light.png"
            alt=""
            height={28}
          />
        </picture>
      </Link>
      {asOf || onRefresh ? (
        <div className="mast-tools">
          {asOf ? <p className="asof">as of {formatAsOf(asOf)}</p> : null}
          {onRefresh ? (
            <button
              type="button"
              className="refresh-btn"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={refreshing ? "Refreshing the board" : "Refresh the board"}
            >
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}