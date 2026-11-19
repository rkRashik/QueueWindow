"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Minimal anchored popover: outside click and Escape close it. */
export function Popover({
  trigger,
  label,
  triggerClassName = "btn btn-quiet min-h-9 px-2.5",
  align = "end",
  children,
}: {
  trigger: ReactNode;
  label: string;
  triggerClassName?: string;
  align?: "start" | "end";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function down(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className={triggerClassName}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            style={{
              transformOrigin: align === "end" ? "top right" : "top left",
            }}
            className={`absolute top-[calc(100%+0.5rem)] z-40 min-w-56 rounded-2xl border border-slate-900/[0.07] bg-white p-1.5 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25),0_2px_6px_rgba(15,23,42,0.06)] ${align === "end" ? "right-0" : "left-0"}`}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
