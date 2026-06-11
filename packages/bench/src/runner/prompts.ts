// Versioned global prompt, assembled per input modality (image / text state).
// Every run records which version it used, so prompt changes never silently
// contaminate comparisons between runs.
// The task-specific prompt lives in the suite manifest (suite.json -> tasks).

import type { TextState } from "../schema";

export const GLOBAL_PROMPT_VERSION = "global-v2";

function globalPrompt(image: boolean, textState: TextState): string {
  const lines: string[] = [];

  // What the model is given
  if (image) {
    lines.push(
      "You are looking at a single image of a standard 3x3 Rubik's cube.",
      "- The view shows the U (top), F (front, on the left) and R (right) faces.",
    );
    if (textState === "visible") {
      lines.push(
        "- The sticker colors of the 3 visible faces are also provided as text, to help you read the image.",
      );
    } else if (textState === "full") {
      lines.push(
        "- The sticker colors of all 6 faces (including the ones not visible in the image) are also provided as text.",
      );
    }
  } else if (textState === "visible") {
    lines.push(
      "You are given the sticker colors of a standard 3x3 Rubik's cube as text.",
      "- Only the U (top), F (front) and R (right) faces are given.",
    );
  } else {
    lines.push(
      "You are given the sticker colors of all 6 faces of a standard 3x3 Rubik's cube as text.",
    );
  }

  lines.push("- The cube is in a valid state, there is no trickery.");

  // Only relevant when the model has partial information (3 faces)
  if (textState !== "full") {
    lines.push(
      `- Assume you can answer from the 3 ${image ? "visible" : "given"} faces alone. If you think you need more information, use your intuition to assume the simplest case.`,
    );
  }

  lines.push(
    "- You cannot write or evaluate code, only use your own reasoning.",
    "- After your reasoning, end your response with the answer on its own final line, with no extra commentary on that line.",
    `- If you believe the cube is in an invalid state, you are probably misreading ${image ? "the image" : "the given state"}. Instead of going in circles, you may give up by answering exactly "Q".`,
  );

  return lines.join("\n");
}

/** Compose the full text part of the user message for one case. */
export function composePrompt(opts: {
  taskPrompt: string;
  image: boolean;
  textState: TextState;
  stateText: string | null;
}): string {
  return [
    globalPrompt(opts.image, opts.textState),
    opts.taskPrompt,
    opts.stateText,
  ]
    .filter(Boolean)
    .join("\n\n");
}
