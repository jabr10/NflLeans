# NflLeans

Weekly NFL **betting research**. Not a sportsbook.

Eyebrow: “Weekly betting research · not a sportsbook.”

NflLeans is a new Next.js app. It is not the MLB BettingApp.

Home is **this NFL week** in `America/New_York`. Each game has two piles: **Elevates** and **Downgrades**. Healthy players who were Full all week do not appear.

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

If this calendar week is preseason or empty, the UI says so and still shows any available Week 1 / preseason slate.

## Stack

Next.js App Router, TypeScript, Vercel Hobby.

- Fetches are cached. On Vercel the cache directory is `/tmp`. Cache writes never crash the request.
- `maxDuration` is 60 seconds (Hobby cap).
- First paint loads the schedule first. Leans stream in when ready.

## Scripts

```bash
npm run dev
npm test
npm run build
```

## Product rules we do not break

No lock / +EV, no spread / total / moneyline, no due-for-a-TD, no last-week form, no listing Out players as self-downgrades, no treating Limited or Questionable as Out, no Instagram scrape, no live sportsbook odds, no fantasy PPR / start-sit.
