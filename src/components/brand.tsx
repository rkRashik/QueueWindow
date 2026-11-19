"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

/**
 * Kinetic emblem: three people queue beside a service window.
 * On hover the lead dot hops into the window and the line moves up.
 */
export function QueueMark({ size = 32 }: { size?: number }) {
  const reduce = useReducedMotion();
  const spring = { type: "spring", stiffness: 420, damping: 22 } as const;
  return (
    <motion.svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      initial="rest"
      animate="in"
      whileHover="hover"
      className="shrink-0 overflow-visible"
    >
      <rect width="32" height="32" rx="9" fill="#0F172A" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8.5"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
      />
      <motion.path
        d="M17.5 8.5h6a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-6"
        fill="none"
        stroke="#2DD4BF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          rest: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
          in: { pathLength: 1, opacity: 1, transition: { duration: 0.7 } },
        }}
      />
      {[
        { y: 23, o: 1 },
        { y: 16, o: 0.62 },
        { y: 9, o: 0.32 },
      ].map(({ y, o }, index) => (
        <motion.circle
          key={y}
          cx="10"
          cy={y}
          r="2.6"
          fill="#fff"
          variants={{
            rest: { opacity: 0, scale: reduce ? 1 : 0.4 },
            in: {
              opacity: o,
              scale: 1,
              transition: { delay: 0.25 + index * 0.1, ...spring },
            },
            hover: reduce
              ? { opacity: o }
              : index === 0
                ? {
                    x: 12,
                    y: -7,
                    fill: "#2DD4BF",
                    opacity: 1,
                    transition: spring,
                  }
                : { y: -7, opacity: Math.min(1, o + 0.3), transition: spring },
          }}
        />
      ))}
    </motion.svg>
  );
}

export function Wordmark({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex w-fit shrink-0 items-center gap-2.5 font-display text-[1.1rem] font-semibold tracking-tight text-ink ${className}`}
      translate="no"
    >
      <QueueMark />
      QueueWindow
    </Link>
  );
}
