import type { WebSummary, WebSuite, WebEntry } from "@cubric/bench/web";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  accuracyBarColor,
  accuracyPill,
  fmtCost,
  fmtLatency,
  pct,
  splitModel,
} from "@/lib/format";

interface SuiteMeta {
  title: string;
  blurb: string;
  /** Column header shown for each variant cell. */
  variantLabel: (v: string) => string;
}

const SUITE_META: Record<string, SuiteMeta> = {
  scramble: {
    title: "Scramble",
    blurb:
      "Solve a cube scrambled with N random face moves, given the full six-face state as text.",
    variantLabel: (v) => `${v}m`,
  },
};

function suiteMeta(id: string): SuiteMeta {
  return SUITE_META[id] ?? { title: id, blurb: "", variantLabel: (v) => v };
}

export function Leaderboard({ summary }: { summary: WebSummary }) {
  const boards = summary.suites
    .map((suite) => ({
      suite,
      entries: summary.entries.filter((e) => e.suiteId === suite.suiteId),
    }))
    .filter(({ entries }) => entries.some((e) => e.complete));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Cubric Bench</h1>
        <p className="mt-2 text-muted-foreground">
          How well can LLMs reason about Rubik&apos;s cube states?
        </p>
      </header>

      <div className="space-y-10">
        {boards.map(({ suite, entries }) => (
          <SuiteBoard key={suite.suiteId} suite={suite} entries={entries} />
        ))}
      </div>

      <footer className="mt-12 text-xs text-muted-foreground">
        Generated {new Date(summary.generatedAt).toLocaleString()}
      </footer>
    </div>
  );
}

function SuiteBoard({
  suite,
  entries,
}: {
  suite: WebSuite;
  entries: WebEntry[];
}) {
  const meta = suiteMeta(suite.suiteId);
  const rows = entries
    .filter((e) => e.complete)
    .sort((a, b) => b.accuracy - a.accuracy);
  const hidden = entries.length - rows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.title}</CardTitle>
        {meta.blurb && <CardDescription>{meta.blurb}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-right">#</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Reasoning</TableHead>
              <TableHead className="w-[180px]">Accuracy</TableHead>
              {suite.variants.map((v) => (
                <TableHead key={v} className="text-center">
                  {meta.variantLabel(v)}
                </TableHead>
              ))}
              <TableHead className="text-right">Cost/case</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((entry, i) => (
              <EntryRow
                key={entry.entryId}
                entry={entry}
                rank={i + 1}
                variants={suite.variants}
              />
            ))}
          </TableBody>
        </Table>
        {hidden > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {hidden} incomplete {hidden === 1 ? "entry" : "entries"} hidden
            (runs still in progress).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EntryRow({
  entry,
  rank,
  variants,
}: {
  entry: WebEntry;
  rank: number;
  variants: string[];
}) {
  const { provider, name } = splitModel(entry.model);
  const byVariant = new Map(entry.byVariant.map((v) => [v.variant, v]));

  return (
    <TableRow>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {rank}
      </TableCell>
      <TableCell>
        <div className="font-medium">{name}</div>
        {provider && (
          <div className="text-xs text-muted-foreground">{provider}</div>
        )}
      </TableCell>
      <TableCell>
        {entry.reasoningEffort ? (
          <Badge variant="secondary" className="capitalize">
            {entry.reasoningEffort}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">default</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-full max-w-[90px] overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${entry.accuracy * 100}%`,
                backgroundColor: accuracyBarColor(entry.accuracy),
              }}
            />
          </div>
          <span className="w-9 text-right text-sm font-medium tabular-nums">
            {pct(entry.accuracy)}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {entry.solved}/{entry.totalCases} solved
        </div>
      </TableCell>
      {variants.map((v) => {
        const stat = byVariant.get(v);
        return (
          <TableCell key={v} className="text-center">
            {stat ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-xs font-medium tabular-nums"
                    style={accuracyPill(stat.accuracy)}
                  >
                    {pct(stat.accuracy)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {stat.solved}/{stat.total} solved
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      })}
      <TableCell className="text-right text-sm tabular-nums">
        {fmtCost(entry.cost.avgPerCase)}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
        {fmtLatency(entry.avgLatencyMs)}
      </TableCell>
    </TableRow>
  );
}
