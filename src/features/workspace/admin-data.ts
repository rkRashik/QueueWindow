"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./client";
import { useLocale } from "./locale";

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(() => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    return api<T>(path, { signal: controller.signal }).then(
      (result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError("");
        }
      },
      (failure: unknown) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : "");
      },
    );
  }, [path]);
  useEffect(() => {
    void reload();
    return () => pending.current?.abort();
  }, [reload]);
  return { data, error, reload };
}

export function useMutation() {
  const { language, t } = useLocale();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(task: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (failure) {
      setError(
        language === "en" && failure instanceof Error
          ? failure.message
          : t.error,
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run, clear: () => setError("") };
}
