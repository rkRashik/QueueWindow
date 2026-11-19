import { counterVars, getCounterTheme } from "@/lib/counter-theme";

/** The colour-coded prefix badge used identically on every screen. */
export function CounterBadge({
  prefix,
  index,
  size = "md",
  className = "",
}: {
  prefix: string;
  /** 1-based position; when given the badge reads "01 • A". */
  index?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const theme = getCounterTheme(prefix);
  const sizes = {
    sm: "min-w-6 h-6 text-xs rounded-md",
    md: "min-w-8 h-8 text-sm rounded-lg",
    lg: "min-w-11 h-11 text-lg rounded-xl",
  }[size];
  return (
    <span
      style={counterVars(theme)}
      translate="no"
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 bg-(--c-strong) px-2 font-extrabold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${sizes} ${className}`}
    >
      {index !== undefined && (
        <>
          <span className="tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <span aria-hidden="true" className="opacity-60">
            •
          </span>
        </>
      )}
      {prefix}
    </span>
  );
}
