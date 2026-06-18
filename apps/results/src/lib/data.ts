import type { WebSummary, WebEntryDetail } from "@cubric/bench/web";

// Data files are emitted by `pnpm --filter @cubric/bench web:data` into public/data.
const base = import.meta.env.BASE_URL;

export async function loadSummary(): Promise<WebSummary> {
  const res = await fetch(`${base}data/summary.json`);
  if (!res.ok) throw new Error(`Failed to load summary.json (${res.status})`);
  return res.json() as Promise<WebSummary>;
}

export async function loadEntryDetail(entryId: string): Promise<WebEntryDetail> {
  const res = await fetch(`${base}data/runs/${entryId}.json`);
  if (!res.ok) throw new Error(`Failed to load entry "${entryId}" (${res.status})`);
  return res.json() as Promise<WebEntryDetail>;
}
