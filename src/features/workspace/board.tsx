"use client";

import { ArrowRight, Maximize, Minimize, Volume2 } from "lucide-react";
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
  const audio = useRef<AudioContext | null>(null);
  const lastCall = useRef<number | null>(null);
  const [sound, setSound] = useState(false);
  const announcement =
    queue?.current?.state === "called" ? queue.announcedAt : null;
  useEffect(() => {
    const previous = lastCall.current;
    if (announcement == null) {
      if (queue && previous == null) lastCall.current = 0;
      return;
    }
    if (previous === announcement) return;
    lastCall.current = announcement;
    const context = audio.current;
    if (
      previous == null ||
      !sound ||
      !queue?.chime ||
      !context ||
      context.state !== "running"
    )
      return;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.frequency.value = 660;
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    tone.connect(gain).connect(context.destination);
    tone.start();
    tone.stop(context.currentTime + 0.35);
  }, [announcement, queue, sound]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );

  async function toggleSound() {
    if (sound) {
      setSound(false);
      return;
    }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setSound(true);
    } catch {
      setMessage("Sound is unavailable in this browser.");
    }
  }

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
    <main ref={screen} id="main" className="board" data-theme={queue.theme}>
      <header className="boardHead">
        <span>{business(queue.name)}</span>
        <div className="tools">
          {queue.chime && (
            <button
              className="icon"
              aria-label="Call sound"
              aria-pressed={sound}
              onClick={toggleSound}
            >
              <Volume2 aria-hidden="true" />
            </button>
          )}
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
        </div>
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
              : queue.paused
                ? "Ticket issuance paused"
                : queue.waiting
                  ? "Please take a seat"
                  : "You’re all caught up"}
        </h1>
        {current && (
          <div className="boardNumber" key={announcement ?? current.number}>
            <Number value={current.number} />
          </div>
        )}
        {current ? (
          <p>
            <ArrowRight aria-hidden="true" />
            {desk(queue.desk)}
          </p>
        ) : queue.paused && queue.message ? (
          <p className="boardMessage">{queue.message}</p>
        ) : null}
      </section>
      {queue.upcoming.length > 0 && (
        <section className="boardNext" aria-labelledby="upcoming">
          <h2 id="upcoming">Up next</h2>
          {
            <ol>
              {queue.upcoming.map((value) => (
                <li key={value}>
                  <Number value={value} />
                </li>
              ))}
            </ol>
          }
        </section>
      )}
    </main>
  );
}
