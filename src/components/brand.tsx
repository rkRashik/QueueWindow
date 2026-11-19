import Link from "next/link";
import type { ReactNode } from "react";

const brandColors = {
  background: "oklch(22% 0.02 255)",
  window: "oklch(86% 0.17 92)",
  people: "oklch(97% 0.008 85)",
};

/** A lit service window above three people waiting. */
export function BrandMark({ size = 28, className = "", colors = brandColors }: {
  size?: number;
  className?: string;
  colors?: typeof brandColors;
}) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="4" fill={colors.background} />
      <rect x="7" y="7" width="18" height="11" rx="1" fill={colors.window} />
      <rect x="7" y="22" width="4" height="3" fill={colors.people} />
      <rect x="14" y="22" width="4" height="3" fill={colors.people} opacity="0.7" />
      <rect x="21" y="22" width="4" height="3" fill={colors.people} opacity="0.42" />
    </svg>
  );
}

export function Wordmark({ href = "/", className = "", mark = <BrandMark /> }: {
  href?: string;
  className?: string;
  mark?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-[4px] no-underline ${className}`}
    >
      {mark}
      <span className="sign text-[1.3rem] leading-none font-bold max-[399px]:sr-only">QueueWindow</span>
    </Link>
  );
}
