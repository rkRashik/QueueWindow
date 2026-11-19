"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bell, BellOff, Check, Headset } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CounterBadge } from "@/components/counter-badge";
import { counterVars, getCounterTheme, prefixOf } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { formatWait } from "@/lib/time";
import { api, ApiError } from "@/features/workspace/client";
import { useChime } from "./audio";
import { PublicLocale, Tx, usePublicLocale } from "./language";
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
  const theme = getCounterTheme(prefixOf(ticket?.tokenNumber ?? "A"));
  const stage = called
    ? 3
    : waiting
      ? (ticket?.peopleAhead ?? 0) <= 1
        ? 2
        : 1
      : status === "SERVED"
        ? 4
        : 0;
  const steps = [
    <Tx key="j" k="stepJoined" />,
    <Tx key="a" k="stepAlmost" />,
    <Tx key="t" k="stepTurn" />,
  ];

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
        <div
          className="visitor-ticket animate-pulse"
          role="status"
          aria-label={t.loading}
        >
          <div className="h-12 bg-slate-200" />
          <div className="mx-auto my-10 size-48 rounded-full bg-slate-100" />
          <div className="mx-6 mb-6 h-16 rounded-xl bg-slate-100" />
        </div>
      )}
      {ticket && (
        <section
          aria-labelledby="visitor-ticket-title"
          style={counterVars(theme)}
          className={`visitor-ticket ${called ? "visitor-called" : status === "SKIPPED" ? "visitor-skipped" : ""}`}
        >
          <div className="pass-band">
            <h1
              id="visitor-ticket-title"
              className="text-sm font-extrabold tracking-wide"
            >
              <Tx k="ticket" />
            </h1>
            <p className="flex min-w-0 items-center gap-2 text-sm font-bold">
              <CounterBadge
                prefix={prefixOf(ticket.tokenNumber)}
                size="sm"
                className="bg-white/20 shadow-none"
              />
              <span className="min-w-0 truncate">{ticket.counterName}</span>
            </p>
          </div>
          <div className="pass-top">
            <div className="pass-ring">
              {called && !reduce && (
                // Calm emerald pulse while the ticket is called.
                <>
                  {[0, 0.8].map((delay) => (
                    <motion.span
                      key={delay}
                      aria-hidden="true"
                      className="absolute inset-3 rounded-full border-2 border-emerald-500"
                      initial={{ opacity: 0.7, scale: 0.9 }}
                      animate={{ opacity: 0, scale: 1.3 }}
                      transition={{
                        duration: 1.8,
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
                      called ? "stroke-emerald-200" : "stroke-slate-200"
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
                      called ? "stroke-emerald-600" : "stroke-(--c-hue)"
                    }
                    initial={false}
                    animate={{
                      pathLength: called ? 1 : Math.max(0.04, percent / 100),
                    }}
                    transition={{ duration: reduce ? 0 : 0.8, ease: "easeOut" }}
                  />
                </svg>
              )}
              <div className="relative">
                <motion.p
                  key={called ? "called" : "idle"}
                  initial={false}
                  animate={
                    called && !reduce ? { scale: [1, 1.1, 1] } : { scale: 1 }
                  }
                  transition={{ duration: 0.6 }}
                  className={`visitor-token tabular-nums ${called ? "text-emerald-800" : "text-(--c-ink)"}`}
                  translate="no"
                >
                  {ticket.tokenNumber}
                </motion.p>
                {waiting && (
                  <p className="mt-1.5 text-xs font-bold text-slate-600">
                    {formatNumber(percent, language)}%
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="pass-perf" aria-hidden="true" />
          <div className="pass-bottom">
            <div className="ticket-status" role="status">
              {waiting && (
                <p className="text-base font-extrabold">
                  <Tx k="wait" />
                </p>
              )}
              {called && (
                <>
                  <span className="mx-auto mb-2 grid size-11 place-items-center rounded-full bg-emerald-600 text-white">
                    <Bell className="size-5" aria-hidden="true" />
                  </span>
                  <p className="text-xl font-extrabold">
                    <Tx k="called" />
                  </p>
                  <p className="mt-1 font-semibold">
                    <Tx k="calledDetail" />
                  </p>
                </>
              )}
              {status === "SERVED" && (
                <>
                  <Check className="mx-auto mb-2 size-6" aria-hidden="true" />
                  <p className="text-xl font-extrabold">
                    <Tx k="served" />
                  </p>
                  <p className="mt-1">
                    <Tx k="servedDetail" />
                  </p>
                </>
              )}
              {status === "SKIPPED" && (
                <>
                  <Headset className="mx-auto mb-2 size-6" aria-hidden="true" />
                  <p className="text-xl font-extrabold">
                    <Tx k="skipped" />
                  </p>
                  <p className="mt-1">
                    <Tx k="skippedDetail" />
                  </p>
                </>
              )}
            </div>
            {waiting && (
              <>
                <dl className="ticket-metrics">
                  <div>
                    <dt>
                      <Tx k="people" />
                    </dt>
                    <dd className="tabular-nums">
                      {formatNumber(ticket.peopleAhead, language)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Tx k="estimate" />
                    </dt>
                    <dd className="tabular-nums">
                      ~
                      {formatWait(
                        Math.max(1, ticket.estimatedWaitMinutes),
                        language,
                      )}
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
            {(waiting || called) && (
              <ol className="ticket-steps" aria-label={t.progress}>
                {steps.map((label, index) => {
                  const state =
                    index + 1 < stage
                      ? "done"
                      : index + 1 === stage
                        ? "current"
                        : "todo";
                  return (
                    <li key={index} data-state={state}>
                      <span className="step-dot">
                        {state === "done" && (
                          <Check
                            className="size-3.5"
                            aria-hidden="true"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ol>
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
