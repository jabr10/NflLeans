# Footage

Weekly NFL **betting research**. Not a sportsbook.

Footage is a new Next.js app. It is not the MLB BettingApp.

Home is the **next unplayed NFL slate** in `America/New_York` (Week 1 when preseason is finished). Each board has two piles: **Elevates** and **Downgrades**. Healthy players who were Full all week do not appear. Finished exhibitions collapse to a one-line chip — never a 16-game schedule.

## Coach Spo’s injury-to-props

Leans are inferred in this order:

1. Official practice (DNP / Limited / Full, Wed–Thu–Fri)
2. Official status (Out / Doubtful / Questionable)
3. Depth-chart heir
4. Beat notes as modifiers (cannot create High confidence alone)

The engine lives in `src/lib/engine` and is covered by acceptance unit tests.

## Data

Public ESPN endpoints only (schedule, injuries, depth charts, news). Legal public fetches. If a source fails, the rest of the board still renders with a warning. Injuries and quotes are never invented.

Official NFL.com Wed–Thu–Fri practice columns are not available as structured public JSON. Practice days stay `unlisted` unless an ESPN comment names the day.

If this calendar week is preseason or empty, Footage says so in a one-line chip and shows the next unplayed regular-season board, or “No betting slate yet.”

## Stack

Next.js App Router, TypeScript, Vercel Hobby.

- Fetches are cached. On Vercel the cache directory is `/tmp`. Cache writes never crash the request.
- `maxDuration` is 60 seconds (Hobby cap).
- First paint is the betting board (next unplayed slate), not a finished preseason schedule.

## Scripts

```bash
npm run dev
npm test
npm run build
```

## Product rules we do not break

No lock / +EV, no spread / total / moneyline, no due-for-a-TD, no last-week form, no listing Out players as self-downgrades, no treating Limited or Questionable as Out, no Instagram scrape, no live sportsbook odds, no fantasy PPR / start-sit.
