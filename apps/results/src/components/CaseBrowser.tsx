import { Fragment, useState } from "react";
import type { WebCaseDetail, WebEntryDetail, WebSuite } from "@cubric/bench/web";
import { CaseDetail } from "@/components/CaseDetail";
import { cn } from "@/lib/utils";
import { outcomeMeta } from "@/lib/outcomes";
import { suiteMeta } from "@/lib/suites";

export function CaseBrowser({
  detail,
  suite,
  selectedCaseId,
  onSelectCase,
}: {
  detail: WebEntryDetail;
  suite: WebSuite;
  selectedCaseId?: string;
  onSelectCase: (caseId: string) => void;
}) {
  const meta = suiteMeta(suite.suiteId);
  const cases = detail.cases;
  const failures = cases.filter((c) => !outcomeMeta(c.outcome).success);

  const [showFailuresOnly, setShowFailuresOnly] = useState(false);

  const shown = showFailuresOnly ? failures : cases;
  const selected =
    cases.find((c) => c.caseId === selectedCaseId) ?? shown[0] ?? cases[0];

  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <div className="mb-3 inline-flex rounded-md border p-0.5 text-xs">
          <FilterTab active={!showFailuresOnly} onClick={() => setShowFailuresOnly(false)}>
            All ({cases.length})
          </FilterTab>
          <FilterTab
            active={showFailuresOnly}
            onClick={() => setShowFailuresOnly(true)}
            disabled={failures.length === 0}
          >
            Failures ({failures.length})
          </FilterTab>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {suite.variants.map((variant) => {
            const group = shown.filter((c) => c.variant === variant);
            if (group.length === 0) return null;
            return (
              <Fragment key={variant}>
                <div className="px-1 text-xs font-medium text-muted-foreground">
                  {meta.variantLabel(variant)}
                </div>
                {group.map((c) => (
                  <CaseRow
                    key={c.caseId}
                    c={c}
                    active={c.caseId === selected?.caseId}
                    onClick={() => onSelectCase(c.caseId)}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="min-w-0">
        {selected ? (
          <CaseDetail c={selected} />
        ) : (
          <p className="text-sm text-muted-foreground">No cases.</p>
        )}
      </div>
    </div>
  );
}

function FilterTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded px-2 py-1 font-medium transition-colors disabled:cursor-default disabled:opacity-40",
        active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CaseRow({
  c,
  active,
  onClick,
}: {
  c: WebCaseDetail;
  active: boolean;
  onClick: () => void;
}) {
  const meta = outcomeMeta(c.outcome);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
        title={meta.label}
      />
      <span className="font-mono text-xs">{c.caseId}</span>
      <span className="ml-auto truncate font-mono text-xs text-muted-foreground">
        {c.extracted}
      </span>
    </button>
  );
}
