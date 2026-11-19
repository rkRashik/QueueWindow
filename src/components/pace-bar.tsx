"use client";

import { motion, useReducedMotion } from "framer-motion";
import { pace } from "@/lib/time";

/** Horizontal pacing bar: fills toward the target, teal → amber → rose. */
export function PaceBar({
  seconds,
  target,
  label = "Service pace",
  track = "bg-slate-200/80",
  height = "h-1.5",
}: {
  seconds: number;
  target?: number;
  label?: string;
  track?: string;
  height?: string;
}) {
  const reduce = useReducedMotion();
  const { ratio, color } = pace(seconds, target);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(ratio * 100))}
      className={`w-full overflow-hidden rounded-full ${height} ${track}`}
    >
      <motion.div
        className="h-full w-full origin-left rounded-full"
        initial={false}
        animate={{
          scaleX: Math.min(1, Math.max(0.02, ratio)),
          backgroundColor: color,
        }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 120, damping: 24 }
        }
      />
    </div>
  );
}
