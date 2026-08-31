import Link from "next/link";
import { formatAsOf } from "@/lib/format";

export function AppHeader({ asOf }: { asOf?: string }) {
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
      {asOf ? <p className="asof">as of {formatAsOf(asOf)}</p> : null}
    </header>
  );
}
