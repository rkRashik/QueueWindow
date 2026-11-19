"use client";

import { ChevronRight, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate } from "@/components/plate";
import { api, ApiError, jsonRequest } from "@/features/workspace/client";
import { sortCounters } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { Dual, PublicLocale, Tx, usePublicLocale } from "./language";
import { usePublicFeed, type DisplayData, type PublicCounter, type Venue } from "./live";
import { QrCode } from "./qr";
import { ConnectionNote, VisitorShell } from "./ui";

type Receipt = { ticketId: string; tokenNumber: string; counterName: string; prefix: string };

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
  if (counter.status !== "OPEN")
    return (
      <span className="state" data-state="PAUSED">
        <Tx k="closed" />
      </span>
    );
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
  const [paper, setPaper] = useState<"58" | "80">("58");
  const track = new URL(`/join/${slug}/ticket/${receipt.ticketId}`, origin).href;
  useEffect(() => {
    const reset = setTimeout(done, 30_000);
    return () => clearTimeout(reset);
  }, [done]);
  return (
    <div className="kiosk-done">
      <section className="receipt" data-paper={paper} aria-labelledby="receipt-title">
        <p className="receipt-venue">{venue.name}</p>
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
        <div className="receipt-qr">
          <QrCode value={track} label="Track this ticket QR code" />
        </div>
        <p className="receipt-help">
          <Tx k="track" />
        </p>
      </section>
      <div className="no-print kiosk-actions">
        <div className="seg" role="group" aria-label={t.paper}>
          {(["58", "80"] as const).map((width) => (
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
  const { data, error, online, reconnecting, refresh } = usePublicFeed(slug, undefined, initial);
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
      const result = await api<{ ticketId: string; tokenNumber: string }>(
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
    <VisitorShell venue={data?.organization} wide={Boolean(kioskOrigin)}>
      {receipt && kioskOrigin && data ? (
        <KioskReceipt
          receipt={receipt}
          venue={data.organization}
          slug={slug}
          origin={kioskOrigin}
          done={done}
        />
      ) : (
        <>
          <h1 className="sign visitor-title">
            <Tx k="choose" />
          </h1>
          <p className="visitor-lede">
            <Tx k="tapCounter" />
          </p>
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
                    {open && <ChevronRight aria-hidden="true" className="counter-choice-go" />}
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
