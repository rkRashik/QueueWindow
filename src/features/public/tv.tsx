"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, Clock3, Mic, Volume2, WifiOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { announce, useChime } from "./audio";
import { usePublicFeed, type PublicCounter } from "./live";
import { VenueMark } from "./ui";

const localTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function DhakaClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const clock = setInterval(tick, 1_000);
    return () => {
      clearTimeout(initial);
      clearInterval(clock);
    };
  }, []);
  return (
    <div className="tv-clock" aria-label="Dhaka time">
      <Clock3
        className="size-[1em] shrink-0 text-slate-400"
        aria-hidden="true"
      />
      <time className="tabular-nums" dateTime={now?.toISOString()}>
        {now ? localTime.format(now) : "—:—:—"}
      </time>
      <span className="text-xs font-bold text-slate-300" lang="bn">
        ঢাকা
      </span>
    </div>
  );
}

function LanguagePair({ bn, en }: { bn: string; en: string }) {
  return (
    <span className="tv-language-pair">
      <span lang="bn">{bn}</span>
      <span aria-hidden="true">·</span>
      <span lang="en">{en}</span>
    </span>
  );
}

function callKey(counter: PublicCounter) {
  return counter.calledTicket
    ? `${counter.calledTicket.tokenNumber}:${counter.calledTicket.calledAt}`
    : null;
}

function CounterCard({ counter }: { counter: PublicCounter }) {
  const id = useId();
  const reduce = useReducedMotion();
  const active = counter.calledTicket?.tokenNumber;
  return (
    <section aria-labelledby={id} className="tv-card">
      <header className="tv-card-head">
        <h2 id={id} className="min-w-0 break-words">
          {counter.name}
        </h2>
        {counter.status === "PAUSED" && (
          <span className="tv-paused">
            <LanguagePair bn="স্থগিত" en="PAUSED" />
          </span>
        )}
      </header>
      <div className="tv-serving">
        <LanguagePair bn="এখন ডাকছেন" en="NOW SERVING" />
        <div className="tv-number-frame" aria-live="polite" aria-atomic="true">
          <AnimatePresence initial={false} mode="wait">
            <motion.p
              layout={false}
              key={callKey(counter) ?? "idle"}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduce
                  ? undefined
                  : { opacity: 0, y: -5, transition: { duration: 0.1 } }
              }
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 340, damping: 29, mass: 0.75 }
              }
              className={`tv-token tabular-nums ${active ? "" : "tv-token-idle"}`}
              data-testid="tv-called-token"
              translate="no"
            >
              {active ?? "—"}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <div className="tv-next">
        <LanguagePair bn="পরবর্তী" en="UP NEXT" />
        <ol
          className="flex min-w-0 flex-wrap items-center gap-2"
          aria-label="Upcoming ticket numbers"
        >
          {(counter.waitingTokens.length ? counter.waitingTokens : ["—"]).map(
            (token, i) => (
              <li
                className="tv-upcoming tabular-nums"
                key={`${token}-${i}`}
                translate="no"
              >
                {token}
              </li>
            ),
          )}
        </ol>
      </div>
    </section>
  );
}

export function TvScreen({ slug }: { slug: string }) {
  const { data, error, reconnecting, refresh } = usePublicFeed(slug);
  const [chimeEnabled, setChimeEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const last = useRef<Map<string, string | null> | null>(null);
  const { status, unlock, play } = useChime();
  const counters = data?.counters;

  useEffect(() => {
    if (!counters) return;
    const previous = last.current;
    last.current = new Map(
      counters.map((counter) => [counter.id, callKey(counter)]),
    );
    if (!previous) return;
    const changes = counters.filter(
      (counter) =>
        counter.calledTicket && previous.get(counter.id) !== callKey(counter),
    );
    if (changes.length && chimeEnabled) play();
    if (voiceEnabled) {
      for (const item of changes)
        announce(item.calledTicket!.tokenNumber, item.name);
    }
  }, [chimeEnabled, counters, play, voiceEnabled]);

  const count = counters?.length ?? 0;
  return (
    <main id="main" className="tv-shell">
      <header className="tv-head">
        <div className="flex min-w-0 items-center gap-4">
          <VenueMark
            key={data?.organization.logoUrl}
            logoUrl={data?.organization.logoUrl}
            primaryColor={data?.organization.primaryColor}
          />
          <h1 className="min-w-0 break-words text-[clamp(1.25rem,2.7vw,2.4rem)] leading-tight font-extrabold tracking-tight">
            {data?.organization.name ?? "QueueWindow"}
          </h1>
        </div>
        <DhakaClock />
      </header>

      <div className="tv-toolbar">
        <div className="flex min-h-8 items-center">
          {reconnecting && (
            <p
              role="status"
              className="flex flex-wrap items-center gap-1.5 text-sm text-slate-300"
            >
              <WifiOff className="size-4" aria-hidden="true" />
              <LanguagePair bn="আবার সংযোগ হচ্ছে…" en="Reconnecting…" />
            </p>
          )}
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Display audio"
        >
          {status !== "ready" && (
            <button
              type="button"
              className="tv-control tv-unlock"
              onClick={async () => {
                if (await unlock()) {
                  setChimeEnabled(true);
                  play();
                }
              }}
            >
              <Volume2 className="size-4" aria-hidden="true" />
              <LanguagePair bn="শব্দ চালু করুন" en="Enable Sound" />
            </button>
          )}
          <button
            type="button"
            className="tv-control"
            disabled={status !== "ready"}
            aria-pressed={chimeEnabled}
            onClick={() => setChimeEnabled(!chimeEnabled)}
          >
            <Bell className="size-4" aria-hidden="true" />
            <LanguagePair bn="ঘণ্টা" en="Chime" />
          </button>
          <button
            type="button"
            className="tv-control"
            aria-pressed={voiceEnabled}
            onClick={() => {
              if (!("speechSynthesis" in window)) {
                setNoVoice(true);
                return;
              }
              if (voiceEnabled) window.speechSynthesis.cancel();
              setVoiceEnabled(!voiceEnabled);
            }}
          >
            <Mic className="size-4" aria-hidden="true" />
            <LanguagePair bn="কণ্ঠ ঘোষণা" en="Voice Announcement" />
          </button>
        </div>
      </div>
      {(status === "unavailable" || noVoice) && (
        <p role="status" className="mb-3 text-sm text-slate-300">
          Audio controls may be unavailable on this device.
        </p>
      )}
      {error && !data ? (
        <div className="tv-card p-6" role="alert">
          <LanguagePair
            bn="সারির তথ্য পাওয়া যাচ্ছে না।"
            en="The queue is unavailable."
          />
          {error !== 404 && (
            <button
              type="button"
              className="tv-control mt-3"
              onClick={() => void refresh()}
            >
              <LanguagePair bn="আবার চেষ্টা করুন" en="Try again" />
            </button>
          )}
        </div>
      ) : !data ? (
        <p className="tv-card p-6" role="status">
          <LanguagePair bn="সারি লোড হচ্ছে…" en="Loading the queue…" />
        </p>
      ) : count === 0 ? (
        <p className="tv-card p-6">
          <LanguagePair bn="কোনো কাউন্টার নেই" en="No counters available" />
        </p>
      ) : (
        <div
          className="tv-grid"
          data-layout={
            count === 1 ? "single" : count > 4 ? "dense" : "standard"
          }
        >
          {counters?.map((counter) => (
            <CounterCard key={counter.id} counter={counter} />
          ))}
        </div>
      )}
    </main>
  );
}
