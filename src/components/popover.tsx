"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Anchored menu: outside click and Escape close it and return focus. */
export function Popover({
  trigger,
  label,
  triggerClassName = "key key-quiet key-sm",
  panelClassName = "",
  align = "end",
  children,
}: {
  trigger: ReactNode;
  label: string;
  triggerClassName?: string;
  panelClassName?: string;
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
        title={label}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          className={`menu ${panelClassName}`}
          style={align === "end" ? { right: 0 } : { left: 0 }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
