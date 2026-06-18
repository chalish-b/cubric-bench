// Thin OpenRouter client: one multimodal chat completion per case.
// Reads OPENROUTER_API_KEY from the environment.

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 500_000; // reasoning models can be slow
const MAX_RETRIES = 3;
// A model that times out once will usually time out again, and each attempt
// blocks a worker slot for the full timeout — so timeouts get one retry only
const MAX_TIMEOUT_ATTEMPTS = 2;

export interface ChatResult {
  text: string;
  /** Reasoning/thinking text, when the provider exposes it. */
  reasoning?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
}

/** 4xx responses and malformed payloads — retrying won't help. */
class NonRetryableError extends Error {}

export async function chat(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  /** Base64-encoded PNG. Omit for text-only runs. */
  imageBase64?: string;
  /** OpenRouter unified reasoning effort. Omit to use the model's default.
   * Ignored without error by models that don't support reasoning. */
  reasoningEffort?: string;
  /** Per-attempt request timeout. Default 300s. */
  timeoutMs?: number;
}): Promise<ChatResult> {
  const content: unknown[] = [{ type: "text", text: opts.prompt }];
  if (opts.imageBase64) {
    content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${opts.imageBase64}` },
    });
  }

  const body = JSON.stringify({
    model: opts.model,
    messages: [{ role: "user", content }],
    ...(opts.reasoningEffort
      ? { reasoning: { effort: opts.reasoningEffort } }
      : {}),
    // Ask OpenRouter to include token usage and USD cost in the response
    usage: { include: true },
  });

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: unknown;
  let timeoutAttempts = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }

    try {
      return await attemptRequest(opts.apiKey, body, timeoutMs);
    } catch (err) {
      if (err instanceof NonRetryableError) throw err;
      if ((err as any)?.name === "TimeoutError") {
        timeoutAttempts++;
        if (timeoutAttempts >= MAX_TIMEOUT_ATTEMPTS) {
          throw new Error(
            `Request timed out after ${timeoutMs}ms (${timeoutAttempts} attempts)`,
          );
        }
      }
      // Rate limits, 5xx, provider errors, network errors, timeouts: retry
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`OpenRouter request failed after ${MAX_RETRIES + 1} attempts`);
}

async function attemptRequest(
  apiKey: string,
  body: string,
  timeoutMs: number,
): Promise<ChatResult> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text();
    const message = `OpenRouter ${res.status}: ${text}`;
    if (res.status === 429 || res.status >= 500) throw new Error(message);
    throw new NonRetryableError(message);
  }

  const data: any = await res.json();

  // OpenRouter can return HTTP 200 with an error object in the body when the
  // upstream provider fails mid-request (transient — retryable)
  if (data.error) {
    throw new Error(
      `OpenRouter provider error ${data.error.code ?? "?"}: ${data.error.message ?? JSON.stringify(data.error).slice(0, 200)}`,
    );
  }

  const message = data.choices?.[0]?.message;
  if (typeof message?.content !== "string") {
    throw new NonRetryableError(
      `Unexpected OpenRouter response shape: ${JSON.stringify(data).slice(0, 500)}`,
    );
  }

  return {
    text: message.content,
    reasoning:
      typeof message.reasoning === "string" ? message.reasoning : undefined,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
          cost: data.usage.cost,
        }
      : undefined,
  };
}
