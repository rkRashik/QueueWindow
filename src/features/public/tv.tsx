"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  Moon,
  Sun,
  Volume2,
  WifiOff,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CounterBadge } from "@/components/counter-badge";
import { useFullscreen } from "@/components/fullscreen";
import { counterVars, getCounterTheme, sortCounters } from "@/lib/counter-theme";
import { useStoredChoice } from "@/lib/stored";
import { formatClock, formatDay } from "@/lib/time";
import { announce, useChime } from "./audio";
import { Dual, PublicLanguage, PublicLocale, usePublicLocale } from "./language";
import { usePublicFeed, type DisplayData, type PublicCounter } from "./live";
import { VenueMark } from "./ui";

type Theme = "light" | "dark";
const themes = ["light", "dark"] as const;

function callKey(counter: PublicCounter) {
  return counter.calledTicket
    ? `${counter.calledTicket.tokenNumber}:${counter.calledTicket.calledAt}`
    : null;
}

function Clock() {
  const { language } = usePublicLocale();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 5_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="tv-clock" aria-label="Dhaka time">
      <time className="tv-time tabular-nums" dateTime={now?.toISOString()}>
        {now ? formatClock(now, language) : "—:—"}
      </time>
      <span className="tv-date">{now ? formatDay(now, language) : ""}</span>
    </div>
  );
}

/** Vertical slot-machine digits: only characters that change roll. */
function Odometer({ value }: { value: string }) {
  const reduce = useReducedMotion();
  return (
    <>
      {Array.from(value).map((char, index) => (
        <span key={index} className="odo-col">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={char}
              className="odo-char"
              initial={reduce ? false : { y: "110%", rotateX: -75, opacity: 0 }}
              animate={{
                y: 0,
                rotateX: 0,
                opacity: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                  mass: 0.85,
                  delay: reduce ? 0 : index * 0.045,
                },
              }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : {
                      y: "-110%",
                      rotateX: 75,
                      opacity: 0,
                      transition: { duration: 0.22, ease: "easeIn" },
                    }
              }
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </>
  );
}

function CounterCard({
  counter,
  index,
  total,
}: {
  counter: PublicCounter;
  index: number;
  total: number;
}) {
  const id = useId();
  const active = counter.calledTicket?.tokenNumber;
  const key = callKey(counter);
  const theme = getCounterTheme(counter.prefix);
  return (
    <motion.section
      aria-labelledby={id}
      className="tv-card"
      data-active={active ? "true" : "false"}
      style={counterVars(theme)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 26,
        delay: index * 0.08,
      }}
    >
      <span className="tv-strip" aria-hidden="true" />
      <header className="tv-card-head">
        <CounterBadge prefix={counter.prefix} index={index + 1} size="lg" />
        <h2 id={id} className="min-w-0 break-words">
          {counter.name}
        </h2>
        <span className="tv-chip ms-auto">
          {counter.status === "PAUSED" ? (
            <Dual en="Paused" bn="স্থগিত" />
          ) : (
            <Dual
              en={`${counter.waitingCount} waiting`}
              bn={`${new Intl.NumberFormat("bn").format(counter.waitingCount)} জন অপেক্ষায়`}
            />
          )}
        </span>
      </header>
      <div className="tv-serving" data-count={total}>
        <p className="tv-label">
          <Dual en="Now serving" bn="এখন ডাকছেন" />
        </p>
        <div className="tv-number-frame">
          <p
            className={`tv-token tabular-nums ${active ? "" : "tv-token-idle"}`}
            data-testid="tv-called-token"
            translate="no"
          >
            <Odometer value={active ?? "—"} />
          </p>
          {key && (
            // Ambient pulse: replays on every new or recalled call.
            <motion.span
              key={key}
              className="tv-ring"
              aria-hidden="true"
              initial={{ opacity: 0.9, scale: 0.94 }}
              animate={{ opacity: 0, scale: 1.12 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
            />
          )}
        </div>
      </div>
      <div className="tv-next">
        <p className="tv-label">
          <Dual en="Up next" bn="পরবর্তী" />
        </p>
        <ol className="tv-next-list" aria-label="Upcoming ticket numbers">
          <AnimatePresence initial={false} mode="popLayout">
            {(counter.waitingTokens.length ? counter.waitingTokens : ["—"]).map(
              (token) => (
                <motion.li
                  layout
                  key={token}
                  className="tv-upcoming tabular-nums"
                  translate="no"
                  initial={{ opacity: 0, scale: 0.85, x: 18 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, x: -18 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                >
                  {token}
                </motion.li>
              ),
            )}
          </AnimatePresence>
        </ol>
      </div>
    </motion.section>
  );
}

type Spotlight = {
  key: string;
  token: string;
  counter: string;
  prefix: string;
};

function SpotlightToast({ spotlight }: { spotlight: Spotlight | null }) {
  return (
    <div className="tv-spot-slot" role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {spotlight && (
          <motion.div
            key={spotlight.key}
            className="tv-spot"
            style={counterVars(getCounterTheme(spotlight.prefix))}
            initial={{ opacity: 0, y: -16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <span className="wave" aria-hidden="true">
              <i className="wave-bar" />
              <i className="wave-bar" />
              <i className="wave-bar" />
              <i className="wave-bar" />
            </span>
            <span className="tv-spot-text">
              <Dual en="Now calling" bn="এখন ডাকা হচ্ছে" />
            </span>
            <strong className="tv-spot-token tabular-nums" translate="no">
              {spotlight.token}
            </strong>
            <span className="tv-spot-arrow" aria-hidden="true">
              →
            </span>
            <span className="tv-spot-counter">{spotlight.counter}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DockButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="tv-control"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Tv({ slug }: { slug: string }) {
  const { language } = usePublicLocale();
  const [theme, setTheme] = useStoredChoice<Theme>(
    "qw-tv-theme",
    "light",
    themes,
  );
  const fullscreen = useFullscreen();
  const [chimeEnabled, setChimeEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [dockVisible, setDockVisible] = useState(true);
  const dockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const spotTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const last = useRef<Map<string, string | null> | null>(null);
  const { status, unlock, play } = useChime();
  const settings = useRef({ chimeEnabled, voiceEnabled, play });
  useEffect(() => {
    settings.current = { chimeEnabled, voiceEnabled, play };
  }, [chimeEnabled, play, voiceEnabled]);

  // Detect new or recalled calls straight from each live snapshot.
  const onSnapshot = useCallback((snapshot: DisplayData) => {
    const previous = last.current;
    last.current = new Map(
      snapshot.counters.map((counter) => [counter.id, callKey(counter)]),
    );
    if (!previous) return;
    const changes = snapshot.counters.filter(
      (counter) =>
        counter.calledTicket && previous.get(counter.id) !== callKey(counter),
    );
    if (!changes.length) return;
    const latest = changes[changes.length - 1];
    setSpotlight({
      key: callKey(latest)!,
      token: latest.calledTicket!.tokenNumber,
      counter: latest.name,
      prefix: latest.prefix,
    });
    clearTimeout(spotTimer.current);
    spotTimer.current = setTimeout(() => setSpotlight(null), 7_000);
    if (settings.current.chimeEnabled) settings.current.play();
    if (settings.current.voiceEnabled)
      for (const item of changes)
        announce(item.calledTicket!.tokenNumber, item.name);
  }, []);

  const { data, error, reconnecting, refresh } = usePublicFeed(
    slug,
    onSnapshot,
  );

  // The dock glides away after 4 seconds without pointer, touch or key input.
  useEffect(() => {
    function wake() {
      setDockVisible(true);
      clearTimeout(dockTimer.current);
      dockTimer.current = setTimeout(() => setDockVisible(false), 4_000);
    }
    wake();
    const events = ["pointermove", "pointerdown", "touchstart", "keydown"];
    for (const name of events) window.addEventListener(name, wake, { passive: true });
    return () => {
      for (const name of events) window.removeEventListener(name, wake);
      clearTimeout(dockTimer.current);
      clearTimeout(spotTimer.current);
    };
  }, []);

  const counters = sortCounters(data?.counters ?? []);
  const count = counters.length;
  const cols =
    count <= 1 ? 1 : count <= 3 ? count : count === 4 ? 2 : count <= 6 ? 3 : 4;

  return (
    <main
      id="main"
      lang={language}
      className="tv-shell"
      data-theme={theme}
      data-idle={dockVisible ? "false" : "true"}
    >
      <div className="tv-aurora" aria-hidden="true" />
      <header className="tv-head">
        <div className="flex min-w-0 items-center gap-3">
          <VenueMark
            key={data?.organization.logoUrl}
            logoUrl={data?.organization.logoUrl}
            primaryColor={data?.organization.primaryColor}
          />
          <h1 className="tv-title">{data?.organization.name ?? "QueueWindow"}</h1>
        </div>
        <SpotlightToast spotlight={spotlight} />
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          {reconnecting ? (
            <p role="status" className="tv-reconnect">
              <WifiOff className="size-4" aria-hidden="true" />
              <Dual en="Reconnecting…" bn="আবার সংযোগ হচ্ছে…" />
            </p>
          ) : (
            <span className="tv-live">
              <span className="live-dot" aria-hidden="true" />
              <Dual en="Live" bn="লাইভ" />
            </span>
          )}
          <Clock />
        </div>
      </header>

      <div className="tv-body">
        {noVoice && (
          <p role="status" className="tv-note">
            Voice announcements are unavailable on this device.
          </p>
        )}
        {error && !data ? (
          <div className="tv-panel" role="alert">
            <Dual
              en="The queue is unavailable."
              bn="সারির তথ্য পাওয়া যাচ্ছে না।"
            />
            {error !== 404 && (
              <button
                type="button"
                className="tv-control tv-retry mt-3"
                onClick={() => void refresh()}
              >
                <Dual en="Try again" bn="আবার চেষ্টা করুন" />
              </button>
            )}
          </div>
        ) : !data ? (
          <div className="tv-skeleton" role="status" aria-label="Loading">
            {[0, 1].map((item) => (
              <div key={item} className="tv-card tv-card-skeleton" />
            ))}
          </div>
        ) : count === 0 ? (
          <p className="tv-panel">
            <Dual en="No counters available" bn="কোনো কাউন্টার নেই" />
          </p>
        ) : (
          <div
            className="tv-grid"
            data-count={count}
            style={{ "--tv-cols": cols } as CSSProperties}
          >
            {counters.map((counter, index) => (
              <CounterCard
                key={counter.id}
                counter={counter}
                index={index}
                total={count}
              />
            ))}
          </div>
        )}
      </div>

      <motion.div
        className="tv-dock"
        role="group"
        aria-label="Display controls"
        inert={!dockVisible}
        initial={false}
        animate={{
          opacity: dockVisible ? 1 : 0,
          y: dockVisible ? 0 : 24,
          scale: dockVisible ? 1 : 0.97,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <DockButton
          label={fullscreen.active ? "Exit fullscreen" : "Enter fullscreen"}
          pressed={fullscreen.active}
          onClick={fullscreen.toggle}
        >
          {fullscreen.active ? (
            <Minimize2 className="size-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="size-4" aria-hidden="true" />
          )}
        </DockButton>
        <DockButton
          label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? (
            <Moon className="size-4" aria-hidden="true" />
          ) : (
            <Sun className="size-4" aria-hidden="true" />
          )}
        </DockButton>
        <span className="tv-dock-sep" aria-hidden="true" />
        <PublicLanguage variant="glass" />
        <span className="tv-dock-sep" aria-hidden="true" />
        {status !== "ready" ? (
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
            Enable sound
          </button>
        ) : (
          <DockButton
            label="Chime"
            pressed={chimeEnabled}
            onClick={() => setChimeEnabled(!chimeEnabled)}
          >
            {chimeEnabled ? (
              <Bell className="size-4" aria-hidden="true" />
            ) : (
              <BellOff className="size-4" aria-hidden="true" />
            )}
          </DockButton>
        )}
        <DockButton
          label="Voice announcement"
          pressed={voiceEnabled}
          onClick={() => {
            if (!("speechSynthesis" in window)) {
              setNoVoice(true);
              return;
            }
            if (voiceEnabled) window.speechSynthesis.cancel();
            setVoiceEnabled(!voiceEnabled);
          }}
        >
          {voiceEnabled ? (
            <Mic className="size-4" aria-hidden="true" />
          ) : (
            <MicOff className="size-4" aria-hidden="true" />
          )}
        </DockButton>
      </motion.div>
    </main>
  );
}

export function TvScreen({ slug }: { slug: string }) {
  return (
    <PublicLocale>
      <Tv slug={slug} />
    </PublicLocale>
  );
}
