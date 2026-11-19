import type { CSSProperties } from "react";
import { counterVars, getCounterTheme } from "@/lib/counter-theme";

/** The counter's enamel plate: its letter on its colour. */
export function Plate({
  prefix,
  className = "",
  style,
}: {
  prefix: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      translate="no"
      className={`plate ${className}`}
      style={{ ...counterVars(getCounterTheme(prefix)), ...style }}
    >
      {prefix}
    </span>
  );
}
