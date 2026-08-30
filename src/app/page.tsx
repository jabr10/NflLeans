import { Suspense } from "react";
import { LeansSection } from "@/components/LeansSection";
import { ScheduleStrip } from "@/components/ScheduleStrip";
import { loadSchedule } from "@/lib/data/week";
import { SourceError } from "@/lib/data/fetchPublic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function LeansPending() {
  return (
    <div className="honest" aria-live="polite">
      <p>Schedule is up. Researching injury-to-prop leans…</p>
    </div>
  );
}

export default async function Home() {
  let scheduleError: string | null = null;
  let schedule = null;
  try {
    schedule = await loadSchedule();
  } catch (err) {
    scheduleError =
      err instanceof SourceError
        ? err.message
        : "The public NFL schedule could not be loaded.";
  }

  return (
    <main className="page">
      {schedule ? (
        <ScheduleStrip schedule={schedule} />
      ) : (
        <div className="honest">
          <p>{scheduleError}</p>
        </div>
      )}
      <Suspense fallback={<LeansPending />}>
        <LeansSection />
      </Suspense>
    </main>
  );
}
