"use client";

import { ArrowRight, Maximize, Minimize, Volume2, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/client";
import type { DisplayView } from "@/lib/domain";
import { enableSound, playChime } from "./chime";
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
    playChime(context, queue.chimeStyle);
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
      audio.current = await enableSound(audio.current);
      setSound(true);
      if (queue) playChime(audio.current, queue.chimeStyle);
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
  const t = (bn: string, en: string) => (queue.language === "bn" ? bn : en);
  return (
    <main
      ref={screen}
      id="main"
      className="board"
      data-theme={queue.theme}
      lang={queue.language}
    >
      <header className="boardHead">
        <span>{business(queue.name)}</span>
        <div className="tools">
          {queue.selfService && (
            <a
              className="plain boardJoin"
              href={"/kiosk/" + id}
              target="_blank"
              rel="noreferrer"
            >
              <QrCode size={20} aria-hidden="true" />{" "}
              {t("টোকেন নিন", "Take a ticket")}
            </a>
          )}
          {queue.chime && (
            <button
              className="icon"
              aria-label={t("ডাকার শব্দ", "Call sound")}
              aria-pressed={sound}
              onClick={toggleSound}
            >
              <Volume2 aria-hidden="true" />
            </button>
          )}
          <button
            className="icon"
            aria-label={
              full
                ? t("পূর্ণ পর্দা বন্ধ করুন", "Exit fullscreen")
                : t("পূর্ণ পর্দায় দেখুন", "Enter fullscreen")
            }
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
            ? t("এখন ডাকা হচ্ছে", "Now calling")
            : current
              ? t("সেবা চলছে", "In service")
              : queue.paused
                ? t("টোকেন দেওয়া বন্ধ আছে", "Ticket issuance paused")
                : queue.waiting
                  ? t("বসে অপেক্ষা করুন", "Please take a seat")
                  : t("লাইনে কেউ নেই", "You’re all caught up")}
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
          <h2 id="upcoming">{t("এরপর", "Up next")}</h2>
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
