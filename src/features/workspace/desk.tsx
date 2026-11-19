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
  LogOut,
  Monitor,
  Pause,
  Play,
  Plus,
  Printer,
  QrCode,
  Settings2,
  SkipForward,
  Ticket,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatElapsed, formatNumber } from "@/lib/i18n";
import { api, ApiError, jsonRequest } from "./client";
import { useDeskState, type DeskSnapshot } from "./desk-state";
import { LanguageSwitch, LocaleProvider, useLocale } from "./locale";
import {
  Notice,
  StatusPill,
  Toast,
  useToast,
  Wordmark,
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
      className="surface flex min-h-0 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <ListOrdered aria-hidden="true" className="size-4.5 text-muted" />
          <h2 id="waiting-title" className="section-heading">
            {t.waitingQueue}
          </h2>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-900 ring-1 ring-amber-600/20 tabular-nums ring-inset">
          {formatNumber(tickets.length, language)}
        </span>
      </div>
      {tickets.length === 0 && (
        <div className="grid flex-1 place-content-center justify-items-center gap-2 p-8 text-center">
          <span className="grid size-11 place-items-center rounded-xl border border-line bg-slate-50 text-muted">
            <ListOrdered className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted">{t.queueEmpty}</p>
        </div>
      )}
      <ul
        aria-labelledby="waiting-title"
        tabIndex={0}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5 empty:hidden"
      >
        <AnimatePresence initial={false}>
          {tickets.map((item, index) => {
            const seconds = elapsed(now, item.issuedAt);
            return (
              <motion.li
                key={item.id}
                layout={reduce ? false : "position"}
                initial={reduce ? false : { opacity: 0, x: -14 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: { delay: Math.min(index, 8) * 0.035 },
                }}
                exit={reduce ? undefined : { opacity: 0, x: 18, height: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={`group grid grid-cols-[1.75rem_minmax(0,1fr)_max-content_max-content] items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors hover:border-slate-200 hover:bg-slate-50 ${index === 0 ? "border-indigo-100 bg-indigo-50/60" : "border-transparent"}`}
              >
                <span className="text-center text-xs font-bold text-slate-500 tabular-nums">
                  {formatNumber(index + 1, language)}
                </span>
                <span
                  className="min-w-0 break-all text-[1.05rem] font-extrabold tabular-nums"
                  translate="no"
                >
                  {item.tokenNumber}
                </span>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${seconds > 600 ? "bg-amber-50 text-amber-900 ring-1 ring-amber-600/20 ring-inset" : "bg-slate-100 text-slate-700"}`}
                >
                  <Clock3 aria-hidden="true" className="size-3" />
                  {formatElapsed(seconds, language)}
                </span>
                <button
                  type="button"
                  className="btn btn-quiet min-h-8 px-2 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800 focus-visible:opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
                  disabled={!canAct}
                  aria-label={`${t.skip} ${item.tokenNumber}`}
                  onClick={() => onSkip(item.id)}
                >
                  <SkipForward aria-hidden="true" />
                  {t.skip}
                </button>
              </motion.li>
            );
          })}
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
  const [demoNotice, setDemoNotice] = useState(true);
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

  const iconLink = "btn btn-quiet min-h-9 px-2.5";
  const linkText = "sr-only 2xl:not-sr-only";
  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:h-dvh lg:overflow-hidden">
      <header className="z-10 shrink-0 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 lg:h-14 lg:flex-nowrap lg:px-6 lg:py-0">
          <Wordmark />
          <span
            className="hidden max-w-[22ch] truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 xl:block"
            title={workspace.name}
          >
            {workspace.name}
          </span>
          <span
            className="hidden h-5 border-s border-line lg:block"
            aria-hidden="true"
          />
          <h1 className="text-sm font-extrabold tracking-tight">{t.desk}</h1>
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="counter-choice" className="sr-only">
              {t.counter}
            </label>
            <select
              id="counter-choice"
              className="field min-h-9 w-auto max-w-[min(13rem,45vw)] rounded-lg py-1 text-sm font-bold"
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
          <div className="ms-auto flex flex-wrap items-center gap-1 sm:gap-1.5">
            <nav className="flex items-center gap-0.5" aria-label={t.desk}>
              <a
                className={iconLink}
                href={`/display/${workspace.slug}`}
                target="_blank"
                rel="noreferrer"
                title={t.tv}
              >
                <Monitor aria-hidden="true" />
                <span className={linkText}>{t.tv}</span>
              </a>
              <a
                className={iconLink}
                href={`/join/${workspace.slug}`}
                target="_blank"
                rel="noreferrer"
                title={t.visitorLink}
              >
                <QrCode aria-hidden="true" />
                <span className={linkText}>{t.visitorLink}</span>
              </a>
              <a
                className={iconLink}
                href={`/print/${workspace.slug}/qr`}
                target="_blank"
                rel="noreferrer"
                title={t.printQr}
              >
                <Printer aria-hidden="true" />
                <span className={linkText}>{t.printQr}</span>
              </a>
              {workspace.role === "OWNER" && (
                <Link className={iconLink} href="/admin" title={t.admin}>
                  <Settings2 aria-hidden="true" />
                  <span className={linkText}>{t.admin}</span>
                </Link>
              )}
            </nav>
            <LanguageSwitch />
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className={`${iconLink} whitespace-nowrap`}
                title={t.logout}
              >
                <LogOut aria-hidden="true" />
                <span className={linkText}>{t.logout}</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 lg:px-6 lg:py-4"
      >
        {workspace.demo && demoNotice && (
          <div className="flex justify-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 py-0.5 ps-3.5 pe-1 text-xs text-indigo-950 shadow-[0_1px_2px_rgba(79,70,229,0.08)]">
              <span
                className="live-dot !size-1.5 !bg-indigo-500"
                aria-hidden="true"
              />
              <strong>{t.liveDemo}</strong>
              <span className="hidden min-w-0 truncate sm:inline">
                {t.demoDetail}
              </span>
              <button
                type="button"
                className="btn btn-quiet min-h-7 rounded-full px-1.5"
                aria-label={t.dismiss}
                onClick={() => setDemoNotice(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div className="space-y-2 empty:hidden">
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
          <p role="status" className="surface p-6 text-sm text-muted">
            {t.loadingQueue}
          </p>
        )}
        {data && !counter && (
          <div className="surface p-6">
            <h2 className="section-heading">{t.noCounters}</h2>
            <p className="mt-1 text-sm text-muted">{t.noCountersDetail}</p>
          </div>
        )}
        {counter && (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
            <section
              className="flex min-h-0 flex-col gap-3"
              aria-labelledby="active-title"
              aria-busy={!current}
            >
              <div className="relative flex min-h-60 flex-1 flex-col justify-between gap-4 overflow-hidden rounded-2xl bg-obsidian p-5 text-white shadow-[0_1px_2px_rgba(11,17,32,0.2),0_20px_44px_-16px_rgba(11,17,32,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] sm:p-6">
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "opacity-40"}`}
                  style={{
                    background:
                      "radial-gradient(60% 70% at 50% 45%, rgba(16,185,129,0.2), transparent 70%), radial-gradient(40% 50% at 100% 100%, rgba(99,102,241,0.18), transparent 70%)",
                  }}
                />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        active ? "live-dot" : "size-2 rounded-full bg-slate-600"
                      }
                      aria-hidden="true"
                    />
                    <h2
                      id="active-title"
                      className="text-sm font-extrabold tracking-wide text-slate-200"
                    >
                      {t.active}
                    </h2>
                  </div>
                  {active && (
                    <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-extrabold text-emerald-200 ring-1 ring-emerald-300/25 ring-inset">
                      {t.activeStatus}
                    </span>
                  )}
                </div>

                <div className="relative grid flex-1 place-items-center overflow-hidden py-1">
                  <AnimatePresence initial={false} mode="wait">
                    {active ? (
                      <motion.p
                        key={active.id + active.tokenNumber}
                        aria-live="polite"
                        initial={{ opacity: 0, y: 32, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          y: -32,
                          scale: 0.94,
                          transition: { duration: 0.1 },
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 26,
                        }}
                        className="break-all text-center text-[clamp(4rem,min(11vw,22dvh),8.5rem)] leading-none font-extrabold -tracking-[.04em] text-emerald-300 tabular-nums drop-shadow-[0_0_28px_rgba(52,211,153,0.45)]"
                        translate="no"
                      >
                        {active.tokenNumber}
                      </motion.p>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="grid justify-items-center gap-2 text-center"
                      >
                        <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300">
                          <Ticket className="size-5" aria-hidden="true" />
                        </span>
                        <p className="text-xl font-extrabold tracking-tight">
                          {t.noActive}
                        </p>
                        <p className="text-sm text-slate-300">{t.ready}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative flex flex-wrap items-end justify-between gap-3">
                  {active ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {t.elapsed}
                      <span className="rounded-md bg-white/10 px-2 py-1 font-extrabold text-white tabular-nums">
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
                  ) : (
                    <span />
                  )}
                  <div className="text-end">
                    <p className="text-xs font-bold text-slate-300">{t.next}</p>
                    <p className="mt-0.5 break-all text-base font-extrabold tabular-nums">
                      {next?.tokenNumber ?? t.noneWaiting}
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface shrink-0 p-3">
                <motion.button
                  type="button"
                  className="btn btn-primary min-h-14 w-full from-indigo-500 to-indigo-600 text-base"
                  disabled={!canAct || !next}
                  aria-keyshortcuts="Space Enter"
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  onClick={() => void perform("CALL_NEXT")}
                >
                  <ArrowRight aria-hidden="true" />
                  {t.call}
                  <Hotkey>Space</Hotkey>
                  <CornerDownLeft
                    className="hidden sm:block"
                    aria-hidden="true"
                  />
                </motion.button>
                <div className="mt-2 grid grid-cols-3 gap-2">
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
                <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    className="btn btn-quiet min-h-9"
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
                    className="btn btn-quiet min-h-9"
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
    </div>
  );
}

export function DeskScreen({ workspace }: { workspace: Workspace }) {
  return (
    <LocaleProvider>
      <Desk workspace={workspace} />
    </LocaleProvider>
  );
}
