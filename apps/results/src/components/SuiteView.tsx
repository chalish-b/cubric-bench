import { useState } from "react";
import type { WebEntry, WebSuite } from "@cubric/bench/web";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { AccuracyChart } from "@/components/AccuracyChart";
import { AccuracyHeatmap } from "@/components/AccuracyHeatmap";
import { suiteMeta } from "@/lib/suites";

export function SuiteView({
  suite,
  entries,
}: {
  suite: WebSuite;
  entries: WebEntry[];
}) {
  const meta = suiteMeta(suite.suiteId);
  const complete = entries.filter((e) => e.complete);
  const hidden = entries.length - complete.length;
  const [variant, setVariant] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-sm text-muted-foreground">{meta.blurb}</p>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Accuracy</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Click a model to inspect its cases.
            </p>
          </div>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={variant ?? "all"}
            onValueChange={(v) => setVariant(!v || v === "all" ? null : v)}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            {suite.variants.map((v) => (
              <ToggleGroupItem key={v} value={v}>
                {meta.variantLabel(v)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <AccuracyChart entries={complete} variant={variant} />
      </section>

      <section>
        <h3 className="text-sm font-semibold">Accuracy by {meta.variantAxis}</h3>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          How each model falls off as the scramble gets longer.
        </p>
        <AccuracyHeatmap suite={suite} entries={complete} />
      </section>

      {hidden > 0 && (
        <p className="text-xs text-muted-foreground">
          {hidden} incomplete {hidden === 1 ? "entry" : "entries"} hidden (runs
          still in progress).
        </p>
      )}
    </div>
  );
}
