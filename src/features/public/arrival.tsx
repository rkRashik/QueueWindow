"use client";

import { ArrowRight, Printer, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, jsonRequest } from "@/features/workspace/client";
import { PublicLocale, usePublicLocale } from "./language";
import { usePublicFeed, type PublicCounter, type Venue } from "./live";
import { QrCode } from "./qr";
import { ConnectionNote, VisitorShell } from "./ui";

type Receipt = { ticketId: string; tokenNumber: string; counterName: string };

function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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
  const [paper, setPaper] = useState("58");
  const track = new URL(`/join/${slug}/ticket/${receipt.ticketId}`, origin)
    .href;
  useEffect(() => {
    const reset = setTimeout(done, 30_000);
    return () => clearTimeout(reset);
  }, [done]);

  return (
    <>
      <section
        className="kiosk-receipt"
        data-paper={paper}
        aria-labelledby="receipt-title"
      >
        <p className="text-sm font-bold">{venue.name}</p>
        <h1 id="receipt-title" className="mt-1 text-base font-extrabold">
          {t.receiptTitle}
        </h1>
        <p className="visitor-token tabular-nums" translate="no">
          {receipt.tokenNumber}
        </p>
        <p className="font-bold">{receipt.counterName}</p>
        <div className="receipt-qr">
          <QrCode value={track} label="Track this ticket QR code" />
        </div>
        <p className="text-sm font-semibold" lang="bn">
          মোবাইলে টিকিট অনুসরণ করতে স্ক্যান করুন।
        </p>
        <p className="mt-1 text-sm font-semibold" lang="en">
          Scan to track your ticket on your phone.
        </p>
      </section>
      <div className="no-print mt-5 space-y-3">
        <label className="block text-sm font-bold">
          {t.paper}
          <select
            className="field mt-1 min-h-12"
            value={paper}
            onChange={(event) => setPaper(event.target.value)}
          >
            <option value="58">58 mm</option>
            <option value="80">80 mm</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="visitor-button"
            type="button"
            onClick={() => window.print()}
          >
            <Printer aria-hidden="true" className="size-4" />
            {t.receipt}
          </button>
          <button
            className="visitor-button visitor-primary"
            type="button"
            onClick={done}
          >
            {t.done}
          </button>
        </div>
        <p className="text-sm font-semibold">{t.resets}</p>
      </div>
    </>
  );
}

function Arrival({
  slug,
  kioskOrigin,
}: {
  slug: string;
  kioskOrigin?: string;
}) {
  const router = useRouter();
  const { t } = usePublicLocale();
  const { data, error, online, reconnecting, refresh } = usePublicFeed(slug);
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
      const result = await api<Omit<Receipt, "counterName">>(
        `/api/public/${slug}/join`,
        jsonRequest("POST", { counterId: counter.id, idempotencyKey }),
      );
      if (kioskOrigin) {
        clearKey(slot, keys.current);
        setReceipt({ ...result, counterName: counter.name });
        locked.current = false;
        setPending(null);
      } else {
        clearKey(slot, keys.current);
        router.replace(`/join/${slug}/ticket/${result.ticketId}`);
      }
    } catch (error) {
      locked.current = false;
      setPending(null);
      if (error instanceof ApiError && error.status === 400)
        clearKey(slot, keys.current);
      if (error instanceof ApiError && error.status === 429)
        setFailure("limited");
      else if (error instanceof ApiError && error.status === 409) {
        setFailure("pausedError");
        void refresh();
      } else if (error instanceof ApiError && error.status === 402)
        setFailure("expired");
      else setFailure("joinError");
    }
  }

  // Clear only the in-memory receipt when a shared kiosk is ready for its next visitor.
  const done = useCallback(() => setReceipt(null), []);

  return (
    <VisitorShell venue={data?.organization}>
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
          <div className="mb-6">
            <h1 className="visitor-heading">{t.choose}</h1>
            <p className="mt-2 text-base leading-relaxed">{t.select}</p>
          </div>
          {reconnecting && (
            <ConnectionNote>
              {t.offline} {data && t.offlineDetail}
            </ConnectionNote>
          )}
          {failure && (
            <p className="visitor-alert" role="alert">
              {t[failure]}
            </p>
          )}
          {error && !data && (
            <div className="visitor-card">
              <p role="alert">
                {error === 404 ? t.missingVenue : t.unavailable}
              </p>
              {error !== 404 && (
                <button
                  type="button"
                  className="visitor-button mt-3"
                  onClick={() => void refresh()}
                >
                  {t.retry}
                </button>
              )}
            </div>
          )}
          {!data && !error && (
            <p role="status" className="visitor-card">
              {t.loading}
            </p>
          )}
          {data && !data.counters.length && (
            <div className="visitor-card">
              <h2 className="text-lg font-extrabold">{t.noCounters}</h2>
              <p className="mt-1">{t.noCountersDetail}</p>
            </div>
          )}
          <ul className="grid gap-3">
            {data?.counters.map((counter) => (
              <li key={counter.id}>
                <button
                  type="button"
                  disabled={
                    !online || pending !== null || counter.status !== "OPEN"
                  }
                  aria-label={`${counter.name} · ${counter.status === "OPEN" ? t.open : t.paused}`}
                  className="arrival-counter"
                  onClick={() => void issue(counter)}
                >
                  <span className="arrival-icon">
                    <Ticket className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    <span className="block text-lg font-extrabold">
                      {counter.name}
                    </span>
                    <span className="mt-1 block text-sm font-bold">
                      {pending === counter.id
                        ? t.pending
                        : counter.status === "OPEN"
                          ? t.join
                          : t.paused}
                    </span>
                  </span>
                  <span
                    className={`arrival-status ${counter.status === "PAUSED" ? "arrival-status-paused" : ""}`}
                  >
                    {counter.status === "OPEN" ? t.open : t.paused}
                  </span>
                  {counter.status === "OPEN" && (
                    <ArrowRight
                      className="size-5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </VisitorShell>
  );
}

export function ArrivalScreen(props: { slug: string; kioskOrigin?: string }) {
  return (
    <PublicLocale>
      <Arrival {...props} />
    </PublicLocale>
  );
}
