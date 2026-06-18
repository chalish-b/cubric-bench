export interface SuiteMeta {
  title: string;
  blurb: string;
  /** Label for a variant value, e.g. "2" -> "2m". */
  variantLabel: (v: string) => string;
  /** What the variant axis represents, e.g. "scramble length". */
  variantAxis: string;
}

const SUITE_META: Record<string, SuiteMeta> = {
  scramble: {
    title: "Scramble",
    blurb:
      "Solve a cube scrambled with N random face moves, given the full six-face state as text.",
    variantLabel: (v) => `${v} move${v === "1" ? "" : "s"}`,
    variantAxis: "scramble length",
  },
};

export function suiteMeta(id: string): SuiteMeta {
  return (
    SUITE_META[id] ?? {
      title: id,
      blurb: "",
      variantLabel: (v) => v,
      variantAxis: "variant",
    }
  );
}
