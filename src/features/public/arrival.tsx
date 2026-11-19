"use client";

import { ArrowRight, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate } from "@/components/plate";
import { VenueMark } from "@/components/venue-mark";
import { api, ApiError, jsonRequest } from "@/features/workspace/client";
import { sortCounters } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { useStoredChoice } from "@/lib/stored";
import { formatClock } from "@/lib/time";
import { Dual, PublicLocale, Tx, usePublicLocale } from "./language";
import { usePublicFeed, type DisplayData, type PublicCounter, type Venue } from "./live";
import { QrCode } from "./qr";
import { ConnectionNote, VisitorShell } from "./ui";

type IssuedTicket = { ticketId: string; tokenNumber: string; issuedAt: string };
type Receipt = IssuedTicket & { counterName: string; prefix: string };
const paperWidths = ["80", "58"] as const;

function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function pendingKey(slot: string, remembered: Map<string, string>) {
  let value = remembered.get(slot);
  try {
    value ??= sessionStorage.getItem(slot) ?? undefined;
  } catch {
    /* Keep a memory fallback. */
  }
  value ??= requestId();
  remembered.set(slot, value);
  try {
    sessionStorage.setItem(slot, value);
  } catch {
    /* Keep the current key in memory. */
  }
  return value;
}

function clearKey(slot: string, remembered: Map<string, string>) {
  remembered.delete(slot);
  try {
    sessionStorage.removeItem(slot);
  } catch {
    /* Storage can be disabled. */
  }
}

/** One honest line per counter: never "No wait" next to a minute count. */
function WaitLine({ counter }: { counter: PublicCounter }) {
  // A paused counter says "Closed" once, on its action pill.
  if (counter.status !== "OPEN") return <Tx k="pausedShort" />;
  const minutes = counter.estimatedWaitMinutes;
  const ahead = counter.waitingCount;
  if (minutes === 0)
    return (
      <span className="state" data-state="OPEN">
        <Tx k="noWait" />
      </span>
    );
  const line = (language: "en" | "bn") => {
    const about =
      language === "en"
        ? `about ${formatNumber(minutes, "en")} min`
        : `প্রায় ${formatNumber(minutes, "bn")} মিনিট`;
    if (!ahead) return language === "en" ? `Serving now · ${about}` : `সেবা চলছে · ${about}`;
    return language === "en"
      ? `${formatNumber(ahead, "en")} ahead · ${about}`
      : `আগে ${formatNumber(ahead, "bn")} জন · ${about}`;
  };
  return <Dual en={line("en")} bn={line("bn")} />;
}

function KioskReceipt({
  receipt,
  venue,
  slug,
  origin,
  done,
}: {
  receipt: Receipt;
  venue: Venue;
  slug: string;
  origin: string;
  done: () => void;
}) {
  const { t } = usePublicLocale();
  const [paper, setPaper] = useStoredChoice("qw-kiosk-paper", "80", paperWidths);
  const track = new URL(`/join/${slug}/ticket/${receipt.ticketId}`, origin).href;
  const issued = new Date(receipt.issuedAt);
  // Leave room for wrapped names and unusually long tokens on the narrower roll.
  const longReceipt = venue.name.length + receipt.counterName.length > 72 || receipt.tokenNumber.length > 8;
  useEffect(() => {
    let reset = setTimeout(done, 30_000);
    const pause = () => clearTimeout(reset);
    function resume() {
      pause();
      reset = setTimeout(done, 30_000);
    }
    window.addEventListener("beforeprint", pause);
    window.addEventListener("afterprint", resume);
    return () => {
      pause();
      window.removeEventListener("beforeprint", pause);
      window.removeEventListener("afterprint", resume);
    };
  }, [done]);
  return (
    <div className="kiosk-done">
      <section className="receipt" data-paper={paper} data-long={longReceipt || undefined} aria-labelledby="receipt-title">
        <div className="receipt-venue">
          <VenueMark venue={venue} />
          <span>{venue.name}</span>
        </div>
        <h1 id="receipt-title" className="caps">
          <Tx k="ticket" inline />
        </h1>
        <p className="sign receipt-token" translate="no">
          {receipt.tokenNumber}
        </p>
        <p className="receipt-counter">
          <Plate prefix={receipt.prefix} />
          <span>{receipt.counterName}</span>
        </p>
        <time className="receipt-time" dateTime={receipt.issuedAt}>
          <Dual en={`Issued at ${formatClock(issued)}`} bn={`${formatClock(issued, "bn")}-এ ইস্যু করা হয়েছে`} />
        </time>
        <div className="receipt-qr">
          <QrCode value={track} label="Track this ticket QR code" />
        </div>
        <p className="receipt-help">
          <Tx k="track" />
        </p>
      </section>
      <div className="no-print kiosk-actions">
        <div className="seg" role="group" aria-label={t.paper}>
          {paperWidths.map((width) => (
            <button
              key={width}
              type="button"
              aria-pressed={paper === width}
              onClick={() => setPaper(width)}
            >
              {width} mm
            </button>
          ))}
        </div>
        <button className="key" type="button" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          {t.receipt}
        </button>
        <button className="key key-primary" type="button" onClick={done}>
          {t.done}
        </button>
      </div>
      <div className="no-print kiosk-reset" aria-hidden="true">
        <span />
      </div>
      <p className="no-print muted text-center text-sm">{t.resets}</p>
    </div>
  );
}

function Arrival({
  slug,
  kioskOrigin,
  initial,
}: {
  slug: string;
  kioskOrigin?: string;
  initial: DisplayData | null;
}) {
  const router = useRouter();
  const { t } = usePublicLocale();
  const { data, venue, error, online, reconnecting, refresh } = usePublicFeed(slug, undefined, initial);
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<
    "limited" | "pausedError" | "expired" | "joinError" | null
  >(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const locked = useRef(false);
  const keys = useRef(new Map<string, string>());
  const mode = kioskOrigin ? "kiosk" : "visitor";

  async function issue(counter: PublicCounter) {
    if (locked.current || !online || counter.status !== "OPEN") return;
    locked.current = true;
    setPending(counter.id);
    setFailure(null);
    const slot = `qw-pending-${mode}-${slug}-${counter.id}`;
    try {
      const idempotencyKey = pendingKey(slot, keys.current);
      const result = await api<IssuedTicket>(
        `/api/public/${slug}/join`,
        jsonRequest("POST", { counterId: counter.id, idempotencyKey }),
      );
      clearKey(slot, keys.current);
      if (kioskOrigin) {
        setReceipt({ ...result, counterName: counter.name, prefix: counter.prefix });
        locked.current = false;
        setPending(null);
      } else {
        router.replace(`/join/${slug}/ticket/${result.ticketId}`);
      }
    } catch (error) {
      locked.current = false;
      setPending(null);
      if (error instanceof ApiError && error.status === 400) clearKey(slot, keys.current);
      if (error instanceof ApiError && error.status === 429) setFailure("limited");
      else if (error instanceof ApiError && error.status === 409) {
        setFailure("pausedError");
        void refresh();
      } else if (error instanceof ApiError && error.status === 402) setFailure("expired");
      else setFailure("joinError");
    }
  }

  // Clear only the in-memory receipt when a shared kiosk is ready for its next visitor.
  const done = useCallback(() => setReceipt(null), []);
  const counters = sortCounters(data?.counters ?? []);

  return (
    <VisitorShell venue={venue} wide={Boolean(kioskOrigin)}>
      {receipt && kioskOrigin && venue ? (
        <KioskReceipt
          receipt={receipt}
          venue={venue}
          slug={slug}
          origin={kioskOrigin}
          done={done}
        />
      ) : (
        <>
          <h1 className="sign visitor-title">
            <Tx k="choose" />
          </h1>
          <ol className="steps" aria-label={t.tapCounter}>
            <li aria-current="step">
              <span className="steps-n">1</span>
              <Tx k="stepSelect" />
            </li>
            <li>
              <span className="steps-n">2</span>
              <Tx k="stepToken" />
            </li>
          </ol>
          {reconnecting && (
            <ConnectionNote>
              {t.offline} {data && t.offlineDetail}
            </ConnectionNote>
          )}
          {failure && (
            <p className="notice" data-tone="error" role="alert">
              {t[failure]}
            </p>
          )}
          {error && !data && (
            <div className="visitor-empty">
              <p role="alert">{error === 404 ? t.missingVenue : t.unavailable}</p>
              {error !== 404 && (
                <button type="button" className="key" onClick={() => void refresh()}>
                  {t.retry}
                </button>
              )}
            </div>
          )}
          {data && !counters.length && (
            <div className="visitor-empty">
              <p className="font-bold">{t.noCounters}</p>
              <p className="muted">{t.noCountersDetail}</p>
            </div>
          )}
          <ul className="counter-list">
            {counters.map((counter) => {
              const open = counter.status === "OPEN";
              return (
                <li key={counter.id}>
                  <button
                    type="button"
                    className="counter-choice"
                    disabled={!online || pending !== null || !open}
                    aria-busy={pending === counter.id}
                    onClick={() => void issue(counter)}
                  >
                    <Plate prefix={counter.prefix} className="counter-choice-plate" />
                    <span className="counter-choice-text">
                      <span className="counter-choice-name">{counter.name}</span>
                      <span className="counter-choice-meta">
                        {pending === counter.id ? <Tx k="pending" /> : <WaitLine counter={counter} />}
                      </span>
                    </span>
                    <span className="counter-choice-action" data-open={open} aria-hidden="true">
                      {open ? (
                        <>
                          <Tx k="takeTicket" />
                          <ArrowRight />
                        </>
                      ) : (
                        <Tx k="closed" />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </VisitorShell>
  );
}

export function ArrivalScreen(props: {
  slug: string;
  kioskOrigin?: string;
  initial: DisplayData | null;
}) {
  return (
    <PublicLocale>
      <Arrival {...props} />
    </PublicLocale>
  );
}
