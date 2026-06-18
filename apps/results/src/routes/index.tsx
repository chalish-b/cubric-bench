import { createFileRoute } from "@tanstack/react-router";
import { loadSummary } from "@/lib/data";
import { Leaderboard } from "@/components/Leaderboard";

export const Route = createFileRoute("/")({
  loader: () => loadSummary(),
  component: Home,
  pendingComponent: () => (
    <div className="p-10 text-muted-foreground">Loading…</div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-destructive">
      Failed to load data: {String(error)}
    </div>
  ),
});

function Home() {
  const summary = Route.useLoaderData();
  return <Leaderboard summary={summary} />;
}
