import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1 className="font-display text-[2rem] tracking-tight">Game not on the board</h1>
      <p className="mt-3 text-ink-soft">That matchup is not in this week’s public slate.</p>
      <Link href="/" className="back tap-target mt-4">
        ← This week
      </Link>
    </main>
  );
}
