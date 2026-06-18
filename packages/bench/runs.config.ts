// Batch run definitions. Run them all in sequence with:
//
//   pnpm --filter @cubric/bench batch
//   pnpm --filter @cubric/bench batch -- --dry-run        # preview, no API calls
//   pnpm --filter @cubric/bench batch -- other.config.ts  # a different file
//
// Each entry needs suite/task/model; everything else defaults to the same
// values as the bench CLI (image on, text "visible", trials 1, concurrency 4,
// timeout 300s). Build sweeps programmatically with flatMap/map.

import type { BatchRun } from "./src/runner/batch";

const config: BatchRun[] = [
  // Visible-faces text (the default modality).
  // { suite: "pll", task: "identify", model: "google/gemini-2.5-pro" },
  // { suite: "pll", task: "solve", model: "google/gemini-2.5-pro" },

  // Scramble suite, text only
  // { suite: "scramble", task: "solve", variant: "1", text: "full", model: "openai/gpt-5.5", reasoning: "medium" },
  // { suite: "scramble", task: "solve", variant: "2", text: "full", model: "anthropic/claude-opus-4.8", reasoning: "medium" },
  // { suite: "scramble", task: "solve", variant: "3", text: "full", model: "anthropic/claude-opus-4.8", reasoning: "medium" },

  { suite: "scramble", task: "solve", variant: "1", text: "full", model: "google/gemini-3-flash-preview", reasoning: "high" },
];

export default config;
