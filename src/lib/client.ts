"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw new HttpError(
      body.error || "Something went wrong. Please try again.",
      response.status,
    );
  return body as T;
}
export function usePoll<T extends { version: number }>(
  url: string | null,
  token?: string,
  interval = 5000,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(0);
  const busy = useRef(false);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    if (!url || busy.current || document.hidden) return;
    busy.current = true;
    try {
      const next = await request<T>(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      if (alive.current) {
        setData((previous) =>
          previous && previous.version > next.version ? previous : next,
        );
        setError("");
        setUpdatedAt(Date.now());
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof HttpError
            ? e.message
            : "Your connection was interrupted. We’ll reconnect automatically.",
        );
    } finally {
      busy.current = false;
    }
  }, [url, token]);
  useEffect(() => {
    alive.current = true;
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    const timer = setInterval(() => {
      void refresh();
    }, interval);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    const offline = () =>
      setError("You’re offline. Showing the last known queue.");
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    window.addEventListener("offline", offline);
    return () => {
      alive.current = false;
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
      window.removeEventListener("offline", offline);
    };
  }, [refresh, interval]);
  return { data, error, updatedAt, refresh };
}
