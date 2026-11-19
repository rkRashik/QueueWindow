"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { deskState } from "@/features/queue/read-model";
import { ApiError, api, type Wire } from "./client";

export type DeskSnapshot = Wire<Awaited<ReturnType<typeof deskState>>>;

function subscribeOnline(change: () => void) {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => {
    window.removeEventListener("online", change);
    window.removeEventListener("offline", change);
  };
}

export function useDeskState(slug: string) {
  const [selected, setSelected] = useState("");
  const selectedRef = useRef("");
  const [data, setData] = useState<DeskSnapshot | null>(null);
  const [error, setError] = useState("");
  const [link, setLink] = useState<"connecting" | "live" | "reconnecting">(
    "connecting",
  );
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const pending = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const counterId = selectedRef.current;
    const load = (id: string) =>
      api<DeskSnapshot>(
        id
          ? `/api/desk/state?counterId=${encodeURIComponent(id)}`
          : "/api/desk/state",
        { signal: controller.signal },
      );

    try {
      let snapshot: DeskSnapshot;
      try {
        snapshot = await load(counterId);
      } catch (failure) {
        if (
          !(failure instanceof ApiError) ||
          failure.status !== 404 ||
          !counterId
        )
          throw failure;
        snapshot = await load("");
      }
      if (controller.signal.aborted) return;
      const current = snapshot.selectedCounterId ?? "";
      selectedRef.current = current;
      setSelected(current);
      setData(snapshot);
      setError("");
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof ApiError
            ? failure.message
            : "Could not reach QueueWindow.",
        );
    }
  }, []);

  const selectCounter = useCallback(
    (id: string) => {
      selectedRef.current = id;
      setSelected(id);
      void refresh();
    },
    [refresh],
  );

  useEffect(() => {
    if (!online) return;
    let stream: EventSource | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function receive() {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      setLink("live");
      if (!document.hidden) void refresh();
    }

    function warnIfDisconnected() {
      reconnectTimer ??= setTimeout(() => setLink("reconnecting"), 4_000);
    }

    function connect() {
      if (document.hidden || stream) return;
      void refresh();
      warnIfDisconnected();
      if (typeof EventSource === "undefined") return;
      stream = new EventSource(
        `/api/public/${encodeURIComponent(slug)}/stream`,
      );
      stream.addEventListener("snapshot", receive);
      stream.addEventListener("update", receive);
      stream.onerror = warnIfDisconnected;
    }

    function visibilityChanged() {
      if (document.hidden) {
        stream?.close();
        stream = undefined;
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      } else {
        connect();
      }
    }

    connect();
    document.addEventListener("visibilitychange", visibilityChanged);
    const poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 8_000);
    return () => {
      clearInterval(poll);
      clearTimeout(reconnectTimer);
      stream?.close();
      document.removeEventListener("visibilitychange", visibilityChanged);
      pending.current?.abort();
    };
  }, [slug, online, refresh]);

  return { data, selected, selectCounter, refresh, error, online, link };
}
