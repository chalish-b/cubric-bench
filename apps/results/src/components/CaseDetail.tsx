import { useState } from "react";
import type { ReactNode } from "react";
import type { WebCaseDetail } from "@cubric/bench/web";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CubeViewer } from "@/components/CubeViewer";
import { fmtCost } from "@/lib/format";
import { outcomeMeta } from "@/lib/outcomes";

export function CaseDetail({ c }: { c: WebCaseDetail }) {
  const [view, setView] = useState<"given" | "result">("given");
  // Reset to the given state when moving to another case, during render so the
  // cube viewer's Canvas is never remounted (only its state changes).
  const [prevCaseId, setPrevCaseId] = useState(c.caseId);
  if (c.caseId !== prevCaseId) {
    setPrevCaseId(c.caseId);
    setView("given");
  }

  const meta = outcomeMeta(c.outcome);
  const hasResult = c.finalState != null;
  const shownState = view === "result" && c.finalState ? c.finalState : c.cubeState;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-medium">{c.caseId}</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
      </div>

      <div>
        {hasResult && (
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={view}
            onValueChange={(v) => v && setView(v as "given" | "result")}
            className="mb-2"
          >
            <ToggleGroupItem value="given">Given state</ToggleGroupItem>
            <ToggleGroupItem value="result">After answer</ToggleGroupItem>
          </ToggleGroup>
        )}
        <CubeViewer
          state={shownState}
          className="h-[540px] w-full rounded-lg border bg-card"
        />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <Field label="Answer">
          <span className="font-mono">{c.extracted || "—"}</span>
        </Field>
        <Field label="Scramble">
          <span className="font-mono text-muted-foreground">{c.setup}</span>
          <span className="ml-1 text-xs text-muted-foreground">(not shown to the model)</span>
        </Field>
        <Field label="Cost">
          <span className="tabular-nums">
            {fmtCost(c.cost)}
            {c.completionTokens != null && (
              <span className="text-muted-foreground"> · {c.completionTokens} tokens</span>
            )}
          </span>
        </Field>
      </dl>

      <div className="space-y-2">
        <Panel title="Prompt sent">
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {c.prompt}
          </pre>
        </Panel>
        {c.reasoning && (
          <Panel title="Reasoning">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.reasoning}</p>
          </Panel>
        )}
        <Panel title="Final answer">
          <pre className="whitespace-pre-wrap font-mono text-xs">{c.rawResponse || "—"}</pre>
        </Panel>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Collapsible className="rounded-lg border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium">
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-80 overflow-auto border-t px-3 py-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
