import Link from "next/link";

/** A lit service window above three people waiting. */
export function QueueMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="4" fill="oklch(22% 0.02 255)" />
      <rect x="7" y="7" width="18" height="11" rx="1" fill="oklch(86% 0.17 92)" />
      <rect x="7" y="22" width="4" height="3" fill="oklch(97% 0.008 85)" />
      <rect x="14" y="22" width="4" height="3" fill="oklch(97% 0.008 85)" opacity="0.7" />
      <rect x="21" y="22" width="4" height="3" fill="oklch(97% 0.008 85)" opacity="0.42" />
    </svg>
  );
}

export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-[4px] no-underline ${className}`}
    >
      <QueueMark />
      <span className="sign text-[1.3rem] leading-none font-bold max-[399px]:sr-only">QueueWindow</span>
    </Link>
  );
}
