"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  Monitor,
  Plus,
  Settings2,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { request, usePoll, HttpError } from "@/lib/client";
import {
  isActive,
  isTerminal,
  ticketLabel,
  type Snapshot,
  type Preferences,
  type Ticket,
} from "@/lib/domain";
import {
  count,
  business,
  desk,
  errorText,
  Header,
  Modal,
  Number,
  Offline,
  State,
  titleFor,
} from "./ui";

const ShareTicket = dynamic(() =>
  import("./share").then((module) => module.ShareTicket),
);
type Command = {
  key: string;
  version: number;
  action: string;
  ticketId?: string;
  name?: string;
  desk?: string;
  message?: string;
  preferences?: Preferences;
};
type Pass = { ticket: Ticket; token: string };
type Confirm = {
  action: string;
  title: string;
  description: string;
  ticketId?: string;
};

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <time>
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </time>
  );
}

export function Staff() {
  const router = useRouter();
  const {
    data: queue,
    error: offline,
    refresh,
  } = usePoll<Snapshot>("/api/queue");
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [retry, setRetry] = useState<Command | null>(null);
  const [pass, setPass] = useState<(Pass & { restore: Element | null }) | null>(
    null,
  );
  const [settings, setSettings] = useState(false);
  const [previewTheme, setPreviewTheme] =
    useState<Preferences["theme"]>("midnight");
  const [previewCount, setPreviewCount] = useState(4);
  const [history, setHistory] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  async function work(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await task();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function run(
    action: string,
    fields: Partial<Command> = {},
    replay?: Command,
  ) {
    if (!queue || offline || (retry && !replay)) return;
    const restore = document.activeElement;
    const command = replay ?? {
      key: crypto.randomUUID(),
      version: queue.version,
      action,
      ...fields,
    };
    await work(async () => {
      try {
        const result = await request<Partial<Pass>>("/api/queue", {
          method: "POST",
          body: JSON.stringify(command),
          signal: AbortSignal.timeout(12000),
        });
        setRetry(null);
        setConfirm(null);
        if (action === "settings") setSettings(false);
        if (result.ticket && result.token)
          setPass({
            ...result,
            ticket: result.ticket,
            token: result.token,
            restore,
          });
        else
          setStatus(
            action === "settings" ? "Settings saved." : "Queue updated.",
          );
        await refresh();
      } catch (failure) {
        if (!(failure instanceof HttpError) || failure.status >= 500) {
          setRetry(command);
          setConfirm(null);
          setSettings(false);
        } else {
          setRetry(null);
          await refresh();
        }
        throw failure;
      }
    });
  }
  function openPass(id: string) {
    const restore = document.activeElement;
    return work(async () => {
      const response = await request<Pass>("/api/ticket", {
        method: "POST",
        body: JSON.stringify({ ticketId: id }),
        signal: AbortSignal.timeout(10000),
      });
      setPass({ ...response, restore });
    });
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("settings", {
      name: String(form.get("name")),
      desk: String(form.get("desk")),
      message: String(form.get("message")),
      preferences: {
        theme: form.get("theme") === "paper" ? "paper" : "midnight",
        upcoming: parseInt(String(form.get("upcoming")), 10),
        chime: form.has("chime"),
        printFooter: String(form.get("printFooter")),
        pauseMessage: String(form.get("pauseMessage")),
      },
    });
  }

  if (!queue)
    return (
      <>
        <Header />
        <State
          title={offline ? "Unable to open workspace" : "Opening workspace…"}
          detail={offline ? "Sign in or check your connection." : undefined}
        >
          {offline && (
            <div className="actions">
              <Link className="button" href="/login">
                Staff sign in
              </Link>
              <button className="plain" onClick={refresh}>
                Try again
              </button>
            </div>
          )}
        </State>
      </>
    );

  const waiting = queue.tickets.filter((item) => item.state === "waiting");
  const current = queue.tickets.find((item) => isActive(item.state));
  const visible = history
    ? queue.tickets.filter((item) => isTerminal(item.state)).reverse()
    : waiting;
  const nextAction =
    current?.state === "called" ? "start" : current ? "complete" : "call";
  const nextLabel = {
    start: "Start service",
    complete: "Finish service",
    call: waiting[0] ? "Call " + ticketLabel(waiting[0].number) : "Call next",
  }[nextAction];
  const blocked = busy || !!offline || !!retry;
  const feedback = (error || retry) && (
    <div className="feedback warn" role="alert">
      <span>
        {retry
          ? "Connection interrupted. Retry to confirm this action."
          : error}
      </span>
      {retry && (
        <button
          className="plain"
          disabled={busy || !!offline}
          onClick={() => run(retry.action, {}, retry)}
        >
          Retry action
        </button>
      )}
    </div>
  );

  return (
    <>
      <Header>
        <a
          className="plain displayLink"
          aria-label="Public display"
          href={"/display/" + queue.displayId}
          target="_blank"
          rel="noreferrer"
        >
          <Monitor size={19} aria-hidden="true" />
          <span>Public display</span>
        </a>
        <button
          className="icon"
          aria-label="Settings"
          onClick={() => {
            setError("");
            setPreviewTheme(queue.preferences.theme);
            setPreviewCount(queue.preferences.upcoming);
            setSettings(true);
          }}
        >
          <Settings2 size={22} aria-hidden="true" />
        </button>
      </Header>
      <main id="main" className="wrap staff">
        <div className="staffTop">
          <div>
            <p>
              {business(queue.name)}{" "}
              {queue.demo && <span className="badge">Demo</span>}
            </p>
            <h1 id="staff-title" tabIndex={-1}>
              Your queue
            </h1>
          </div>
          <button
            className="plain issueButton"
            disabled={blocked || queue.paused}
            onClick={() => run("issue")}
          >
            <Plus size={21} aria-hidden="true" /> New ticket
          </button>
        </div>
        {offline && <Offline refresh={refresh} />}
        {!settings && !confirm && feedback}
        <p className="sr" role="status">
          {status}
        </p>
        {queue.paused && (
          <p className="feedback warn">Ticket issuance is paused.</p>
        )}
        <div className="deskGrid">
          <section
            className="active"
            data-state={current?.state}
            aria-labelledby="active-title"
          >
            <header>
              <h2 id="active-title">
                <span className="dot" />
                {current ? titleFor[current.state] : "Ready when you are"}
              </h2>
              <span>{desk(queue.desk)}</span>
              {current?.state === "serving" && queue.startedAt && (
                <span>
                  Service time <Elapsed since={queue.startedAt} />
                </span>
              )}
              {current?.state === "called" && queue.calledAt && (
                <span>
                  Called <Elapsed since={queue.calledAt} /> ago
                </span>
              )}
            </header>
            <div className="activeNumber" aria-live="polite">
              <Number value={current?.number ?? waiting[0]?.number} />
            </div>
            <div className="actions">
              <button
                className="button primaryDeskAction"
                onClick={() => run(nextAction, { ticketId: current?.id })}
                disabled={blocked || (!current && waiting.length === 0)}
              >
                {busy ? "Updating..." : nextLabel}{" "}
                <ArrowRight size={20} aria-hidden="true" />
              </button>
              {current?.state === "called" && (
                <button
                  className="plain"
                  disabled={blocked}
                  onClick={() => run("recall", { ticketId: current.id })}
                >
                  Call again
                </button>
              )}
              {current?.state === "called" && (
                <button
                  className="plain"
                  disabled={blocked}
                  onClick={() => {
                    setError("");
                    setConfirm({
                      action: "absent",
                      ticketId: current.id,
                      title: "Mark as absent?",
                      description: "This ends the ticket’s turn.",
                    });
                  }}
                >
                  Mark absent
                </button>
              )}
              {current && (
                <button
                  className="plain"
                  disabled={blocked}
                  onClick={() => openPass(current.id)}
                >
                  View ticket
                </button>
              )}
            </div>
          </section>
          <section className="queue" aria-labelledby="queue-title">
            <div className="queueHead">
              <h2 id="queue-title">
                {history ? "History" : "Waiting"}{" "}
                <span>{count(visible.length)}</span>
              </h2>
              <button className="plain" onClick={() => setHistory(!history)}>
                {history ? "Back to queue" : "History"}
              </button>
            </div>
            {visible.length ? (
              <ol>
                {visible.map((item, index) => (
                  <li key={item.id}>
                    <button
                      className="row"
                      aria-label={ticketLabel(item.number) + " View ticket"}
                      onClick={() => openPass(item.id)}
                      disabled={blocked}
                    >
                      <span className="id" lang="en">
                        {ticketLabel(item.number)}
                      </span>
                      <span>
                        {history ? (
                          titleFor[item.state]
                        ) : index === 0 ? (
                          <>
                            Up next &middot; <Elapsed since={item.issuedAt} />
                          </>
                        ) : (
                          <Elapsed since={item.issuedAt} />
                        )}
                      </span>
                      <ChevronRight size={19} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty">
                {history
                  ? "Completed tickets will appear here."
                  : "All caught up."}
              </p>
            )}
          </section>
        </div>
      </main>

      {pass && (
        <ShareTicket
          {...pass}
          name={business(queue.name)}
          counter={desk(queue.desk)}
          footer={queue.preferences.printFooter}
          onClose={() => setPass(null)}
          onCancel={
            pass.ticket.state === "waiting" && !blocked
              ? () => {
                  setPass(null);
                  setConfirm({
                    action: "cancel",
                    ticketId: pass.ticket.id,
                    title: "Cancel this ticket?",
                    description: "This removes the ticket from the queue.",
                  });
                }
              : undefined
          }
        />
      )}
      {settings && (
        <Modal title="Settings" onClose={() => setSettings(false)}>
          <form className="form" onSubmit={save}>
            <label>
              Business name
              <input
                name="name"
                defaultValue={queue.name}
                minLength={2}
                maxLength={60}
                required
              />
            </label>
            <label>
              Desk name
              <input
                name="desk"
                defaultValue={queue.desk}
                maxLength={30}
                required
              />
            </label>
            <label>
              Visitor message
              <textarea
                name="message"
                rows={2}
                defaultValue={queue.message}
                maxLength={140}
              />
            </label>
            <details className="settingsMore">
              <summary>Display settings</summary>
              <div className="displaySample" data-theme={previewTheme}>
                <span>Now calling</span>
                <strong>A024 &rarr; {queue.desk}</strong>
                {previewCount > 0 && (
                  <span>
                    Up next &middot;{" "}
                    {Array.from({ length: previewCount }, (_, index) =>
                      ticketLabel(25 + index),
                    ).join("  ")}
                  </span>
                )}
              </div>
              <label>
                Display theme
                <select
                  name="theme"
                  value={previewTheme}
                  onChange={(event) =>
                    setPreviewTheme(
                      event.target.value === "paper" ? "paper" : "midnight",
                    )
                  }
                >
                  <option value="midnight">Midnight</option>
                  <option value="paper">Paper</option>
                </select>
              </label>
              <label>
                Upcoming tickets
                <select
                  name="upcoming"
                  value={previewCount}
                  onChange={(event) =>
                    setPreviewCount(parseInt(event.target.value, 10))
                  }
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="chime"
                  defaultChecked={queue.preferences.chime}
                />{" "}
                Allow call chime
              </label>
            </details>
            <details className="settingsMore">
              <summary>Ticket and queue messages</summary>
              <label>
                Print footer
                <input
                  name="printFooter"
                  defaultValue={queue.preferences.printFooter}
                  maxLength={100}
                />
              </label>
              <label>
                Pause message
                <input
                  name="pauseMessage"
                  defaultValue={queue.preferences.pauseMessage}
                  maxLength={140}
                />
              </label>
            </details>
            {feedback}
            <button className="button" disabled={blocked}>
              Save changes
            </button>
          </form>
          <details className="settingsMore">
            <summary>Queue controls</summary>
            <div className="actions">
              <button
                className="plain"
                disabled={blocked}
                onClick={() => run(queue.paused ? "resume" : "pause")}
              >
                {queue.paused ? "Resume tickets" : "Pause tickets"}
              </button>
              <button
                className="plain"
                disabled={blocked}
                onClick={() => {
                  setSettings(false);
                  setConfirm({
                    action: "new-day",
                    title: "Start a new day?",
                    description:
                      "Finish active tickets first. Previous tickets will be archived.",
                  });
                }}
              >
                New day
              </button>
              <button
                className="plain"
                disabled={busy}
                onClick={() =>
                  work(async () => {
                    await request("/api/session", {
                      method: "DELETE",
                      signal: AbortSignal.timeout(10000),
                    });
                    router.push("/");
                  })
                }
              >
                Sign out
              </button>
            </div>
          </details>
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p>{confirm.description}</p>
          {feedback}
          <div className="actions">
            <button className="plain" onClick={() => setConfirm(null)}>
              Go back
            </button>
            <button
              className="button"
              disabled={blocked}
              onClick={() =>
                run(confirm.action, { ticketId: confirm.ticketId })
              }
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
