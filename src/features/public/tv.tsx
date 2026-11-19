"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Clock3, Mic, Volume2, WifiOff } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
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
        className="size-[0.8em] shrink-0 text-slate-400"
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
  const active = counter.calledTicket?.tokenNumber;
  const key = callKey(counter);
  return (
    <section
      aria-labelledby={id}
      className="tv-card"
      data-active={active ? "true" : "false"}
    >
      <span className="tv-accent" aria-hidden="true" />
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
              key={key ?? "idle"}
              initial={{ opacity: 0, y: 36, scale: 0.94, rotateX: -40 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{
                opacity: 0,
                y: -36,
                scale: 0.94,
                rotateX: 40,
                transition: { duration: 0.12 },
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 26,
                mass: 0.8,
              }}
              className={`tv-token tabular-nums ${active ? "" : "tv-token-idle"}`}
              data-testid="tv-called-token"
              translate="no"
            >
              {active ?? "—"}
            </motion.p>
          </AnimatePresence>
        </div>
        {key && (
          // Radiant ring: replays on every new or recalled call.
          <motion.span
            key={key}
            className="tv-ring"
            aria-hidden="true"
            initial={{ opacity: 0.95, scale: 0.97 }}
            animate={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          />
        )}
      </div>
      <div className="tv-next">
        <LanguagePair bn="পরবর্তী" en="UP NEXT" />
        <ol
          className="flex min-w-0 items-center gap-2 overflow-hidden"
          aria-label="Upcoming ticket numbers"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {(counter.waitingTokens.length ? counter.waitingTokens : ["—"]).map(
              (token) => (
                <motion.li
                  layout
                  key={token}
                  className="tv-upcoming tabular-nums"
                  translate="no"
                  initial={{ opacity: 0, scale: 0.8, x: 18 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -18 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                >
                  {token}
                </motion.li>
              ),
            )}
          </AnimatePresence>
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
  const cols =
    count <= 1 ? 1 : count <= 3 ? count : count === 4 ? 2 : count <= 6 ? 3 : 4;
  return (
    <main id="main" className="tv-shell">
      <div className="tv-aurora" aria-hidden="true" />
      <header className="tv-head">
        <div className="flex min-w-0 items-center gap-3">
          <VenueMark
            key={data?.organization.logoUrl}
            logoUrl={data?.organization.logoUrl}
            primaryColor={data?.organization.primaryColor}
          />
          <h1 className="min-w-0 truncate text-[clamp(1.1rem,2vw,1.6rem)] leading-tight font-extrabold tracking-tight">
            {data?.organization.name ?? "QueueWindow"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          {reconnecting ? (
            <p
              role="status"
              className="flex items-center gap-1.5 text-sm text-amber-200"
            >
              <WifiOff className="size-4" aria-hidden="true" />
              <LanguagePair bn="আবার সংযোগ হচ্ছে…" en="Reconnecting…" />
            </p>
          ) : (
            <span className="tv-live">
              <span className="live-dot" aria-hidden="true" />
              LIVE
            </span>
          )}
          <DhakaClock />
        </div>
      </header>

      <div className="tv-body">
        {(status === "unavailable" || noVoice) && (
          <p role="status" className="mb-3 text-sm text-slate-300">
            Audio controls may be unavailable on this device.
          </p>
        )}
        {error && !data ? (
          <div className="tv-panel" role="alert">
            <LanguagePair
              bn="সারির তথ্য পাওয়া যাচ্ছে না।"
              en="The queue is unavailable."
            />
            {error !== 404 && (
              <button
                type="button"
                className="tv-control mt-3 bg-white/10"
                onClick={() => void refresh()}
              >
                <LanguagePair bn="আবার চেষ্টা করুন" en="Try again" />
              </button>
            )}
          </div>
        ) : !data ? (
          <p className="tv-panel" role="status">
            <LanguagePair bn="সারি লোড হচ্ছে…" en="Loading the queue…" />
          </p>
        ) : count === 0 ? (
          <p className="tv-panel">
            <LanguagePair bn="কোনো কাউন্টার নেই" en="No counters available" />
          </p>
        ) : (
          <div
            className="tv-grid"
            data-count={count}
            style={{ "--tv-cols": cols } as CSSProperties}
          >
            {counters?.map((counter) => (
              <CounterCard key={counter.id} counter={counter} />
            ))}
          </div>
        )}
      </div>

      <div className="tv-dock" role="group" aria-label="Display audio">
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
    </main>
  );
}
