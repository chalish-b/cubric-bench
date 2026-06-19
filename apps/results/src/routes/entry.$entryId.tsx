import { createFileRoute } from "@tanstack/react-router";
import { loadEntryDetail, loadSummary } from "@/lib/data";
import { RunDetail } from "@/components/RunDetail";

interface EntrySearch {
  case?: string;
}

export const Route = createFileRoute("/entry/$entryId")({
  validateSearch: (search: Record<string, unknown>): EntrySearch => ({
    case: typeof search.case === "string" ? search.case : undefined,
  }),
  loader: async ({ params }) => {
    const [summary, detail] = await Promise.all([
      loadSummary(),
      loadEntryDetail(params.entryId),
    ]);
    return { summary, detail };
  },
  component: EntryPage,
  pendingComponent: () => (
    <div className="p-10 text-muted-foreground">Loading…</div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-destructive">Failed to load run: {String(error)}</div>
  ),
});

function EntryPage() {
  const { summary, detail } = Route.useLoaderData();
  const { case: caseId } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <RunDetail
      summary={summary}
      detail={detail}
      selectedCaseId={caseId}
      onSelectCase={(id) =>
        navigate({ search: { case: id }, replace: true, resetScroll: false })
      }
    />
  );
}
