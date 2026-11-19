"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  Clock3,
  CircleHelp,
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
  Tablet,
  Ticket,
  User,
  X,
  ChevronDown,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Wordmark } from "@/components/brand";
import { CounterBadge } from "@/components/counter-badge";
import { FullscreenToggle } from "@/components/fullscreen";
import { PaceBar } from "@/components/pace-bar";
import { Popover } from "@/components/popover";
import {
  counterVars,
  getCounterTheme,
  sortCounters,
} from "@/lib/counter-theme";
import { formatElapsed, formatNumber } from "@/lib/i18n";
import { formatWait, pace, targetSeconds } from "@/lib/time";
import { api, ApiError, jsonRequest } from "./client";
import { useDeskState, type DeskSnapshot } from "./desk-state";
import { LanguageSwitch, LocaleProvider, useLocale } from "./locale";
import {
  Modal,
  Notice,
  StatusPill,
  Toast,
  useToast,
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

function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const rows: [string[], string][] = [
    [["Space", "Enter"], t.call],
    [["C"], t.complete],
    [["R"], t.recall],
    [["S"], t.skip],
    [["N"], t.issue],
    [["P"], `${t.pause} / ${t.resume}`],
    [["?"], t.shortcuts],
  ];
  return (
    <Modal title={t.shortcuts} onClose={onClose} busy={false}>
      <ul className="grid gap-1">
        {rows.map(([keys, label]) => (
          <li
            key={label}
            className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm font-semibold even:bg-slate-50"
          >
            <span>{label}</span>
            <span className="flex gap-1">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function WaitingQueue({
  tickets,
  now,
  canAct,
  avgServiceMinutes,
  onSkip,
}: {
  tickets: TicketView[];
  now: number;
  canAct: boolean;
  avgServiceMinutes: number | null;
  onSkip: (id: string) => void;
}) {
  const { t, language } = useLocale();
  const reduce = useReducedMotion();
  const clear = tickets.length * (avgServiceMinutes ?? targetSeconds / 60);
  return (
    <section
      aria-labelledby="waiting-title"
      className="surface flex min-h-0 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-900/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <ListOrdered aria-hidden="true" className="size-[18px] text-muted" />
          <h2 id="waiting-title" className="section-heading">
            {t.waitingQueue}
          </h2>
          <span className="relative grid h-6 min-w-6 place-items-center overflow-hidden rounded-full bg-slate-900 px-1.5 text-xs font-extrabold text-white tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={tickets.length}
                initial={reduce ? false : { y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? undefined : { y: -12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {formatNumber(tickets.length, language)}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        {tickets.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-muted tabular-nums">
            <Clock3 aria-hidden="true" className="size-3.5" />
            {t.estClear}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-ink">
              ~{formatWait(clear, language)}
            </span>
          </p>
        )}
      </div>
      {!tickets.length && (
        <div className="grid flex-1 place-items-center content-center gap-3 p-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <ListOrdered className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold">{t.quiet}</p>
          <p className="max-w-[28ch] text-sm text-muted">{t.queueEmpty}</p>
        </div>
      )}
      <ul
        aria-labelledby="waiting-title"
        tabIndex={0}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5 empty:hidden"
      >
        <AnimatePresence initial={false}>
          {tickets.map((item, index) => {
            const seconds = elapsed(now, item.issuedAt);
            const level = pace(seconds).level;
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
                className={`group rounded-xl border px-3 py-2 transition-colors hover:bg-slate-50 ${index === 0 ? "border-(--c-hue)/30 bg-(--c-soft)" : "border-transparent"}`}
              >
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_max-content_max-content] items-center gap-2.5">
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
                    className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${level === "late" ? "bg-rose-50 text-rose-800" : level === "warn" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-700"}`}
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
                </div>
                <div className="mt-1.5 ps-9 pe-1" aria-hidden="true">
                  <PaceBar
                    seconds={seconds}
                    height="h-1"
                    label={t.waitingLabel}
                  />
                </div>
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
  const [help, setHelp] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const actionInProgress = useRef(false);
  const walkins = useRef(new Map<string, string>());
  const toast = useToast();
  const { notify } = toast;
  const pill = useId();

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  const counters = sortCounters(data?.counters ?? []);
  const counter = data?.counters.find((item) => item.id === selected);
  const current = data?.selectedCounterId === selected;
  const active = current ? (data?.calledTicket ?? null) : null;
  const waiting = current ? (data?.waitingTickets ?? []) : [];
  const canAct = Boolean(counter && current && online && !busy);
  const canIssue = canAct && counter?.status === "OPEN" && !expired;
  const next = waiting[0];
  const theme = getCounterTheme(counter?.prefix ?? "A");
  const activeSeconds = active
    ? elapsed(now, active.firstCalledAt ?? active.calledAt ?? active.issuedAt)
    : 0;

  const perform = async (action: Action, ticketId?: string) => {
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
  };

  const defaulted = useRef(false);
  const firstId = counters[0]?.id;
  useEffect(() => {
    // Open on the first counter in sorted order (A before B), once.
    if (defaulted.current || !firstId) return;
    defaulted.current = true;
    if (data?.selectedCounterId !== firstId) selectCounter(firstId);
  }, [data?.selectedCounterId, firstId, selectCounter]);

  const performRef = useRef(perform);
  useEffect(() => {
    performRef.current = perform;
  });

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
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
      if (event.key === "?") {
        event.preventDefault();
        setHelp(true);
        return;
      }
      if (event.shiftKey) return;
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
      void performRef.current(action);
    }
    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, [active, canAct, canIssue, next]);

  const menuItem = "menu-item";
  return (
    <div
      className="flex min-h-dvh flex-col bg-canvas lg:h-dvh lg:overflow-hidden"
      style={counterVars(theme)}
    >
      <header className="z-20 shrink-0 border-b border-slate-900/[0.07] bg-white/85 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 lg:h-[3.75rem] lg:flex-nowrap lg:px-6 lg:py-0">
          <Wordmark />
          <span
            className="hidden max-w-[20ch] truncate rounded-md bg-slate-900/[0.05] px-2 py-1 text-xs font-bold text-slate-700 xl:block"
            title={workspace.name}
          >
            {workspace.name}
          </span>
          <h1 className="sr-only">
            {t.desk}
          </h1>
          <div
            role="group"
            aria-label={t.counter}
            className="order-last flex w-full min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] rounded-xl bg-slate-900/[0.045] p-1 lg:order-none lg:mx-auto lg:w-auto lg:max-w-[46%]"
          >
            {counters.map((item) => {
              const on = item.id === selected;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  title={item.name}
                  aria-label={item.name}
                  onClick={() => selectCounter(item.id)}
                  className={`relative flex min-h-9 shrink-0 items-center gap-2 rounded-lg ps-1.5 pe-3 text-sm font-bold ${on ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  {on && (
                    <motion.span
                      layoutId={pill}
                      className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(15,23,42,0.14)]"
                      style={{
                        boxShadow: `0 0 0 1.5px ${getCounterTheme(item.prefix).hue}, 0 4px 12px -4px ${getCounterTheme(item.prefix).glow}`,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 36,
                      }}
                    />
                  )}
                  <CounterBadge
                    prefix={item.prefix}
                    size="sm"
                    className="relative"
                  />
                  <span className="relative max-w-[11ch] truncate">
                    {item.name}
                  </span>
                  {item.status === "PAUSED" && (
                    <span
                      className="relative size-1.5 rounded-full bg-amber-500"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
            {!counters.length && (
              <span className="px-3 text-sm text-muted">—</span>
            )}
          </div>
          <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
            {counter && <StatusPill status={counter.status} />}
            <Popover
              label={t.displaysQr}
              trigger={
                <>
                  <Monitor aria-hidden="true" />
                  <span className="hidden whitespace-nowrap 2xl:inline">{t.displaysQr}</span>
                  <ChevronDown aria-hidden="true" className="!size-3.5" />
                </>
              }
            >
              {(close) => (
                <nav aria-label={t.displaysQr} className="grid">
                  {[
                    [`/display/${workspace.slug}`, t.tv, Monitor],
                    [`/join/${workspace.slug}`, t.joinLink, QrCode],
                    [`/print/${workspace.slug}/qr`, t.printA4, Printer],
                    [`/kiosk/${workspace.slug}`, t.kiosk, Tablet],
                  ].map(([href, label, Icon]) => {
                    const Glyph = Icon as typeof Monitor;
                    return (
                      <a
                        key={href as string}
                        className={menuItem}
                        href={href as string}
                        target="_blank"
                        rel="noreferrer"
                        onClick={close}
                      >
                        <Glyph aria-hidden="true" />
                        {label as string}
                      </a>
                    );
                  })}
                </nav>
              )}
            </Popover>
            <FullscreenToggle
              labels={{ enter: t.fullscreen, exit: t.exitFullscreen }}
            />
            <LanguageSwitch />
            {workspace.role === "OWNER" && (
              <Link
                className="btn btn-quiet min-h-9 px-2.5"
                href="/admin"
                title={t.admin}
              >
                <Settings2 aria-hidden="true" />
                <span className="hidden 2xl:inline">{t.admin}</span>
                <span className="sr-only 2xl:hidden">{t.admin}</span>
              </Link>
            )}
            <Popover
              label={t.account}
              triggerClassName="btn min-h-9 gap-1.5 rounded-full px-2.5"
              trigger={
                <>
                  <User aria-hidden="true" />
                  <ChevronDown aria-hidden="true" className="!size-3.5" />
                </>
              }
            >
              {() => (
                <div className="grid">
                  <p className="px-3 pt-2 pb-1 text-sm font-extrabold">
                    {workspace.name}
                  </p>
                  <p className="px-3 pb-2 text-xs font-semibold text-muted">
                    {workspace.role === "OWNER" ? "Owner" : t.staff}
                  </p>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className={`${menuItem} w-full text-rose-700`}
                    >
                      <LogOut aria-hidden="true" />
                      {t.logout}
                    </button>
                  </form>
                </div>
              )}
            </Popover>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 lg:px-6 lg:py-4"
      >
        {workspace.demo && demoNotice && (
          <div className="flex justify-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-teal-200 bg-teal-50 py-0.5 ps-3.5 pe-1 text-xs text-teal-950">
              <span
                className="live-dot !size-1.5 !bg-teal-500"
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
          <div
            role="status"
            aria-label={t.loadingQueue}
            className="grid min-h-0 flex-1 animate-pulse gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
          >
            <div className="rounded-2xl bg-slate-200/70" />
            <div className="rounded-2xl bg-slate-200/50" />
          </div>
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
              <div className="relative flex min-h-64 flex-1 flex-col justify-between gap-3 overflow-hidden rounded-3xl bg-obsidian p-5 text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),0_24px_50px_-20px_rgba(15,23,42,0.6),inset_0_1px_0_rgba(255,255,255,0.07)] sm:p-6">
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "opacity-40"}`}
                  style={{
                    background:
                      "radial-gradient(65% 75% at 50% 42%, var(--c-glow), transparent 72%)",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ background: "var(--c-hue)" }}
                />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <CounterBadge prefix={counter.prefix} size="md" />
                    <h2
                      id="active-title"
                      className="text-sm font-extrabold tracking-wide text-slate-200"
                    >
                      {t.active}
                    </h2>
                  </div>
                  {active && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-extrabold text-(--c-accent) ring-1 ring-white/15 ring-inset">
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
                        className="break-all text-center text-[clamp(4rem,min(11vw,22dvh),8.5rem)] leading-none font-extrabold -tracking-[.04em] text-(--c-accent) tabular-nums drop-shadow-[0_0_30px_var(--c-glow)]"
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

                <div className="relative grid gap-2.5">
                  {active ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-200">
                        <p className="flex items-center gap-2">
                          <Clock3 className="size-4" aria-hidden="true" />
                          {t.elapsed}
                          <span className="rounded-md bg-white/10 px-2 py-0.5 font-extrabold text-white tabular-nums">
                            {formatElapsed(activeSeconds, language)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-300 tabular-nums">
                          {formatNumber(
                            Math.round((100 * activeSeconds) / targetSeconds),
                            language,
                          )}
                          % {t.targetOf}{" "}
                          {formatWait(targetSeconds / 60, language)}
                        </p>
                      </div>
                      <PaceBar
                        seconds={activeSeconds}
                        track="bg-white/12"
                        height="h-2"
                        label={t.elapsed}
                      />
                    </>
                  ) : null}
                  <p className="flex items-baseline justify-end gap-2 text-end">
                    <span className="text-xs font-bold text-slate-300">
                      {t.next}
                    </span>
                    <span className="break-all text-base font-extrabold tabular-nums">
                      {next?.tokenNumber ?? t.noneWaiting}
                    </span>
                  </p>
                </div>
              </div>

              <div className="surface shrink-0 p-3">
                <motion.button
                  type="button"
                  className="btn btn-counter min-h-14 w-full text-base"
                  disabled={!canAct || !next}
                  aria-keyshortcuts="Space Enter"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  onClick={() => void perform("CALL_NEXT")}
                >
                  <ArrowRight aria-hidden="true" />
                  {t.call}
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
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-slate-900/[0.06] pt-2">
                  <button
                    type="button"
                    className="btn btn-quiet min-h-9"
                    disabled={!canIssue}
                    aria-label={t.issue}
                    aria-keyshortcuts="N"
                    onClick={() => void perform("ISSUE_WALKIN")}
                  >
                    <Plus aria-hidden="true" />
                    {t.walkin}
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
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet ms-auto min-h-9 px-2.5"
                    aria-label={t.shortcuts}
                    title={`${t.shortcuts} (?)`}
                    onClick={() => setHelp(true)}
                  >
                    <CircleHelp aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
            <WaitingQueue
              now={now}
              tickets={waiting}
              canAct={canAct}
              avgServiceMinutes={data?.stats?.avgServiceMinutes ?? null}
              onSkip={(id) => void perform("SKIP", id)}
            />
          </div>
        )}
      </main>
      {help && <ShortcutsModal onClose={() => setHelp(false)} />}
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
