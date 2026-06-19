import type { WebEntry } from "@cubric/bench/web";
import { useNavigate } from "@tanstack/react-router";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ModelLabel } from "@/components/ModelLabel";
import { providerColor } from "@/lib/providers";
import { fmtCost, splitModel } from "@/lib/format";

interface Row {
  entryId: string;
  provider: string;
  name: string;
  reasoning?: string;
  accuracy: number; // 0-100
  solved: number;
  total: number;
  totalCost: number;
  costPerCase: number;
  modality: string;
  color: string;
}

// variant === null aggregates across all variants ("All").
function toRow(e: WebEntry, variant: string | null): Row {
  const common = {
    entryId: e.entryId,
    provider: e.provider,
    name: splitModel(e.model).name,
    reasoning: e.reasoningEffort,
    modality: e.modalityLabel,
    color: providerColor(e.provider),
  };
  if (variant == null) {
    return {
      ...common,
      accuracy: Math.round(e.accuracy * 1000) / 10,
      solved: e.solved,
      total: e.totalCases,
      totalCost: e.cost.total,
      costPerCase: e.cost.avgPerCase,
    };
  }
  const s = e.byVariant.find((b) => b.variant === variant);
  const total = s?.total ?? 0;
  const costPerCase = s?.avgCostPerCase ?? 0;
  return {
    ...common,
    accuracy: Math.round((s?.accuracy ?? 0) * 1000) / 10,
    solved: s?.solved ?? 0,
    total,
    totalCost: costPerCase * total,
    costPerCase,
  };
}

const LABEL_WIDTH = 200;

export function AccuracyChart({
  entries,
  variant,
}: {
  entries: WebEntry[];
  variant: string | null;
}) {
  const navigate = useNavigate();
  const open = (entryId: string) =>
    navigate({ to: "/entry/$entryId", params: { entryId } });
  const rows = entries
    .map((e) => toRow(e, variant))
    .sort((a, b) => b.accuracy - a.accuracy);
  const byId = new Map(rows.map((r) => [r.entryId, r]));
  const height = rows.length * 60 + 24;

  return (
    <ChartContainer
      config={{ accuracy: { label: "Accuracy" } }}
      className="aspect-auto! w-full [&_.recharts-wrapper]:cursor-pointer!"
      style={{ height }}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 104, bottom: 4, left: 8 }}
        barCategoryGap="30%"
        onClick={(state: {
          activeTooltipIndex?: unknown;
          activePayload?: readonly { payload?: Row }[];
        }) => {
          const idx = Number(state?.activeTooltipIndex);
          const id =
            state?.activePayload?.[0]?.payload?.entryId ??
            (Number.isInteger(idx) ? rows[idx]?.entryId : undefined);
          if (id) open(id);
        }}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="entryId"
          width={LABEL_WIDTH}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={(props: AxisTickProps) => (
            <ModelTick {...props} rows={byId} onOpen={open} />
          )}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={(props: TooltipPayload) => <AccTooltip {...props} />}
        />
        <Bar dataKey="accuracy" radius={5} barSize={20} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.entryId} fill={r.color} />
          ))}
          <LabelList
            dataKey="accuracy"
            content={(props: LabelContentProps) => <EndLabel {...props} rows={rows} />}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

interface AxisTickProps {
  x?: string | number;
  y?: string | number;
  payload?: { value: string };
}

function ModelTick({
  x,
  y,
  payload,
  rows,
  onOpen,
}: AxisTickProps & {
  rows: Map<string, Row>;
  onOpen: (entryId: string) => void;
}) {
  const r = payload ? rows.get(payload.value) : undefined;
  const px = Number(x);
  const py = Number(y);
  if (!r || Number.isNaN(px) || Number.isNaN(py)) return <g />;
  return (
    <foreignObject x={px - LABEL_WIDTH} y={py - 18} width={LABEL_WIDTH - 8} height={36}>
      <div
        className="flex h-9 items-center"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(r.entryId);
        }}
      >
        <ModelLabel
          provider={r.provider}
          name={r.name}
          reasoning={r.reasoning}
          color={r.color}
        />
      </div>
    </foreignObject>
  );
}

interface LabelContentProps {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  index?: number;
}

function EndLabel({ x, y, width, height, index, rows }: LabelContentProps & { rows: Row[] }) {
  const px = Number(x);
  const py = Number(y);
  const pw = Number(width);
  const ph = Number(height);
  if (index == null || [px, py, pw, ph].some(Number.isNaN)) return <g />;
  const r = rows[index];
  if (!r) return <g />;
  return (
    <text x={px + pw + 8} y={py + ph / 2} dominantBaseline="central" className="text-xs">
      <tspan className="fill-foreground font-semibold">{r.accuracy}%</tspan>
      <tspan dx="8" className="fill-muted-foreground">
        {fmtCost(r.totalCost)}
      </tspan>
    </text>
  );
}

interface TooltipPayload {
  active?: boolean;
  payload?: readonly { payload?: Row }[];
}

function AccTooltip({ active, payload }: TooltipPayload) {
  const r = payload?.[0]?.payload;
  if (!active || !r) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <div className="text-sm font-medium">
        {r.name}
        <span className="ml-1 font-normal capitalize text-muted-foreground">
          · {r.reasoning ?? "default"}
        </span>
      </div>
      <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Accuracy</dt>
        <dd className="text-right tabular-nums">
          {r.accuracy}% · {r.solved}/{r.total}
        </dd>
        <dt className="text-muted-foreground">Total cost</dt>
        <dd className="text-right tabular-nums">{fmtCost(r.totalCost)}</dd>
        <dt className="text-muted-foreground">Cost / case</dt>
        <dd className="text-right tabular-nums">{fmtCost(r.costPerCase)}</dd>
        <dt className="text-muted-foreground">Input</dt>
        <dd className="text-right">{r.modality}</dd>
      </dl>
    </div>
  );
}
