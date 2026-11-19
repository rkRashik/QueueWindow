"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  Clock3,
  CornerDownLeft,
  ListOrdered,
  Monitor,
  Pause,
  Play,
  Plus,
  Printer,
  QrCode,
  Settings2,
  SkipForward,
  Ticket,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatElapsed, formatNumber } from "@/lib/i18n";
import { api, ApiError, jsonRequest } from "./client";
import { useDeskState, type DeskSnapshot } from "./desk-state";
import { LocaleProvider, useLocale } from "./locale";
import {
  Notice,
  StatusPill,
  Toast,
  useToast,
  WorkspaceHeader,
  type Workspace,
} from "./ui";

type TicketView = NonNullable<DeskSnapshot["calledTicket"]>;
type Action =
  | "ISSUE_WALKIN"
  | "CALL_NEXT"
  | "COMPLETE"
  | "SKIP"
  | "RECALL"
  | "TOGGLE_PAUSE";
const shortcuts: Record<string, Action> = {
  " ": "CALL_NEXT",
  Enter: "CALL_NEXT",
  c: "COMPLETE",
  r: "RECALL",
  s: "SKIP",
  n: "ISSUE_WALKIN",
  p: "TOGGLE_PAUSE",
};

function elapsed(now: number, start: string) {
  return Math.max(0, (now - Date.parse(start)) / 1_000);
}

function Hotkey({ children }: { children: string }) {
  return (
    <kbd className="hotkey" aria-hidden="true">
      {children}
    </kbd>
  );
}

function WaitingQueue({
  tickets,
  now,
  canAct,
  onSkip,
}: {
  tickets: TicketView[];
  now: number;
  canAct: boolean;
  onSkip: (id: string) => void;
}) {
  const { t, language } = useLocale();
  const reduce = useReducedMotion();
  return (
    <section
      aria-labelledby="waiting-title"
      className="panel self-start overflow-hidden"
    >
      <div className="eyeline flex items-center justify-between gap-3 px-5 py-4.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <ListOrdered aria-hidden="true" className="size-4.5 text-muted" />
          <h2 id="waiting-title" className="section-heading">
            {t.waitingQueue}
          </h2>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-900 tabular-nums">
          {formatNumber(tickets.length, language)}
        </span>
      </div>
      {tickets.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_max-content_5.5rem] items-center gap-2 px-5 pt-3 text-xs font-bold text-muted sm:px-6">
          <span>{t.ticket}</span>
          <span className="text-end">{t.waitingLabel}</span>
        </div>
      )}
      {tickets.length === 0 && (
        <p className="px-5 pt-6 pb-8 text-sm text-muted sm:px-6">
          {t.queueEmpty}
        </p>
      )}
      <ul
        aria-labelledby="waiting-title"
        className="divide-y divide-slate-100 px-5 sm:px-6"
      >
        <AnimatePresence initial={false}>
          {tickets.map((item) => (
            <motion.li
              key={item.id}
              layout={reduce ? false : "position"}
              initial={reduce ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{
                duration: reduce ? 0 : 0.16,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              className="grid grid-cols-[minmax(0,1fr)_max-content_5.5rem] items-center gap-2 py-2"
            >
              <span
                className="min-w-0 break-all text-[1.05rem] font-extrabold tabular-nums"
                translate="no"
              >
                {item.tokenNumber}
              </span>
              <span className="ms-auto flex items-center gap-1.5 text-sm font-semibold text-muted tabular-nums">
                <Clock3 aria-hidden="true" className="size-3.5" />
                {formatElapsed(elapsed(now, item.issuedAt), language)}
              </span>
              <button
                type="button"
                className="btn btn-quiet ms-auto px-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                disabled={!canAct}
                aria-label={`${t.skip} ${item.tokenNumber}`}
                onClick={() => onSkip(item.id)}
              >
                <SkipForward aria-hidden="true" />
                {t.skip}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function Desk({ workspace }: { workspace: Workspace }) {
  const { t, language } = useLocale();
  const { data, selected, selectCounter, refresh, error, online, link } =
    useDeskState(workspace.slug);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const actionInProgress = useRef(false);
  const walkins = useRef(new Map<string, string>());
  const toast = useToast();
  const { notify } = toast;

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  const counter = data?.counters.find((item) => item.id === selected);
  const current = data?.selectedCounterId === selected;
  const active = current ? (data?.calledTicket ?? null) : null;
  const waiting = current ? (data?.waitingTickets ?? []) : [];
  const canAct = Boolean(counter && current && online && !busy);
  const canIssue = canAct && counter?.status === "OPEN" && !expired;
  const next = waiting[0];

  const perform = useCallback(
    async (action: Action, ticketId?: string) => {
      if (!counter || !canAct || actionInProgress.current) return;
      const isIssuance = action === "ISSUE_WALKIN";
      if (isIssuance && !canIssue) return;
      if (action === "CALL_NEXT" && !next) return;
      const requiresTicket = ["COMPLETE", "RECALL", "SKIP"].includes(action);
      const target = ticketId ?? active?.id;
      if (requiresTicket && !target) return;

      actionInProgress.current = true;
      setBusy(true);
      const body: {
        action: Action;
        counterId: string;
        ticketId?: string;
        idempotencyKey?: string;
      } = { action, counterId: counter.id };
      if (requiresTicket) body.ticketId = target;
      if (isIssuance) {
        const key = walkins.current.get(counter.id) ?? crypto.randomUUID();
        walkins.current.set(counter.id, key);
        body.idempotencyKey = key;
      }

      try {
        const result = await api<{
          ticket?: TicketView | null;
          counter?: { status: string };
        }>("/api/desk/action", jsonRequest("POST", body));
        if (isIssuance) walkins.current.delete(counter.id);
        const message = {
          ISSUE_WALKIN: t.issuedNotice,
          CALL_NEXT: result.ticket ? t.calledNotice : t.noneWaiting,
          COMPLETE: t.servedNotice,
          RECALL: t.recalled,
          SKIP: t.skippedNotice,
          TOGGLE_PAUSE:
            result.counter?.status === "OPEN" ? t.opened : t.pausedNotice,
        }[action];
        notify(message);
        await refresh();
      } catch (failure) {
        if (failure instanceof ApiError && failure.status < 500 && isIssuance)
          walkins.current.delete(counter.id);
        if (failure instanceof ApiError && failure.status === 402)
          setExpired(true);
        else
          notify(
            failure instanceof ApiError && language === "en"
              ? failure.message
              : t.error,
            true,
          );
        if (
          failure instanceof ApiError &&
          (failure.status === 404 || failure.status === 409)
        )
          await refresh();
      } finally {
        actionInProgress.current = false;
        setBusy(false);
      }
    },
    [active?.id, canAct, canIssue, counter, language, next, notify, refresh, t],
  );

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        target.isContentEditable ||
        target.closest("input, textarea, select, [role='textbox'], dialog") ||
        document.querySelector("dialog[open]")
      )
        return;
      const action = shortcuts[event.key] ?? shortcuts[event.key.toLowerCase()];
      if (!action || !canAct || (action === "ISSUE_WALKIN" && !canIssue))
        return;
      if (
        action === "CALL_NEXT" &&
        (target.closest("button, a, [role='button']") || !next)
      )
        return;
      if (["COMPLETE", "SKIP", "RECALL"].includes(action) && !active) return;
      event.preventDefault();
      void perform(action);
    }
    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, [active, canAct, canIssue, next, perform]);

  return (
    <>
      <WorkspaceHeader organization={workspace.name} surface="desk">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <label
              htmlFor="counter-choice"
              className="text-xs font-extrabold text-muted"
            >
              {t.counter}
            </label>
            <select
              id="counter-choice"
              className="field w-auto max-w-[min(14rem,65vw)] py-1.5 text-sm font-bold"
              value={selected}
              disabled={busy || !data?.counters.length}
              onChange={(event) => selectCounter(event.target.value)}
            >
              {!data?.counters.length && <option value="">—</option>}
              {data?.counters.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {counter && <StatusPill status={counter.status} />}
          </div>
          <nav
            className="flex flex-wrap items-center gap-1"
            aria-label={t.desk}
          >
            <a
              className="btn btn-quiet"
              href={`/display/${workspace.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <Monitor aria-hidden="true" />
              {t.tv}
            </a>
            <a
              className="btn btn-quiet"
              href={`/join/${workspace.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <QrCode aria-hidden="true" />
              {t.visitorLink}
            </a>
            <a
              className="btn btn-quiet"
              href={`/print/${workspace.slug}/qr`}
              target="_blank"
              rel="noreferrer"
            >
              <Printer aria-hidden="true" />
              {t.printQr}
            </a>
            {workspace.role === "OWNER" && (
              <Link className="btn btn-quiet" href="/admin">
                <Settings2 aria-hidden="true" />
                {t.admin}
              </Link>
            )}
          </nav>
        </div>
      </WorkspaceHeader>

      <main id="main" className="shell-width py-7 sm:py-9">
        {workspace.demo && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-950">
            <div>
              <strong>{t.liveDemo}</strong>
              <span className="ms-2">{t.demoDetail}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <a
                className="btn btn-quiet"
                href={`/display/${workspace.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <Monitor aria-hidden="true" />
                {t.tv}
              </a>
              <a
                className="btn btn-quiet"
                href={`/join/${workspace.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <QrCode aria-hidden="true" />
                {t.visitorLink}
              </a>
            </div>
          </div>
        )}
        <div className="mb-6">
          <h1 className="page-heading">{t.desk}</h1>
          <p className="mt-2 text-sm text-muted">{t.deskDetail}</p>
        </div>
        <div className="mb-4 space-y-2 empty:hidden">
          {!online && <Notice title={t.offline}>{t.offlineDetail}</Notice>}
          {online && link === "reconnecting" && (
            <Notice title={t.reconnecting}>{t.reconnectDetail}</Notice>
          )}
          {expired && (
            <Notice title={t.expired} tone="error">
              {t.expiredDetail}
            </Notice>
          )}
          {error && online && (
            <Notice title={language === "en" ? error : t.error} tone="error">
              <button
                type="button"
                className="btn mt-2"
                onClick={() => void refresh()}
              >
                {t.retry}
              </button>
            </Notice>
          )}
        </div>
        {!data && !error && (
          <p role="status" className="panel p-6 text-sm text-muted">
            {t.loadingQueue}
          </p>
        )}
        {data && !counter && (
          <div className="panel p-6">
            <h2 className="section-heading">{t.noCounters}</h2>
            <p className="mt-1 text-sm text-muted">{t.noCountersDetail}</p>
          </div>
        )}
        {counter && (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.24fr)_minmax(0,1fr)] lg:gap-6">
            <section
              className="panel"
              aria-labelledby="active-title"
              aria-busy={!current}
            >
              <div className="eyeline flex flex-wrap items-center justify-between gap-3 px-5 py-4.5 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <Ticket className="size-4.5 text-muted" aria-hidden="true" />
                  <h2 id="active-title" className="section-heading">
                    {t.active}
                  </h2>
                </div>
                {active && (
                  <span className="status-pill status-open">
                    {t.activeStatus}
                  </span>
                )}
              </div>
              <div className="p-4 sm:p-6">
                <div
                  className={`grid min-h-52 content-center gap-4 rounded-xl border px-5 py-5 sm:min-h-60 sm:px-7 ${active ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                >
                  {active ? (
                    <>
                      <p
                        aria-live="polite"
                        className="break-all text-[clamp(3.1rem,8vw,6rem)] leading-none font-extrabold -tracking-[.04em] text-emerald-900 tabular-nums"
                        translate="no"
                      >
                        {active.tokenNumber}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-900">
                        <Clock3 className="size-4" aria-hidden="true" />
                        {t.elapsed}
                        <span className="rounded-md bg-white/80 px-2 py-1 font-extrabold tabular-nums">
                          {formatElapsed(
                            elapsed(
                              now,
                              active.firstCalledAt ??
                                active.calledAt ??
                                active.issuedAt,
                            ),
                            language,
                          )}
                        </span>
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <span className="grid size-10 place-items-center rounded-lg border border-line bg-white text-muted">
                        <Ticket className="size-5" aria-hidden="true" />
                      </span>
                      <p className="text-xl font-extrabold tracking-tight">
                        {t.noActive}
                      </p>
                      <p className="text-sm text-muted">{t.ready}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted">{t.next}</p>
                    <p className="mt-1 break-all text-base font-extrabold tabular-nums">
                      {next?.tokenNumber ?? t.noneWaiting}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary min-h-12 flex-1 sm:flex-none"
                    disabled={!canAct || !next}
                    aria-keyshortcuts="Space Enter"
                    onClick={() => void perform("CALL_NEXT")}
                  >
                    <ArrowRight aria-hidden="true" />
                    {t.call}
                    <Hotkey>Space</Hotkey>
                    <CornerDownLeft
                      className="hidden sm:block"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    className="btn min-w-0 px-2"
                    disabled={!canAct || !active}
                    aria-keyshortcuts="C"
                    onClick={() => void perform("COMPLETE")}
                  >
                    <Check aria-hidden="true" />
                    {t.complete}
                    <Hotkey>C</Hotkey>
                  </button>
                  <button
                    type="button"
                    className="btn min-w-0 px-2"
                    disabled={!canAct || !active}
                    aria-keyshortcuts="R"
                    onClick={() => void perform("RECALL")}
                  >
                    <Bell aria-hidden="true" />
                    {t.recall}
                    <Hotkey>R</Hotkey>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger min-w-0 px-2"
                    disabled={!canAct || !active}
                    aria-keyshortcuts="S"
                    onClick={() => void perform("SKIP")}
                  >
                    <SkipForward aria-hidden="true" />
                    {t.skip}
                    <Hotkey>S</Hotkey>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 rounded-b-xl border-t border-line bg-slate-50/65 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  className="btn"
                  disabled={!canIssue}
                  aria-keyshortcuts="N"
                  onClick={() => void perform("ISSUE_WALKIN")}
                >
                  <Plus aria-hidden="true" />
                  {t.issue}
                  <Hotkey>N</Hotkey>
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!canAct}
                  aria-keyshortcuts="P"
                  onClick={() => void perform("TOGGLE_PAUSE")}
                >
                  {counter.status === "OPEN" ? (
                    <Pause aria-hidden="true" />
                  ) : (
                    <Play aria-hidden="true" />
                  )}
                  {counter.status === "OPEN" ? t.pause : t.resume}
                  <Hotkey>P</Hotkey>
                </button>
              </div>
            </section>
            <WaitingQueue
              now={now}
              tickets={waiting}
              canAct={canAct}
              onSkip={(id) => void perform("SKIP", id)}
            />
          </div>
        )}
      </main>
      <Toast toast={toast} />
    </>
  );
}

export function DeskScreen({ workspace }: { workspace: Workspace }) {
  return (
    <LocaleProvider>
      <Desk workspace={workspace} />
    </LocaleProvider>
  );
}
