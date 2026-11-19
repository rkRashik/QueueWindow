"use client";

import Link from "next/link";
import {
  Keyboard,
  LogOut,
  Menu,
  Monitor,
  Plus,
  Printer,
  QrCode,
  Settings2,
  SkipForward,
  Tablet,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { VenueMark } from "@/components/venue-mark";
import { Drum } from "@/components/drum";
import { FullscreenToggle } from "@/components/fullscreen";
import { Plate } from "@/components/plate";
import { Popover } from "@/components/popover";
import { estimatedWait } from "@/features/queue/rules";
import { counterVars, getCounterTheme, sortCounters } from "@/lib/counter-theme";
import { formatElapsed, formatNumber } from "@/lib/i18n";
import { formatClock, formatWait, pace, targetSeconds } from "@/lib/time";
import { api, ApiError, jsonRequest } from "./client";
import { useDeskState, type DeskSnapshot } from "./desk-state";
import { LanguageSwitch, LocaleProvider, useLocale } from "./locale";
import { Modal, Notice, Toast, useToast, type Workspace } from "./ui";

type TicketView = NonNullable<DeskSnapshot["calledTicket"]>;
type Action = "ISSUE_WALKIN" | "CALL_NEXT" | "COMPLETE" | "SKIP" | "RECALL" | "TOGGLE_PAUSE";

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
      <table className="ledger">
        <tbody>
          {rows.map(([keys, label]) => (
            <tr key={label}>
              <td className="font-semibold">{label}</td>
              <td className="text-end">
                <span className="inline-flex gap-1">
                  {keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

/** A ruler, not a progress bar: minute ticks to 1.5× target, target marked. */
function ServiceGauge({ seconds }: { seconds: number }) {
  const { t, language } = useLocale();
  const span = targetSeconds * 1.5;
  const level = pace(seconds).level;
  return (
    <div className="gauge" data-level={level}>
      <div className="gauge-read">
        <span className="sign gauge-time">{formatElapsed(seconds, language)}</span>
        <span className="sign muted text-base font-semibold">
          {t.target} {formatWait(targetSeconds / 60, language)}
        </span>
      </div>
      <div
        className="gauge-rule"
        style={{ "--ticks": span / 60, "--target": targetSeconds / span } as CSSProperties}
        aria-hidden="true"
      >
        <span className="gauge-fill" style={{ width: `${Math.min(1, seconds / span) * 100}%` }} />
      </div>
    </div>
  );
}

function Queue({
  tickets,
  now,
  canAct,
  canIssue,
  clearMinutes,
  onSkip,
  onIssue,
}: {
  tickets: TicketView[];
  now: number;
  canAct: boolean;
  canIssue: boolean;
  clearMinutes: number;
  onSkip: (id: string) => void;
  onIssue: () => void;
}) {
  const { t, language } = useLocale();
  return (
    <section aria-labelledby="queue-title" className="desk-queue">
      <div className="desk-queue-head">
        <h2 id="queue-title" className="flex items-baseline gap-2.5">
          <span className="sign text-xl font-semibold">{t.waiting}</span>
          <span className="sign desk-count">{formatNumber(tickets.length, language)}</span>
        </h2>
        <button
          type="button"
          className="key key-sm"
          disabled={!canIssue}
          onClick={onIssue}
          title={`${t.issue} (N)`}
          aria-keyshortcuts="N"
        >
          <Plus aria-hidden="true" />
          {t.walkin}
          <kbd aria-hidden="true">N</kbd>
        </button>
      </div>
      {tickets.length > 0 && (
        <p className="desk-clear">
          {t.estClear} <strong className="num">{formatWait(clearMinutes, language)}</strong>
        </p>
      )}
      {tickets.length === 0 ? (
        <div className="desk-queue-empty">
          <p className="font-bold">{t.quiet}</p>
          <p className="muted">{t.queueEmpty}</p>
        </div>
      ) : (
        <ol className="desk-list" aria-labelledby="queue-title">
          {tickets.map((item, index) => {
            const seconds = elapsed(now, item.issuedAt);
            return (
              <li key={item.id} className="desk-item" data-first={index === 0}>
                <span className="desk-pos num">{formatNumber(index + 1, language)}</span>
                <span className="sign desk-token" translate="no">
                  {item.tokenNumber}
                </span>
                <span className="desk-waited num" data-level={pace(seconds).level}>
                  {formatElapsed(seconds, language)}
                </span>
                <button
                  type="button"
                  className="key key-quiet key-sm key-icon desk-skip"
                  disabled={!canAct}
                  aria-label={`${t.skip} ${item.tokenNumber}`}
                  title={`${t.skip} ${item.tokenNumber}`}
                  onClick={() => onSkip(item.id)}
                >
                  <SkipForward aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Desk({ workspace }: { workspace: Workspace }) {
  const { t, language } = useLocale();
  const { data, selected, selectCounter, refresh, error, online, link } = useDeskState(
    workspace.slug,
  );
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
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

  const counters = sortCounters(data?.counters ?? []);
  const counter = data?.counters.find((item) => item.id === selected);
  const current = data?.selectedCounterId === selected;
  const active = current ? (data?.calledTicket ?? null) : null;
  const waiting = current ? (data?.waitingTickets ?? []) : [];
  const canAct = Boolean(counter && current && online);
  const canIssue = canAct && counter?.status === "OPEN" && !expired;
  const next = waiting[0];
  const activeSeconds = active
    ? elapsed(now, active.firstCalledAt ?? active.calledAt ?? active.issuedAt)
    : 0;
  const clearMinutes = estimatedWait(
    waiting.length,
    data?.typicalServiceSeconds ?? null,
    active ? activeSeconds : null,
  );

  async function perform(action: Action, ticketId?: string) {
    if (!counter || !canAct || actionInProgress.current) return;
    const isIssuance = action === "ISSUE_WALKIN";
    if (isIssuance && !canIssue) return;
    if (action === "CALL_NEXT" && !next) return;
    const requiresTicket = ["COMPLETE", "RECALL", "SKIP"].includes(action);
    const target = ticketId ?? active?.id;
    if (requiresTicket && !target) return;

    actionInProgress.current = true;
    setBusy(true);
    const body: { action: Action; counterId: string; ticketId?: string; idempotencyKey?: string } =
      { action, counterId: counter.id };
    if (requiresTicket) body.ticketId = target;
    if (isIssuance) {
      const key = walkins.current.get(counter.id) ?? crypto.randomUUID();
      walkins.current.set(counter.id, key);
      body.idempotencyKey = key;
    }

    try {
      const result = await api<{ ticket?: TicketView | null; counter?: { status: string } }>(
        "/api/desk/action",
        jsonRequest("POST", body),
      );
      if (isIssuance) walkins.current.delete(counter.id);
      notify(
        {
          ISSUE_WALKIN: result.ticket
            ? `${t.issuedNotice} ${result.ticket.tokenNumber}`
            : t.issuedNotice,
          CALL_NEXT: result.ticket ? `${t.calledNotice} ${result.ticket.tokenNumber}` : t.noneWaiting,
          COMPLETE: t.servedNotice,
          RECALL: t.recalled,
          SKIP: t.skippedNotice,
          TOGGLE_PAUSE: result.counter?.status === "OPEN" ? t.opened : t.pausedNotice,
        }[action],
      );
      // Unlock as soon as the server confirms; the follow-up refresh must not swallow the next key.
      void refresh();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status < 500 && isIssuance)
        walkins.current.delete(counter.id);
      if (failure instanceof ApiError && failure.status === 402) setExpired(true);
      else
        notify(
          failure instanceof ApiError && language === "en" ? failure.message : t.error,
          true,
        );
      if (failure instanceof ApiError && (failure.status === 404 || failure.status === 409))
        void refresh();
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  }

  const defaulted = useRef(false);
  const firstId = counters[0]?.id;
  useEffect(() => {
    // Open on the first counter in sorted order (A before B), once.
    if (defaulted.current || !firstId) return;
    defaulted.current = true;
    if (data?.selectedCounterId !== firstId) selectCounter(firstId);
  }, [data?.selectedCounterId, firstId, selectCounter]);

  // An Effect Event always sees this render's state, so the listener is attached once.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
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
    if (!action || !canAct || (action === "ISSUE_WALKIN" && !canIssue)) return;
    if (action === "CALL_NEXT" && (target.closest("button, a, [role='button']") || !next)) return;
    if (["COMPLETE", "SKIP", "RECALL"].includes(action) && !active) return;
    event.preventDefault();
    void perform(action);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  const reconnecting = !online || link === "reconnecting";
  const links = [
    [`/display/${workspace.slug}`, t.tv, Monitor],
    [`/join/${workspace.slug}`, t.joinLink, QrCode],
    [`/kiosk/${workspace.slug}`, t.kiosk, Tablet],
    [`/print/${workspace.slug}/qr`, t.printA4, Printer],
  ] as const;

  return (
    <div
      className="desk"
      aria-busy={busy}
      style={counterVars(getCounterTheme(counter?.prefix ?? "A"))}
    >
      <header className="desk-bar">
        <Link href="/desk" className="desk-mark" aria-label="QueueWindow">
          <VenueMark venue={workspace} size={26} className="workspace-mark" />
        </Link>
        <p className="desk-org" title={workspace.name}>
          <span className="truncate">{workspace.name}</span>
          {workspace.demo && <span className="muted shrink-0 font-semibold">· {t.liveDemo}</span>}
        </p>
        <h1 className="sr-only">{t.desk}</h1>
        {reconnecting && (
          <p role="status" className="desk-link">
            {online ? t.reconnecting : t.offline}
          </p>
        )}
        <div className="desk-tools">
          <time className="sign desk-clock" dateTime={new Date(now).toISOString()}>
            {formatClock(new Date(now), language)}
          </time>
          {counter && (
            <button
              type="button"
              className="key key-sm desk-toggle"
              disabled={!canAct}
              aria-label={counter.status === "OPEN" ? t.pause : t.resume}
              title={`${counter.status === "OPEN" ? t.pause : t.resume} (P)`}
              aria-keyshortcuts="P"
              onClick={() => void perform("TOGGLE_PAUSE")}
            >
              <span className="state" data-state={counter.status}>
                {counter.status === "OPEN" ? t.open : t.paused}
              </span>
              <kbd aria-hidden="true">P</kbd>
            </button>
          )}
          <LanguageSwitch />
          <FullscreenToggle labels={{ enter: t.fullscreen, exit: t.exitFullscreen }} />
          <Popover
            label={t.menu}
            triggerClassName="key key-sm key-icon"
            trigger={<Menu aria-hidden="true" />}
          >
            {(close) => (
              <nav aria-label={t.menu}>
                <p className="menu-caption">
                  <strong className="block text-[0.9375rem] text-(--fg)">{workspace.name}</strong>
                  {workspace.role === "OWNER" ? t.owner : t.staff}
                </p>
                <div className="menu-rule" />
                {links.map(([href, label, Icon]) => (
                  <a
                    key={href}
                    className="menu-item"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={close}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </a>
                ))}
                <div className="menu-rule" />
                {workspace.role === "OWNER" && (
                  <Link className="menu-item" href="/admin" onClick={close}>
                    <Settings2 aria-hidden="true" />
                    {t.admin}
                  </Link>
                )}
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    close();
                    setHelp(true);
                  }}
                >
                  <Keyboard aria-hidden="true" />
                  {t.shortcuts}
                  <kbd>?</kbd>
                </button>
                <div className="menu-rule" />
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="menu-item">
                    <LogOut aria-hidden="true" />
                    {t.logout}
                  </button>
                </form>
              </nav>
            )}
          </Popover>
        </div>
      </header>

      {error && !data ? (
        <main id="main" className="desk-blank">
          <Notice title={error} tone="error" />
          <button type="button" className="key" onClick={() => void refresh()}>
            {t.retry}
          </button>
        </main>
      ) : !data ? (
        <main id="main" className="desk-blank" aria-busy="true">
          <p className="muted">{t.loadingQueue}</p>
        </main>
      ) : !counters.length ? (
        <main id="main" className="desk-blank">
          <p className="sign text-2xl font-semibold">{t.noCounters}</p>
          <p className="muted">{t.noCountersDetail}</p>
          {workspace.role === "OWNER" && (
            <Link className="key key-primary" href="/admin?section=counters">
              {t.newCounter}
            </Link>
          )}
        </main>
      ) : (
        <main id="main" className="desk-body">
          <nav className="desk-rail" aria-label={t.counter}>
            {counters.map((item) => (
              <button
                key={item.id}
                type="button"
                className="desk-rail-item"
                aria-pressed={item.id === selected}
                onClick={() => {
                  if (!busy) selectCounter(item.id);
                }}
              >
                <Plate prefix={item.prefix} />
                <span className="desk-rail-name">{item.name}</span>
                {item.status === "PAUSED" && (
                  <span className="state desk-rail-state" data-state="PAUSED">
                    {t.paused}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <section className="desk-serve" aria-labelledby="serve-title">
            <div className="desk-serve-head">
              {counter && <Plate prefix={counter.prefix} />}
              <h2 id="serve-title" className="sign text-xl font-semibold">
                {counter?.name}
              </h2>
            </div>

            <div className="desk-now">
              <p className="caps">{t.active}</p>
              {active ? (
                <>
                  <Drum value={active.tokenNumber} className="sign desk-now-token" />
                  <ServiceGauge seconds={activeSeconds} />
                </>
              ) : (
                <p className="sign desk-now-idle">
                  {counter?.status === "PAUSED" ? t.pausedIdle : t.noActive}
                </p>
              )}
            </div>

            <div className="desk-actions">
              {expired && <Notice title={t.expired}>{t.expiredDetail}</Notice>}
              <button
                type="button"
                className="key key-primary desk-call"
                disabled={!canAct || !next}
                aria-keyshortcuts="Space Enter"
                onClick={() => void perform("CALL_NEXT")}
              >
                <span className="desk-call-label">
                  {t.call}
                  <span className="desk-call-sub">
                    {next
                      ? active
                        ? `${t.completes} ${active.tokenNumber} · ${t.nextUp} ${next.tokenNumber}`
                        : `${t.nextUp} ${next.tokenNumber}`
                      : t.noneWaiting}
                  </span>
                </span>
                <span className="desk-call-keys" aria-hidden="true">
                  <kbd>Space</kbd>
                </span>
              </button>
              <div className="desk-secondary">
                {(
                  [
                    ["COMPLETE", t.complete, "C"],
                    ["RECALL", t.recall, "R"],
                    ["SKIP", t.skip, "S"],
                  ] as const
                ).map(([action, label, key]) => (
                  <button
                    key={action}
                    type="button"
                    className={`key ${action === "SKIP" ? "key-danger" : ""}`}
                    disabled={!canAct || !active}
                    aria-keyshortcuts={key}
                    onClick={() => void perform(action)}
                  >
                    {label}
                    <kbd aria-hidden="true">{key}</kbd>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Queue
            tickets={waiting}
            now={now}
            canAct={canAct}
            canIssue={canIssue}
            clearMinutes={clearMinutes}
            onSkip={(id) => void perform("SKIP", id)}
            onIssue={() => void perform("ISSUE_WALKIN")}
          />
        </main>
      )}
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
