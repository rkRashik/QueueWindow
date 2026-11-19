"use client";

import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Rows3,
  PanelLeft,
  LayoutGrid,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Drum } from "@/components/drum";
import { Plate } from "@/components/plate";
import { useFullscreen } from "@/components/fullscreen";
import { counterVars, getCounterTheme, sortCounters } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { useStoredChoice } from "@/lib/stored";
import { formatClock, formatDay } from "@/lib/time";
import { announce, useChime } from "./audio";
import { Dual, PublicLanguage, PublicLocale, Tx, usePublicLocale } from "./language";
import { usePublicFeed, type DisplayData, type PublicCounter } from "./live";
import { VenueMark } from "./ui";

type Theme = "light" | "dark";
export type DisplayStyle = "board" | "spotlight" | "kinetic";
export const displayStyles = ["board", "spotlight", "kinetic"] as const;
const themes = ["light", "dark"] as const;
const callSeconds = 8;

function callKey(counter: PublicCounter) {
  return counter.calledTicket
    ? `${counter.calledTicket.tokenNumber}:${counter.calledTicket.calledAt}`
    : null;
}

function calls(snapshot: DisplayData | null) {
  return snapshot
    ? new Map(snapshot.counters.map((counter) => [counter.id, callKey(counter)]))
    : null;
}

function Clock() {
  const { language } = usePublicLocale();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 5_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="board-clock">
      <time className="sign board-time" dateTime={now?.toISOString()}>
        {now ? formatClock(now, language) : " "}
      </time>
      <span className="board-date">{now ? formatDay(now, language) : " "}</span>
    </div>
  );
}

/** One counter on the board. Presentational: also drives the landing-page miniature. */
export function BoardRow({
  counter,
  calling,
}: {
  counter: PublicCounter;
  /** Changes on every new call or recall; restarts the lamp. */
  calling?: string | null;
}) {
  const { language } = usePublicLocale();
  const token = counter.calledTicket?.tokenNumber;
  const open = counter.status === "OPEN";
  const next = counter.waitingTokens;
  const more = counter.waitingCount - next.length;
  // One budget for every row so next-up lists line up at the same size.
  const nextChars = Math.max(18, next.join("  ").length + (more > 0 ? 3 : 0));
  return (
    <li
      className="board-row"
      data-open={open}
      data-calling={calling ? "true" : undefined}
      style={counterVars(getCounterTheme(counter.prefix))}
    >
      {calling && <span key={calling} className="board-lamp" aria-hidden="true" />}
      <span className="board-plate">
        <Plate prefix={counter.prefix} />
      </span>
      <span className="board-name">
        <span className="board-name-text">{counter.name}</span>
        {!open ? (
          <span className="board-meta board-closed state" data-state="PAUSED">
            <Tx k="closed" />
          </span>
        ) : counter.waitingCount > 0 && (
          <span className="board-meta num">
            <Dual
              en={`${formatNumber(counter.waitingCount, "en")} waiting`}
              bn={`${formatNumber(counter.waitingCount, "bn")} জন অপেক্ষায়`}
            />
          </span>
        )}
      </span>
      <span
        className="board-token"
        style={{ "--chars": Math.max(token?.length ?? 4, 4) } as CSSProperties}
      >
        {token ? (
          <Drum value={token} className="sign board-token-value" />
        ) : (
          <span className="board-idle">
            {open ? <Tx k="ready" /> : <Tx k="closed" />}
          </span>
        )}
      </span>
      <span
        className="board-next"
        style={{ "--chars": nextChars } as CSSProperties}
      >
        {open && (
          <span className="board-next-label" aria-hidden="true">
            <Tx k="upNext" />
          </span>
        )}
        {open && next.length > 0 ? (
          <span className="board-next-list sign">
            {next.map((item) => (
              <span key={item} className="board-next-token" translate="no">
                {item}
              </span>
            ))}
            {more > 0 && (
              <span className="board-next-more">+{formatNumber(more, language)}</span>
            )}
          </span>
        ) : open ? (
          <span className="board-idle board-idle-sm">
            <Tx k="queueClear" />
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function Board({
  counters,
  calling,
  label,
}: {
  counters: PublicCounter[];
  calling?: ReadonlyMap<string, string>;
  label: string;
}) {
  const split = counters.length >= 5;
  return (
    <div className="board-frame" data-layout={split ? "split" : "rows"}>
      {!split && (
        <div className="board-heads" aria-hidden="true">
          <span />
          <span className="caps">
            <Tx k="counter" inline />
          </span>
          <span className="caps">
            <Tx k="nowServing" inline />
          </span>
          <span className="caps">
            <Tx k="upNext" inline />
          </span>
        </div>
      )}
      <ul
        className="board-rows"
        aria-label={label}
        style={{ "--rows": split ? Math.ceil(counters.length / 2) : counters.length } as CSSProperties}
      >
        {counters.map((counter) => (
          <BoardRow key={counter.id} counter={counter} calling={calling?.get(counter.id)} />
        ))}
      </ul>
    </div>
  );
}

/** The counter whose ticket was called most recently. */
function latestCall(counters: PublicCounter[]) {
  return counters
    .filter((counter) => counter.calledTicket)
    .sort((a, b) =>
      (b.calledTicket!.calledAt ?? "").localeCompare(a.calledTicket!.calledAt ?? ""),
    )[0];
}

function NextList({ counter }: { counter: PublicCounter }) {
  const { language } = usePublicLocale();
  if (counter.status !== "OPEN") return null;
  if (!counter.waitingTokens.length)
    return (
      <span className="next-empty">
        <Tx k="queueClear" />
      </span>
    );
  const more = counter.waitingCount - counter.waitingTokens.length;
  return (
    <span className="next-list sign">
      {counter.waitingTokens.map((item) => (
        <span key={item} translate="no">
          {item}
        </span>
      ))}
      {more > 0 && <span className="next-more">+{formatNumber(more, language)}</span>}
    </span>
  );
}

function Idle({ counter }: { counter: PublicCounter }) {
  return (
    <span className="board-idle">
      {counter.status === "OPEN" ? <Tx k="ready" /> : <Tx k="closed" />}
    </span>
  );
}

type StyleProps = {
  counters: PublicCounter[];
  calling: ReadonlyMap<string, string>;
  label: string;
};

/** Spotlight: the latest call on a large stage, every counter stacked beside it. */
function Spotlight({ counters, calling, label }: StyleProps) {
  const hero = latestCall(counters);
  const lamp = hero && calling.get(hero.id);
  return (
    <div className="spot">
      <section
        className="spot-stage"
        data-calling={lamp ? "true" : undefined}
        style={hero ? counterVars(getCounterTheme(hero.prefix)) : undefined}
        aria-label={label}
      >
        {lamp && <span key={lamp} className="board-lamp" aria-hidden="true" />}
        <p className="caps spot-label">
          <Tx k="nowCalling" inline />
        </p>
        {hero ? (
          <>
            <Drum value={hero.calledTicket!.tokenNumber} className="sign spot-token" />
            <p className="spot-where">
              <Plate prefix={hero.prefix} />
              <span>{hero.name}</span>
            </p>
          </>
        ) : (
          <p className="board-idle spot-idle">
            <Tx k="nothingYet" />
          </p>
        )}
      </section>
      <ul className="spot-stack" style={{ "--n": counters.length } as CSSProperties}>
        {counters.map((counter) => (
          <li
            key={counter.id}
            className="spot-item"
            data-open={counter.status === "OPEN"}
            data-calling={calling.get(counter.id) ? "true" : undefined}
            style={counterVars(getCounterTheme(counter.prefix))}
          >
            <Plate prefix={counter.prefix} />
            <span className="spot-item-name">{counter.name}</span>
            <span className="spot-item-token">
              {counter.calledTicket ? (
                <Drum value={counter.calledTicket.tokenNumber} className="sign" />
              ) : (
                <Idle counter={counter} />
              )}
            </span>
            <span className="spot-item-next">
              <NextList counter={counter} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kinetic: lobby cards under a slow light wash in the calling counter's colour. */
function Kinetic({ counters, calling, label }: StyleProps) {
  const hero = latestCall(counters);
  const columns = counters.length <= 3 ? counters.length : counters.length === 4 ? 2 : 3;
  return (
    <div
      className="kin"
      style={
        {
          "--wash": hero ? getCounterTheme(hero.prefix).plate : "transparent",
          "--kcols": Math.max(columns, 1),
        } as CSSProperties
      }
    >
      <span key={hero?.prefix} className="kin-wash" aria-hidden="true" />
      <ul className="kin-grid" aria-label={label}>
        {counters.map((counter, index) => {
          const lamp = calling.get(counter.id);
          return (
            <li
              key={counter.id}
              className="kin-card"
              data-open={counter.status === "OPEN"}
              data-calling={lamp ? "true" : undefined}
              style={
                { ...counterVars(getCounterTheme(counter.prefix)), "--i": index } as CSSProperties
              }
            >
              {lamp && <span key={lamp} className="kin-pulse" aria-hidden="true" />}
              <div className="kin-head">
                <Plate prefix={counter.prefix} />
                <span className="kin-name">{counter.name}</span>
                {lamp && (
                  <span className="kin-live" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              <div className="kin-token">
                {counter.calledTicket ? (
                  <span key={counter.calledTicket.tokenNumber} className="kin-reveal">
                    <Drum value={counter.calledTicket.tokenNumber} className="sign" />
                  </span>
                ) : (
                  <Idle counter={counter} />
                )}
              </div>
              <div className="kin-next">
                <span className="kin-next-label">
                  <Tx k="upNext" />
                </span>
                <NextList counter={counter} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Control({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="key key-quiet key-icon"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type TvProps = { slug: string; initial: DisplayData | null; forcedStyle?: DisplayStyle };

function Tv({ slug, initial, forcedStyle }: TvProps) {
  const { language, t } = usePublicLocale();
  const [theme, setTheme] = useStoredChoice<Theme>("qw-tv-theme", "dark", themes);
  const [storedStyle, setStyle] = useStoredChoice<DisplayStyle>(
    "qw-tv-style",
    "board",
    displayStyles,
  );
  // ?style= wins until someone picks a style on the screen itself.
  const [override, setOverride] = useState(forcedStyle);
  const style = override ?? storedStyle;
  const fullscreen = useFullscreen();
  const toggleFullscreen = fullscreen.toggle;
  const [chime, setChime] = useState(false);
  const [voice, setVoice] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [awake, setAwake] = useState(true);
  const [calling, setCalling] = useState<ReadonlyMap<string, string>>(new Map());
  const [spoken, setSpoken] = useState("");
  const last = useRef(calls(initial));
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sound = useChime();
  const settings = useRef({ chime, voice, play: sound.play });
  useEffect(() => {
    settings.current = { chime, voice, play: sound.play };
  }, [chime, voice, sound.play]);

  // A new call (or recall) lights its row for 8 s and rings once.
  const onSnapshot = useCallback((snapshot: DisplayData) => {
    const previous = last.current;
    last.current = calls(snapshot);
    if (!previous) return;
    const changed = snapshot.counters.filter(
      (counter) => counter.calledTicket && previous.get(counter.id) !== callKey(counter),
    );
    if (!changed.length) return;
    setCalling((current) => {
      const next = new Map(current);
      for (const counter of changed) next.set(counter.id, callKey(counter)!);
      return next;
    });
    for (const counter of changed) {
      clearTimeout(timers.current.get(counter.id));
      timers.current.set(
        counter.id,
        setTimeout(() => {
          setCalling((current) => {
            const next = new Map(current);
            next.delete(counter.id);
            return next;
          });
        }, callSeconds * 1_000),
      );
    }
    setSpoken(
      changed.map((counter) => `${counter.calledTicket!.tokenNumber}, ${counter.name}`).join(". "),
    );
    if (settings.current.chime) settings.current.play();
    if (settings.current.voice)
      for (const counter of changed) announce(counter.calledTicket!.tokenNumber, counter.name);
  }, []);

  const { data, error, reconnecting, refresh } = usePublicFeed(slug, onSnapshot, initial);

  // Controls live in reserved header space and fade out with the cursor after 3 s idle.
  useEffect(() => {
    let sleep: ReturnType<typeof setTimeout> | undefined;
    function wake() {
      setAwake(true);
      clearTimeout(sleep);
      sleep = setTimeout(() => setAwake(false), 3_000);
    }
    function key(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey && !event.altKey)
        toggleFullscreen();
    }
    wake();
    const events = ["pointermove", "pointerdown", "keydown"] as const;
    for (const name of events) window.addEventListener(name, wake, { passive: true });
    window.addEventListener("keydown", key);
    const pending = timers.current;
    return () => {
      for (const name of events) window.removeEventListener(name, wake);
      window.removeEventListener("keydown", key);
      clearTimeout(sleep);
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, [toggleFullscreen]);

  useEffect(() => {
    document.documentElement.dataset.tv = theme;
  }, [theme]);

  const counters = sortCounters(data?.counters ?? []);

  return (
    <main
      id="main"
      lang={language}
      className={`board ${theme === "dark" ? "surface-dark" : ""}`}
      data-awake={awake}
    >
      <header className="board-head">
        <div className="board-venue">
          <VenueMark
            key={data?.organization.logoUrl}
            logoUrl={data?.organization.logoUrl}
            primaryColor={data?.organization.primaryColor}
            name={data?.organization.name}
          />
          <h1 className="sign board-title">{data?.organization.name ?? "QueueWindow"}</h1>
        </div>
        <div
          className="board-controls"
          role="group"
          aria-label="Display controls"
          inert={!awake}
        >
          <Control
            label={fullscreen.active ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            pressed={fullscreen.active}
            onClick={fullscreen.toggle}
          >
            {fullscreen.active ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </Control>
          <Control
            label={theme === "dark" ? "Light board" : "Dark board"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Control>
          <div className="seg" role="group" aria-label="Display style">
            {(
              [
                ["board", "Board", Rows3],
                ["spotlight", "Spotlight", PanelLeft],
                ["kinetic", "Kinetic", LayoutGrid],
              ] as const
            ).map(([value, name, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={style === value}
                aria-label={`${name} style`}
                title={`${name} style`}
                onClick={() => {
                  setOverride(undefined);
                  setStyle(value);
                }}
              >
                <Icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
          <PublicLanguage />
          <Control
            label={
              sound.status === "ready"
                ? chime
                  ? "Chime on"
                  : "Chime off"
                : sound.status === "unavailable"
                  ? t.audioUnavailable
                  : t.sound
            }
            pressed={sound.status === "ready" && chime}
            onClick={async () => {
              if (sound.status === "ready") return setChime(!chime);
              if (await sound.unlock()) {
                setChime(true);
                sound.play();
              }
            }}
          >
            {sound.status === "ready" && chime ? (
              <Volume2 aria-hidden="true" />
            ) : (
              <VolumeX aria-hidden="true" />
            )}
          </Control>
          <Control
            label={voice ? "Voice announcements on" : "Voice announcements off"}
            pressed={voice}
            onClick={() => {
              if (!("speechSynthesis" in window)) return setNoVoice(true);
              if (voice) window.speechSynthesis.cancel();
              setVoice(!voice);
            }}
          >
            {voice ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
          </Control>
        </div>
        <div className="board-status">
          {(reconnecting || noVoice) && (
            <p role="status" className="board-note">
              {reconnecting ? (
                <Tx k="offline" />
              ) : (
                "Voice is unavailable on this device."
              )}
            </p>
          )}
          <Clock />
        </div>
      </header>

      {error && !data ? (
        <div className="board-empty" role="alert">
          <p>
            <Dual en="The queue is unavailable." bn="সারির তথ্য পাওয়া যাচ্ছে না।" />
          </p>
          {error !== 404 && (
            <button type="button" className="key" onClick={() => void refresh()}>
              <Tx k="retry" />
            </button>
          )}
        </div>
      ) : !counters.length ? (
        <div className="board-empty">
          <p>
            <Dual en="No counters yet." bn="এখনো কোনো কাউন্টার নেই।" />
          </p>
        </div>
      ) : (
        <div className="board-stage" data-style={style}>
          {style === "spotlight" ? (
            <Spotlight counters={counters} calling={calling} label={t.nowCalling} />
          ) : style === "kinetic" ? (
            <Kinetic counters={counters} calling={calling} label={t.nowServing} />
          ) : (
            <Board counters={counters} calling={calling} label={t.nowServing} />
          )}
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {spoken}
      </p>
    </main>
  );
}

export function TvScreen(props: TvProps) {
  return (
    <PublicLocale>
      <Tv {...props} />
    </PublicLocale>
  );
}
