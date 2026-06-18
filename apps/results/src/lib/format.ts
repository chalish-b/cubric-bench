import type { CSSProperties } from "react";

export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export function fmtCost(v: number | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "$0";
  return v < 0.1 ? `$${v.toFixed(4)}` : `$${v.toFixed(3)}`;
}

export function fmtLatency(ms: number): string {
  if (!ms) return "—";
  const s = ms / 1000;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

export function splitModel(model: string): { provider: string; name: string } {
  const i = model.indexOf("/");
  return i === -1
    ? { provider: "", name: model }
    : { provider: model.slice(0, i), name: model.slice(i + 1) };
}

// Accuracy as a hue from red (low) through amber to green (high).
function accuracyHue(acc: number): number {
  return 25 + acc * 120;
}

/** Subtle pale chip tinted by accuracy. */
export function accuracyPill(acc: number): CSSProperties {
  const hue = accuracyHue(acc);
  return {
    backgroundColor: `oklch(0.95 0.05 ${hue})`,
    color: `oklch(0.45 0.13 ${hue})`,
  };
}

/** Fill colour for an accuracy progress bar. */
export function accuracyBarColor(acc: number): string {
  return `oklch(0.62 0.15 ${accuracyHue(acc)})`;
}
