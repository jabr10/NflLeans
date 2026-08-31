import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LeansSection } from "@/components/LeansSection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function BoardPending() {
  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="live-chip" aria-hidden="true">
          <span className="live-dot" />
          <span>Loading the board…</span>
        </div>
        <p className="empty-page" aria-live="polite">
          Researching injury-to-prop leans…
        </p>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<BoardPending />}>
      <LeansSection />
    </Suspense>
  );
}
