Cubric Bench is a benchmark for LLMs to test their ability to identify Rubik's cube states, recognize common algorithms (F2L, OLL, PLL) and come up with solutions to questions about the cube state and moves.

The `cube` package (cube model + moves) is complete and holds pure cube logic only — no benchmark data. The current focus is the `bench` package: generating test suites, running them against models via OpenRouter, and saving rich result data. The `cube-demo` app is a three.js visualizer, also used headlessly (via URL params + Playwright) to render suite screenshots; `?page=pll` opens a PLL algorithm test page that previews each base case. The demo depends on `@cubric/bench/algorithms` (data-only subpath export) for the PLL list.

## The bench package

- `src/algorithms.ts` — PLL algorithm list (benchmark data; lives here, not in cube). Exported as `@cubric/bench/algorithms`.
- `src/generate/` — suite generation. `build-suite.ts` is the suite-agnostic builder (optional screenshots, hashing, manifest writing); each suite has a thin entry (`generate-pll.ts`, `generate-scramble.ts`) plus its case generator (`pll-cases.ts`, `scramble-cases.ts`). Also holds the ambiguity/fairness checks.
- `src/runner/` — benchmark runner: OpenRouter collection, answer extraction, scoring, offline rescoring
- `src/schema.ts` — shared data contracts (suite manifests, run metadata, case results)
- `suites/<suiteId>/` — generated suite.json (+ images, for image suites). A suite holds cases plus one or more tasks. Each suite is a fundamentally different kind of question:
  - `pll` — recognize/solve the last layer. Shows each PLL from 4 y-views (base, y, y2, y'), no AUF variants. Tasks: "identify" (exact) and "solve" (solve, AUF-tolerant); both share the same screenshots.
  - `scramble` — solve a cube scrambled with n random face moves. Text-only (no images): a general scramble can't be read from 3 visible faces, so it's a pure spatial-reasoning task given the full 6-face state. Move count n is the `variant` ("1"/"2"/...), so one run sweeps difficulties. Task: "solve" (solve, tolerance "none" — doing nothing must not score as solved).
  - `suites/_archived/` and `results/_archived/` hold outdated, non-comparable data.
- `results/runs/<runId>/` — run.json + cases.jsonl (raw responses stored verbatim; scoring is re-runnable offline)

Key commands (bench scripts run with bun):
- `pnpm --filter @cubric/bench generate:pll` — regenerate the PLL suite (`--skip-screenshots` rebuilds suite.json only)
- `pnpm --filter @cubric/bench generate:scramble [--moves 1,2,3] [--count 10]` — regenerate the scramble suite (text-only, no dev server)
- `pnpm --filter @cubric/bench bench -- --suite pll --task identify --model <openrouter-id> [--no-image] [--text none|visible|full] [--reasoning none|minimal|low|medium|high|xhigh] [--variant V] [--limit N] [--dry-run]` (default modality: image + visible-faces text; text-only models run with `--no-image`; `--reasoning` omitted = model default)
- The scramble suite is text-only, so run it with `--no-image --text full`, e.g. `pnpm --filter @cubric/bench bench -- --suite scramble --task solve --no-image --text full --model <id>`
- `pnpm --filter @cubric/bench batch -- [config.ts] [--dry-run]` — run many selections in sequence from a config file (default `runs.config.ts`). The file default-exports a `BatchRun[]` (only suite/task/model required; everything else defaults to the CLI defaults). Each entry runs via the same `runBench` core as the CLI; a failed run is reported and the batch continues.
- `pnpm --filter @cubric/bench rescore -- --run <runId>` — recompute outcomes from stored raw responses

## Things to keep in mind
- Use `pnpm` for all npm related commands
- Test the cube package using `pnpm --filter @cubric/cube test`
- Never run benchmark collection (API calls) without explicit confirmation
