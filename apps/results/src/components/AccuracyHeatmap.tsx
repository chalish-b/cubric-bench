import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { WebEntry, WebSuite } from "@cubric/bench/web";
import { ModelLabel } from "@/components/ModelLabel";
import { providerColor } from "@/lib/providers";
import { splitModel } from "@/lib/format";
import { suiteMeta } from "@/lib/suites";
import { useTheme } from "@/lib/theme";

// Red (low) through amber to green (high), with the % readable on top.
function heatStyle(acc: number, dark: boolean): CSSProperties {
  const hue = 25 + acc * 120;
  return dark
    ? {
        backgroundColor: `oklch(0.32 0.09 ${hue})`,
        color: `oklch(0.9 0.06 ${hue})`,
      }
    : {
        backgroundColor: `oklch(0.92 0.1 ${hue})`,
        color: `oklch(0.4 0.11 ${hue})`,
      };
}

export function AccuracyHeatmap({
  suite,
  entries,
}: {
  suite: WebSuite;
  entries: WebEntry[];
}) {
  const { dark } = useTheme();
  const meta = suiteMeta(suite.suiteId);
  const rows = [...entries].sort((a, b) => b.accuracy - a.accuracy);
  const cols = ["overall", ...suite.variants];

  const colLabel = (c: string) => (c === "overall" ? "Overall" : meta.variantLabel(c));
  const valueFor = (e: WebEntry, c: string) =>
    c === "overall"
      ? e.accuracy
      : (e.byVariant.find((b) => b.variant === c)?.accuracy ?? 0);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `minmax(180px, 1.4fr) repeat(${cols.length}, minmax(72px, 1fr))`,
          minWidth: 180 + cols.length * 84,
        }}
      >
        <div />
        {cols.map((c) => (
          <div
            key={c}
            className="pb-1 text-center text-xs font-medium text-muted-foreground"
          >
            {colLabel(c)}
          </div>
        ))}

        {rows.map((e) => (
          <Fragment key={e.entryId}>
            <div className="flex items-center pr-3">
              <ModelLabel
                provider={e.provider}
                name={splitModel(e.model).name}
                reasoning={e.reasoningEffort}
                color={providerColor(e.provider)}
              />
            </div>
            {cols.map((c) => {
              const v = valueFor(e, c);
              return (
                <div
                  key={c}
                  className="flex items-center justify-center rounded py-2.5 text-xs font-medium tabular-nums"
                  style={heatStyle(v, dark)}
                >
                  {Math.round(v * 100)}%
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
