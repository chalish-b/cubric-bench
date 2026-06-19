import type { WebEntry, WebSuite } from "@cubric/bench/web";
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { providerColor } from "@/lib/providers";
import { suiteMeta } from "@/lib/suites";

function acc(e: WebEntry, variant: string): number | null {
  const s = e.byVariant.find((b) => b.variant === variant);
  return s ? Math.round(s.accuracy * 1000) / 10 : null;
}

export function PeerFalloffChart({
  suite,
  peers,
  entryId,
}: {
  suite: WebSuite;
  peers: WebEntry[];
  entryId: string;
}) {
  const meta = suiteMeta(suite.suiteId);
  const series = peers.map((e, i) => ({
    key: `m${i}`,
    entry: e,
    highlight: e.entryId === entryId,
    color: providerColor(e.provider),
  }));

  const data = suite.variants.map((v) => {
    const row: Record<string, string | number | null> = { variant: meta.variantLabel(v) };
    for (const s of series) row[s.key] = acc(s.entry, v);
    return row;
  });

  const focused = series.find((s) => s.highlight);

  return (
    <ChartContainer config={{}} className="aspect-auto! h-[240px] w-full">
      <LineChart data={data} margin={{ top: 20, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="variant" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          domain={[0, 100]}
          width={42}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        {series
          .filter((s) => !s.highlight)
          .map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.25}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        {focused && (
          <Line
            type="monotone"
            dataKey={focused.key}
            stroke={focused.color}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 0, fill: focused.color }}
            connectNulls
            isAnimationActive={false}
          >
            <LabelList
              dataKey={focused.key}
              position="top"
              offset={10}
              className="fill-foreground text-xs"
              formatter={(v: unknown) => (v == null ? "" : `${String(v)}%`)}
            />
          </Line>
        )}
      </LineChart>
    </ChartContainer>
  );
}
