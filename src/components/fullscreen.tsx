"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

function subscribe(change: () => void) {
  document.addEventListener("fullscreenchange", change);
  return () => document.removeEventListener("fullscreenchange", change);
}

export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribe,
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void document.documentElement
        .requestFullscreen?.()
        .catch(() => undefined);
  }, []);
  return { active, toggle };
}

export function FullscreenToggle({
  className = "btn btn-quiet min-h-9 px-2.5",
  labels = { enter: "Enter fullscreen", exit: "Exit fullscreen" },
  showLabel = false,
}: {
  className?: string;
  labels?: { enter: string; exit: string };
  showLabel?: boolean;
}) {
  const { active, toggle } = useFullscreen();
  const label = active ? labels.exit : labels.enter;
  const Icon = active ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      className={className}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <Icon aria-hidden="true" className="size-4" />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
