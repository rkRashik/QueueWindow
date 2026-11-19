"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// One switch for every framer-motion transform and layout animation:
// visitors with prefers-reduced-motion get instant state changes.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
