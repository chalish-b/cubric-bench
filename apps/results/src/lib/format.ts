export function fmtCost(v: number | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "$0";
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(4)}`;
}

export function splitModel(model: string): { provider: string; name: string } {
  const i = model.indexOf("/");
  return i === -1
    ? { provider: "", name: model }
    : { provider: model.slice(0, i), name: model.slice(i + 1) };
}
