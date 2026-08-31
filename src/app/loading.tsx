import { AppHeader } from "@/components/AppHeader";

export default function Loading() {
  return (
    <>
      <AppHeader />
      <main className="page">
        <p className="empty-page">Loading research…</p>
      </main>
    </>
  );
}
