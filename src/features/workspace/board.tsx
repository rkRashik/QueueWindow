"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/client";
import type { DisplayView } from "@/lib/domain";
import { business, desk, Number, Offline, State } from "./ui";

export function Board({ id }: { id: string }) {
  const {
    data: queue,
    error,
    refresh,
  } = usePoll<DisplayView>("/api/display/" + encodeURIComponent(id));
  const screen = useRef<HTMLElement>(null);
  const [full, setFull] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const sync = () =>
      setFull(
        !!screen.current && document.fullscreenElement === screen.current,
      );
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await screen.current?.requestFullscreen();
      setMessage("");
    } catch {
      setMessage("Fullscreen is unavailable in this browser.");
    }
  }
  if (!queue)
    return (
      <State
        title={error ? "Display unavailable" : "Loading queue…"}
        detail={
          error ? "Check the link or your connection and try again." : undefined
        }
      >
        {error && (
          <button className="plain" onClick={refresh}>
            Try again
          </button>
        )}
      </State>
    );

  const current = queue.current;
  const called = current?.state === "called";
  return (
    <main ref={screen} id="main" className="board">
      <header className="boardHead">
        <span>{business(queue.name)}</span>
        <button
          className="icon"
          aria-label={full ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={fullscreen}
        >
          {full ? (
            <Minimize size={25} aria-hidden="true" />
          ) : (
            <Maximize size={25} aria-hidden="true" />
          )}
        </button>
      </header>
      {error && <Offline refresh={refresh} />}
      {message && <p role="status">{message}</p>}
      <section
        className="boardCall"
        data-called={called || undefined}
        aria-live="polite"
        aria-atomic="true"
      >
        <h1>
          <span className="dot" />
          {called
            ? "Now calling"
            : current
              ? "In service"
              : queue.waiting
                ? "Please take a seat"
                : "You’re all caught up"}
        </h1>
        {current && (
          <div className="boardNumber">
            <Number value={current.number} />
          </div>
        )}
        {current && <p>{desk(queue.desk)}</p>}
      </section>
      <section className="boardNext" aria-labelledby="upcoming">
        <h2 id="upcoming">Up next</h2>
        {queue.upcoming.length ? (
          <ol>
            {queue.upcoming.map((value) => (
              <li key={value}>
                <Number value={value} />
              </li>
            ))}
          </ol>
        ) : (
          <p>No one waiting</p>
        )}
      </section>
    </main>
  );
}
