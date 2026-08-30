import type { WeekSchedule } from "@/lib/data/week";
import { formatKickoff } from "@/lib/format";

export function ScheduleStrip({ schedule }: { schedule: WeekSchedule }) {
  const week = schedule.resolved;
  return (
    <section className="schedule-strip" aria-label="This week's games">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">This NFL week · {schedule.timezone}</p>
          <h1 className="font-display text-[2.35rem] leading-none tracking-tight">{week.label}</h1>
          {week.detail ? <p className="mt-2 text-[13px] text-ink-soft">{week.detail}</p> : null}
        </div>
        <p className="text-[12px] uppercase tracking-[0.14em] text-ink-soft">
          {schedule.games.length} games
        </p>
      </div>
      <ol className="kick-list">
        {schedule.games.map((game) => (
          <li key={game.id}>
            <span className="font-medium">
              {game.away.abbr} @ {game.home.abbr}
            </span>
            <span className="text-ink-soft"> · {formatKickoff(game.kickoff)}</span>
            {game.completed ? <span className="text-ink-soft"> · Final</span> : null}
          </li>
        ))}
      </ol>
      {week.isPreseason ? (
        <div className="honest">
          <p>
            {week.label} is still preseason. NflLeans does not invent injury-to-prop leans for an
            empty regular-season card. Week 1 is posted below when ESPN has the slate.
          </p>
        </div>
      ) : null}
    </section>
  );
}
