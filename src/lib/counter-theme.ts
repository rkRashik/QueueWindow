import type { CSSProperties } from "react";

/**
 * Counter plates. Five enamel colours at near-equal lightness so no desk shouts
 * louder than another; each carries white text at >= 4.5:1. The letter on the
 * plate is the primary identifier, the colour only confirms it.
 */
export type CounterTheme = { name: string; plate: string; tint: string };

export const counterThemes: readonly CounterTheme[] = [
  { name: "Green", plate: "oklch(48% 0.11 160)", tint: "oklch(48% 0.11 160 / 0.14)" },
  { name: "Cobalt", plate: "oklch(47% 0.15 262)", tint: "oklch(47% 0.15 262 / 0.14)" },
  { name: "Oxblood", plate: "oklch(46% 0.14 25)", tint: "oklch(46% 0.14 25 / 0.14)" },
  { name: "Plum", plate: "oklch(45% 0.12 320)", tint: "oklch(45% 0.12 320 / 0.14)" },
  { name: "Slate", plate: "oklch(44% 0.05 240)", tint: "oklch(44% 0.05 240 / 0.14)" },
];

function slot(key: string | number) {
  if (typeof key === "number") return ((Math.trunc(key) % 5) + 5) % 5;
  const first = key.trim().charAt(0).toUpperCase();
  if (first >= "A" && first <= "Z") return (first.charCodeAt(0) - 65) % 5;
  if (first >= "0" && first <= "9") return (Number(first) + 4) % 5;
  return 0;
}

/** Deterministic: prefix "A" is always green, "B" cobalt, "C" oxblood, "D" plum, "E" slate. */
export function getCounterTheme(key: string | number): CounterTheme {
  return counterThemes[slot(key)];
}

export function counterVars(theme: CounterTheme): CSSProperties {
  return {
    "--plate": theme.plate,
    "--plate-ink": "#fff",
    "--plate-tint": theme.tint,
  } as CSSProperties;
}

/** Ascending, stable order everywhere: by prefix, then by natural name order. */
export function sortCounters<T extends { name: string; prefix: string }>(
  list: readonly T[],
): T[] {
  return [...list].sort(
    (a, b) =>
      a.prefix.localeCompare(b.prefix, "en", { numeric: true }) ||
      a.name.localeCompare(b.name, "en", { numeric: true }),
  );
}

export function prefixOf(token: string) {
  return token.split("-")[0] ?? token;
}
