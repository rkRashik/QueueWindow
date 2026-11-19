"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { displaySnapshot, visitorTicket } from "@/features/queue/public";
import { ApiError, api, type Wire } from "@/features/workspace/client";

export type DisplayData = Wire<Awaited<ReturnType<typeof displaySnapshot>>>;
export type PublicCounter = DisplayData["counters"][number];
export type Venue = DisplayData["organization"];
export type TicketData = Awaited<ReturnType<typeof visitorTicket>>;

function subscribe(change: () => void) {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => {
    window.removeEventListener("online", change);
    window.removeEventListener("offline", change);
  };
}

export function usePublicFeed(slug: string, onSnapshot?: (snapshot: DisplayData) => void) {
  const [data, setData] = useState<DisplayData | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const pending = useRef<AbortController | null>(null);
  const path = `/api/public/${encodeURIComponent(slug)}`;

  const refresh = useCallback(() => {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    return api<DisplayData>(`${path}/display`, { signal: request.signal }).then(
      (value) => {
        if (request.signal.aborted) return;
        setData(value);
        setError(null);
        onSnapshot?.(value);
      },
      (failure: unknown) => {
        if (!request.signal.aborted)
          setError(failure instanceof ApiError ? failure.status : 503);
      },
    );
  }, [onSnapshot, path]);

  useEffect(() => {
    if (!online) return;
    let events: EventSource | undefined;
    let warning: ReturnType<typeof setTimeout> | undefined;

    function warn() {
      warning ??= setTimeout(() => setReconnecting(true), 4_500);
    }

    function receive(event: MessageEvent<string>) {
      try {
        const value = JSON.parse(event.data) as DisplayData;
        if (!value.organization || !Array.isArray(value.counters)) return;
        clearTimeout(warning);
        warning = undefined;
        pending.current?.abort();
        setReconnecting(false);
        setData(value);
        setError(null);
        onSnapshot?.(value);
      } catch {
        warn();
      }
    }

    function connect() {
      if (document.hidden || events) return;
      void refresh();
      warn();
      if (typeof EventSource === "undefined") return;
      events = new EventSource(`${path}/stream`);
      events.addEventListener("snapshot", receive);
      events.addEventListener("update", receive);
      events.onerror = warn;
    }

    function close() {
      events?.close();
      events = undefined;
      clearTimeout(warning);
      warning = undefined;
      pending.current?.abort();
    }

    function visibilityChanged() {
      if (document.hidden) close();
      else connect();
    }

    connect();
    document.addEventListener("visibilitychange", visibilityChanged);
    const fallback = setInterval(() => {
      if (
        !document.hidden &&
        (!events || events.readyState !== EventSource.OPEN)
      )
        void refresh();
    }, 8_000);
    return () => {
      close();
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [onSnapshot, online, path, refresh]);

  return {
    data,
    error,
    reconnecting: reconnecting || !online,
    online,
    refresh,
  };
}
