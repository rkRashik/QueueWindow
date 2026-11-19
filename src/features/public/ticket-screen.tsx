"use client";

import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate } from "@/components/plate";
import { prefixOf } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { api, ApiError } from "@/features/workspace/client";
import { useChime } from "./audio";
import { Dual, PublicLocale, Tx, usePublicLocale } from "./language";
import { usePublicFeed, type DisplayData, type TicketData } from "./live";
import { ConnectionNote, VisitorShell } from "./ui";

const maxSteps = 12;

/** One segment per person who was ahead when you joined; yours is the last. */
function Track({ joinedAhead, ahead }: { joinedAhead: number; ahead: number }) {
  const { t } = usePublicLocale();
  const passed = Math.max(0, joinedAhead - ahead);
  const percent = Math.round((100 * passed) / (joinedAhead + 1));
  return (
    <div
      className="track"
      role="progressbar"
      aria-label={t.progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      {joinedAhead + 1 <= maxSteps ? (
        Array.from({ length: joinedAhead + 1 }, (_, index) => (
          <span
            key={index}
            data-step={index < passed ? "done" : index === joinedAhead ? "you" : "todo"}
          />
        ))
      ) : (
        <span className="track-bar" style={{ width: `${percent}%` }} />
      )}
    </div>
  );
}

type Props = {
  slug: string;
  ticketId: string;
  initial: { ticket: TicketData; venue: DisplayData } | null;
};

function Ticket({ slug, ticketId, initial }: Props) {
  const { t, language } = usePublicLocale();
  const [live, setLive] = useState<{ ticket: TicketData; joinedAhead: number } | null>(
    initial && { ticket: initial.ticket, joinedAhead: initial.ticket.peopleAhead },
  );
  const [error, setError] = useState<number | null>(null);
  const pending = useRef<AbortController | null>(null);
  const last = useRef<TicketData["status"] | null>(null);
  const [audible, setAudible] = useState(false);
  const chime = useChime();

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
          joinedAhead: Math.max(previous?.joinedAhead ?? 0, ticket.peopleAhead),
        }));
        setError(null);
      },
      (failure: unknown) => {
        if (!controller.signal.aborted)
          setError(failure instanceof ApiError ? failure.status : 503);
      },
    );
  }, [slug, ticketId]);

  const feed = usePublicFeed(slug, loadTicket, initial?.venue);

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
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        navigator.vibrate?.([200, 100, 200]);
      if (audible) play();
    }
    last.current = status;
  }, [audible, play, status]);

  const failure = error ?? feed.error;
  const prefix = prefixOf(ticket?.tokenNumber ?? "");

  return (
    <VisitorShell venue={feed.venue} tone={status === "CALLED" ? "signal" : undefined}>
      {feed.reconnecting && (
        <ConnectionNote>
          {t.offline} {ticket && t.offlineDetail}
        </ConnectionNote>
      )}
      {failure && !ticket && (
        <div className="visitor-empty">
          <p role="alert">{failure === 404 ? t.missingTicket : t.unavailable}</p>
          {failure !== 404 && (
            <button type="button" className="key" onClick={loadTicket}>
              {t.retry}
            </button>
          )}
        </div>
      )}
      {!ticket && !failure && (
        <p role="status" className="visitor-empty muted">
          {t.loading}
        </p>
      )}
      {ticket && (
        <section className="stub" data-status={status} aria-labelledby="ticket-title">
          <div className="stub-head">
            <h1 id="ticket-title" className="caps">
              <Tx k="ticket" inline />
            </h1>
            <p className="stub-counter">
              <Plate prefix={prefix} />
              <span>{ticket.counterName}</span>
            </p>
          </div>

          <p className="sign stub-token" translate="no">
            {ticket.tokenNumber}
          </p>

          <div className="stub-message" role="status" aria-live="polite">
            {status === "WAITING" && (
              <p className="stub-say">
                <Tx k="wait" />
              </p>
            )}
            {status === "CALLED" && (
              <>
                <p className="sign stub-call">
                  <Tx k="called" />
                </p>
                <p className="stub-go">
                  <Dual en="Go to" bn="যান" inline />
                  <Plate prefix={prefix} />
                  <strong>{ticket.counterName}</strong>
                </p>
              </>
            )}
            {status === "SERVED" && (
              <>
                <p className="sign stub-call">
                  <Tx k="served" />
                </p>
                <p className="stub-say">
                  <Tx k="servedDetail" />
                </p>
              </>
            )}
            {status === "SKIPPED" && (
              <>
                <p className="sign stub-call">
                  <Tx k="skipped" />
                </p>
                <p className="stub-say">
                  <Tx k="skippedDetail" />
                </p>
              </>
            )}
          </div>

          {status === "WAITING" && (
            <div className="stub-foot">
              <dl className="stub-facts">
                <div>
                  <dt>
                    <Tx k="people" />
                  </dt>
                  <dd className="sign">{formatNumber(ticket.peopleAhead, language)}</dd>
                </div>
                <div>
                  <dt>
                    <Tx k="estimate" />
                  </dt>
                  <dd className="sign">
                    {ticket.estimatedWaitMinutes === 0 ? (
                      <Tx k="youreNext" />
                    ) : (
                      <Dual
                        en={`${formatNumber(ticket.estimatedWaitMinutes, "en")} min`}
                        bn={`${formatNumber(ticket.estimatedWaitMinutes, "bn")} মিনিট`}
                      />
                    )}
                  </dd>
                </div>
              </dl>
              <Track joinedAhead={live.joinedAhead} ahead={ticket.peopleAhead} />
            </div>
          )}
        </section>
      )}
      {status === "WAITING" && (
        <button
          type="button"
          className="key stub-sound no-print"
          aria-pressed={audible}
          onClick={async () => {
            if (audible) return setAudible(false);
            if (await chime.unlock()) {
              setAudible(true);
              chime.play();
            }
          }}
        >
          {audible ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
          {chime.status === "unavailable"
            ? t.audioUnavailable
            : audible
              ? t.soundOn
              : t.sound}
        </button>
      )}
    </VisitorShell>
  );
}

export function TicketScreen(props: Props) {
  return (
    <PublicLocale>
      <Ticket {...props} />
    </PublicLocale>
  );
}
