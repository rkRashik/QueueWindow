"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bell, BellOff, Check, Headset } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/i18n";
import { api, ApiError } from "@/features/workspace/client";
import { useChime } from "./audio";
import { PublicLocale, usePublicLocale } from "./language";
import { usePublicFeed, type TicketData } from "./live";
import { ConnectionNote, VisitorShell } from "./ui";

function Ticket({ slug, ticketId }: { slug: string; ticketId: string }) {
  const { t, language } = usePublicLocale();
  const [live, setLive] = useState<{
    ticket: TicketData;
    initialAhead: number;
  } | null>(null);
  const [error, setError] = useState<number | null>(null);
  const pending = useRef<AbortController | null>(null);
  const last = useRef<TicketData["status"] | null>(null);
  const [audible, setAudible] = useState(false);
  const chime = useChime();
  const reduce = useReducedMotion();

  const loadTicket = useCallback(() => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    void api<TicketData>(`/api/public/${slug}/ticket/${ticketId}`, {
      signal: controller.signal,
    }).then(
      (ticket) => {
        if (controller.signal.aborted) return;
        setLive((previous) => ({
          ticket,
          initialAhead: Math.max(
            previous?.initialAhead ?? 0,
            ticket.peopleAhead,
          ),
        }));
        setError(null);
      },
      (failure: unknown) => {
        if (!controller.signal.aborted)
          setError(failure instanceof ApiError ? failure.status : 503);
      },
    );
  }, [slug, ticketId]);

  const feed = usePublicFeed(slug, loadTicket);
  useEffect(() => {
    const poll = setInterval(() => {
      if (!document.hidden && navigator.onLine) loadTicket();
    }, 8_000);
    return () => {
      clearInterval(poll);
      pending.current?.abort();
    };
  }, [loadTicket]);

  const ticket = live?.ticket;
  const status = ticket?.status;
  const play = chime.play;
  useEffect(() => {
    if (!status) return;
    if (last.current === "WAITING" && status === "CALLED") {
      if (!reduce) navigator.vibrate?.([200, 100, 200]);
      if (audible) play();
    }
    last.current = status;
  }, [audible, play, reduce, status]);

  const percent = live
    ? Math.round(
        (100 * (live.initialAhead + 1 - live.ticket.peopleAhead)) /
          (live.initialAhead + 1),
      )
    : 0;
  const waiting = status === "WAITING";
  const called = status === "CALLED";
  const failure = error ?? feed.error;

  return (
    <VisitorShell venue={feed.data?.organization}>
      {feed.reconnecting && (
        <ConnectionNote>
          {t.offline} {ticket && t.offlineDetail}
        </ConnectionNote>
      )}
      {failure && (
        <div className="visitor-alert">
          <p role="alert">
            {failure === 404 ? t.missingTicket : t.unavailable}
          </p>
          {failure !== 404 && (
            <button
              type="button"
              className="visitor-button mt-3"
              onClick={loadTicket}
            >
              {t.retry}
            </button>
          )}
        </div>
      )}
      {!ticket && !failure && (
        <p className="visitor-card" role="status">
          {t.loading}
        </p>
      )}
      {ticket && (
        <section
          aria-labelledby="visitor-ticket-title"
          className={`visitor-ticket ${called ? "visitor-called" : status === "SKIPPED" ? "visitor-skipped" : ""}`}
        >
          <div className="pass-top">
            <h1 id="visitor-ticket-title" className="text-base font-extrabold">
              {t.ticket}
            </h1>
            <div className="pass-ring">
              {called && !reduce && (
                // Celebration: expanding emerald rings while the ticket is called.
                <>
                  {[0, 0.6].map((delay) => (
                    <motion.span
                      key={delay}
                      aria-hidden="true"
                      className="absolute inset-3 rounded-full border-2 border-emerald-500"
                      initial={{ opacity: 0.7, scale: 0.9 }}
                      animate={{ opacity: 0, scale: 1.3 }}
                      transition={{
                        duration: 1.6,
                        delay,
                        ease: "easeOut",
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </>
              )}
              {(waiting || called) && (
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    strokeWidth="4"
                    className={
                      called ? "stroke-emerald-200" : "stroke-indigo-100"
                    }
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className={
                      called ? "stroke-emerald-600" : "stroke-indigo-700"
                    }
                    initial={false}
                    animate={{ pathLength: called ? 1 : percent / 100 }}
                    transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
                  />
                </svg>
              )}
              <motion.p
                key={called ? "called" : "idle"}
                initial={false}
                animate={
                  called && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }
                }
                transition={{ duration: 0.6 }}
                className="visitor-token relative tabular-nums"
                translate="no"
              >
                {ticket.tokenNumber}
              </motion.p>
            </div>
            <p className="break-words text-lg font-extrabold">
              {ticket.counterName}
            </p>
          </div>
          <div className="pass-perf" aria-hidden="true" />
          <div className="pass-bottom">
            <div className="ticket-status" role="status">
              {waiting && <p className="text-base font-extrabold">{t.wait}</p>}
              {called && (
                <>
                  <p lang="bn" className="text-xl font-extrabold">
                    আপনার পালা! কাউন্টারে আসুন
                  </p>
                  <p lang="en" className="mt-1 text-lg font-extrabold">
                    It’s your turn!
                  </p>
                  <p lang="en" className="mt-1">
                    Please go to your counter.
                  </p>
                </>
              )}
              {status === "SERVED" && (
                <>
                  <Check className="mx-auto mb-2 size-6" aria-hidden="true" />
                  <p className="text-xl font-extrabold">{t.served}</p>
                  <p className="mt-1">{t.servedDetail}</p>
                </>
              )}
              {status === "SKIPPED" && (
                <>
                  <Headset className="mx-auto mb-2 size-6" aria-hidden="true" />
                  <p className="text-xl font-extrabold">{t.skipped}</p>
                  <p className="mt-1">{t.skippedDetail}</p>
                </>
              )}
            </div>
            {waiting && (
              <>
                <dl className="ticket-metrics">
                  <div>
                    <dt>{t.people}</dt>
                    <dd className="tabular-nums">
                      {formatNumber(ticket.peopleAhead, language)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.estimate}</dt>
                    <dd className="tabular-nums">
                      {formatNumber(ticket.estimatedWaitMinutes, language)}{" "}
                      <span>{t.minutes}</span>
                    </dd>
                  </div>
                </dl>
                <div
                  className="sr-only"
                  role="progressbar"
                  aria-label={t.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                />
              </>
            )}
          </div>
        </section>
      )}
      {waiting && (
        <button
          type="button"
          className="visitor-button mt-4 w-full"
          aria-pressed={audible}
          onClick={async () => {
            if (audible) setAudible(false);
            else if (await chime.unlock()) setAudible(true);
          }}
        >
          {audible ? (
            <BellOff className="size-5" aria-hidden="true" />
          ) : (
            <Bell className="size-5" aria-hidden="true" />
          )}
          {audible ? t.mute : t.sound}
        </button>
      )}
      {chime.status === "unavailable" && (
        <p className="mt-2 text-sm" role="status">
          {t.audioUnavailable}
        </p>
      )}
    </VisitorShell>
  );
}

export function TicketScreen(props: { slug: string; ticketId: string }) {
  return (
    <PublicLocale>
      <Ticket {...props} />
    </PublicLocale>
  );
}
