// Lenient extraction of the final answer from a raw model response.
// The raw response is always stored verbatim, so extraction bugs can be fixed
// and re-scored offline (see rescore.ts) without repeating any API calls.

export function extractAnswer(raw: string): string {
  const lines = raw
    .trim()
    .split("\n")
    .map((l) => l.trim())
    // Drop empty lines and code fence markers
    .filter((l) => l && !/^```/.test(l));

  let answer = lines.at(-1) ?? "";

  // Strip inline markdown (`T`, **T**) and an "Answer:" prefix
  answer = answer.replace(/[`*]/g, "").trim();
  answer = answer.replace(/^(final\s+)?answer\s*[:\-]\s*/i, "");
  // Trailing sentence punctuation
  answer = answer.replace(/[.!]+$/, "");

  return answer.trim();
}
