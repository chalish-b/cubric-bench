Cubric Bench is a benchmark for LLMs to test their ability to identify Rubik's cube states, recognize common algorithms (F2L, OLL, PLL) and come up with solutions to questions about the cube state and moves.

The `cube` package (cube model + moves) is complete and holds pure cube logic only — no benchmark data. The current focus is the `bench` package: generating test suites, running them against models via OpenRouter, and saving rich result data. The `cube-demo` app is a three.js visualizer, also used headlessly (via URL params + Playwright) to render suite screenshots; `?page=pll` opens a PLL algorithm test page that previews each base case. The demo depends on `@cubric/bench/algorithms` (data-only subpath export) for the PLL list.

## The bench package

- `src/algorithms.ts` — PLL algorithm list (benchmark data; lives here, not in cube). Exported as `@cubric/bench/algorithms`.
- `src/generate/` — suite generation: case generators, screenshot capture, ambiguity/fairness check
- `src/runner/` — benchmark runner: OpenRouter collection, answer extraction, scoring, offline rescoring
- `src/schema.ts` — shared data contracts (suite manifests, run metadata, case results)
- `suites/<suiteId>/` — generated suite.json + images (a suite holds cases plus one or more tasks, e.g. PLL "identify" and "solve" share the same images). The PLL suite shows each PLL from 4 y-views (base, y, y2, y') — no AUF variants. `suites/_archived/` and `results/_archived/` hold outdated, non-comparable data.
- `results/runs/<runId>/` — run.json + cases.jsonl (raw responses stored verbatim; scoring is re-runnable offline)

Key commands (bench scripts run with bun):
- `pnpm --filter @cubric/bench generate:pll` — regenerate the PLL suite (`--skip-screenshots` rebuilds suite.json only)
- `pnpm --filter @cubric/bench bench -- --suite pll --task identify --model <openrouter-id> [--no-image] [--text none|visible|full] [--reasoning none|minimal|low|medium|high|xhigh] [--limit N] [--dry-run]` (default modality: image + visible-faces text; text-only models run with `--no-image`; `--reasoning` omitted = model default)
- `pnpm --filter @cubric/bench rescore -- --run <runId>` — recompute outcomes from stored raw responses

## Things to keep in mind
- Use `pnpm` for all npm related commands
- Test the cube package using `pnpm --filter @cubric/cube test`
- Never run benchmark collection (API calls) without explicit confirmation
