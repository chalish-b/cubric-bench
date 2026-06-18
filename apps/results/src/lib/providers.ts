// Provider brand colours used to colour-code charts. Tweak freely.
const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  google: "#4285f4",
  anthropic: "#d97757",
};

const FALLBACK_COLOR = "#71717a"; // zinc-500

export function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? FALLBACK_COLOR;
}
