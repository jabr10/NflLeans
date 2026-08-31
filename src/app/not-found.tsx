import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="page">
        <h1 className="week-title" style={{ fontStyle: "italic" }}>
          Not on the board
        </h1>
        <p className="empty-page">That matchup is not in this week’s public slate.</p>
        <Link href="/" className="back">
          ← This week
        </Link>
      </main>
    </>
  );
}
