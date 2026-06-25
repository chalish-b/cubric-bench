import type { WebEntryDetail, WebSummary } from "@cubric/bench/web";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { ProviderLogo } from "@/components/ProviderLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GitHubLink } from "@/components/GitHubLink";
import { PeerFalloffChart } from "@/components/PeerFalloffChart";
import { CaseBrowser } from "@/components/CaseBrowser";
import { providerColor } from "@/lib/providers";
import { fmtCost, splitModel } from "@/lib/format";
import { outcomeMeta } from "@/lib/outcomes";
import { suiteMeta } from "@/lib/suites";

export function RunDetail({
  summary,
  detail,
  selectedCaseId,
  onSelectCase,
}: {
  summary: WebSummary;
  detail: WebEntryDetail;
  selectedCaseId?: string;
  onSelectCase: (caseId: string) => void;
}) {
  const entry = summary.entries.find((e) => e.entryId === detail.entryId);
  const suite = entry && summary.suites.find((s) => s.suiteId === entry.suiteId);

  if (!entry || !suite) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <p className="mt-6 text-muted-foreground">Run not found.</p>
      </div>
    );
  }

  const peers = summary.entries.filter(
    (e) => e.suiteId === entry.suiteId && e.complete,
  );
  const { name } = splitModel(entry.model);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </Link>
        <div className="flex items-center gap-1">
          <GitHubLink />
          <ThemeToggle />
        </div>
      </div>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <ProviderLogo
            provider={entry.provider}
            className="size-7 shrink-0"
            style={{ color: providerColor(entry.provider) }}
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <div className="mt-1 text-sm capitalize text-muted-foreground">
              {entry.reasoningEffort ?? "default"} reasoning
              <span className="px-1.5 lowercase">·</span>
              <span className="lowercase">{entry.modalityLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-8">
          <Stat
            label="Accuracy"
            value={`${Math.round(entry.accuracy * 100)}%`}
            sub={`${entry.solved}/${entry.totalCases}`}
          />
          <Stat
            label="Total cost"
            value={fmtCost(entry.cost.total)}
            sub={`${fmtCost(entry.cost.avgPerCase)}/case`}
          />
        </div>
      </header>

      <section className="mb-10">
        <OutcomeBar outcomes={entry.outcomes} total={entry.totalCases} />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-semibold">Cases</h2>
        <CaseBrowser
          detail={detail}
          suite={suite}
          selectedCaseId={selectedCaseId}
          onSelectCase={onSelectCase}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold">
          Accuracy by {suiteMeta(suite.suiteId).variantAxis}
        </h2>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
          This model highlighted against the rest.
        </p>
        <PeerFalloffChart suite={suite} peers={peers} entryId={entry.entryId} />
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs tabular-nums text-muted-foreground">{sub}</div>
    </div>
  );
}

function OutcomeBar({
  outcomes,
  total,
}: {
  outcomes: Partial<Record<string, number>>;
  total: number;
}) {
  const segments = (Object.entries(outcomes) as [string, number][])
    .filter(([, n]) => n > 0)
    .sort(
      (a, b) => Number(outcomeMeta(b[0]).success) - Number(outcomeMeta(a[0]).success),
    );

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map(([o, n]) => (
          <div
            key={o}
            style={{ width: `${(n / total) * 100}%`, backgroundColor: outcomeMeta(o).color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map(([o, n]) => (
          <span key={o} className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: outcomeMeta(o).color }}
            />
            {n} {outcomeMeta(o).label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
