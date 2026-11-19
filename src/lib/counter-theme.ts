import type { CSSProperties } from "react";

/**
 * One signature colour per counter. Every screen (TV, desk, visitor, admin)
 * derives its accent from the counter prefix so a desk is recognised by colour.
 *  hue    – bright decorative colour (strips, rings, glows)
 *  strong – fill that carries white text at AA contrast
 *  ink    – text colour on the `soft` tint at AA contrast
 *  accent – lighter tone used on dark surfaces
 */
export type CounterTheme = {
  name: string;
  hue: string;
  strong: string;
  ink: string;
  soft: string;
  accent: string;
  glow: string;
};

export const counterThemes: readonly CounterTheme[] = [
  {
    name: "Teal",
    hue: "#0D9488",
    strong: "#0F766E",
    ink: "#115E59",
    soft: "#F0FDFA",
    accent: "#2DD4BF",
    glow: "rgba(13,148,136,0.35)",
  },
  {
    name: "Royal blue",
    hue: "#2563EB",
    strong: "#1D4ED8",
    ink: "#1E40AF",
    soft: "#EFF6FF",
    accent: "#60A5FA",
    glow: "rgba(37,99,235,0.33)",
  },
  {
    name: "Amber",
    hue: "#D97706",
    strong: "#B45309",
    ink: "#92400E",
    soft: "#FFFBEB",
    accent: "#FBBF24",
    glow: "rgba(217,119,6,0.33)",
  },
  {
    name: "Violet",
    hue: "#7C3AED",
    strong: "#6D28D9",
    ink: "#5B21B6",
    soft: "#F5F3FF",
    accent: "#A78BFA",
    glow: "rgba(124,58,237,0.33)",
  },
  {
    name: "Rose",
    hue: "#E11D48",
    strong: "#BE123C",
    ink: "#9F1239",
    soft: "#FFF1F2",
    accent: "#FB7185",
    glow: "rgba(225,29,72,0.3)",
  },
];

function slot(key: string | number) {
  if (typeof key === "number")
    return ((Math.trunc(key) % 5) + 5) % 5;
  const first = key.trim().charAt(0).toUpperCase();
  if (first >= "A" && first <= "Z") return (first.charCodeAt(0) - 65) % 5;
  if (first >= "0" && first <= "9") return (Number(first) + 4) % 5;
  return 0;
}

/** Deterministic: prefix "A" is always teal, "B" blue, "C" amber, "D" violet, "E" rose. */
export function getCounterTheme(key: string | number): CounterTheme {
  return counterThemes[slot(key)];
}

export function counterVars(theme: CounterTheme): CSSProperties {
  return {
    "--c-hue": theme.hue,
    "--c-strong": theme.strong,
    "--c-ink": theme.ink,
    "--c-soft": theme.soft,
    "--c-accent": theme.accent,
    "--c-glow": theme.glow,
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
