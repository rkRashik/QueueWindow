"use client";

import { useCallback, useSyncExternalStore } from "react";

/** A tiny persisted choice (language mode, theme) shared across components. */
export function useStoredChoice<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
) {
  const subscribe = useCallback(
    (change: () => void) => {
      window.addEventListener(key, change);
      window.addEventListener("storage", change);
      return () => {
        window.removeEventListener(key, change);
        window.removeEventListener("storage", change);
      };
    },
    [key],
  );
  const read = useCallback((): T => {
    try {
      const value = localStorage.getItem(key) as T | null;
      return value !== null && (!allowed || allowed.includes(value)) ? value : fallback;
    } catch {
      return memory.get(key) === undefined ? fallback : (memory.get(key) as T);
    }
  }, [allowed, fallback, key]);
  const value = useSyncExternalStore(subscribe, read, () => fallback);
  const set = useCallback(
    (next: T) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* Keep the in-memory choice. */
      }
      window.dispatchEvent(new Event(key));
    },
    [key],
  );
  return [value, set] as const;
}

const memory = new Map<string, string>();
