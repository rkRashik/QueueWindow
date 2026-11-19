"use client";

import { ArrowUpRight, CircleCheck, RefreshCw } from "lucide-react";
import { useSyncExternalStore } from "react";
import { usePoll } from "@/lib/client";
import type { VisitorView } from "@/lib/domain";
import {
  count,
  business,
  desk,
  Header,
  Number,
  Offline,
  State,
  titleFor,
} from "./ui";

function watch(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
const read = () => window.location.hash.slice(1);
const empty = () => null;

export function Visitor() {
  const token = useSyncExternalStore(watch, read, empty);
  return <Ticket key={token} token={token} />;
}

function Ticket({ token }: { token: string | null }) {
  const {
    data: pass,
    error,
    refresh,
  } = usePoll<VisitorView>(token ? "/api/ticket" : null, token ?? undefined);
  if (!pass)
    return (
      <>
        <Header />
        <State
          title={
            token === ""
              ? "Have a ticket?"
              : error
                ? "Ticket not found"
                : "Finding your ticket…"
          }
          detail={
            token === ""
              ? "Open your private link or scan the QR code from the desk."
              : error
                ? "Check your link or ask at the desk."
                : undefined
          }
        >
          {error && (
            <button className="plain" onClick={refresh}>
              Try again
            </button>
          )}
        </State>
      </>
    );

  const stage = pass.ticket.state;
  const waiting = stage === "waiting";
  const called = stage === "called";
  const done = stage === "completed";
  const title = waiting
    ? pass.ahead
      ? count(pass.ahead) +
        (pass.ahead === 1 ? " person ahead" : " people ahead")
      : "You’re next"
    : called
      ? "It’s your turn"
      : titleFor[stage];
  const detail = called
    ? desk(pass.desk) + " — please head over."
    : waiting
      ? "Your turn will appear here."
      : stage === "absent"
        ? "Please check with the desk."
        : undefined;
  const custom =
    pass.message === "Make yourself comfortable. We’ll be with you soon."
      ? ""
      : pass.message;
  return (
    <>
      <Header />
      <main id="main" className="visitor">
        <div className="visitorTop">
          <p>{business(pass.name)}</p>
          {pass.demo && <span className="badge">Demo</span>}
        </div>
        {error && <Offline refresh={refresh} />}
        <section className="pass" data-called={called || undefined}>
          <div className="journey" aria-hidden="true">
            <span data-reached="true" />
            <span data-reached={called || stage === "serving" || done} />
            <span data-reached={done} />
          </div>
          <div className="passNumber">
            <span>Your ticket</span>
            <Number value={pass.ticket.number} />
          </div>
          <div className="passStatus" aria-live="polite" aria-atomic="true">
            <div>
              <h1>{title}</h1>
              {detail && <p>{detail}</p>}
            </div>
            {called ? (
              <ArrowUpRight size={32} aria-hidden="true" />
            ) : done ? (
              <CircleCheck size={28} aria-hidden="true" />
            ) : null}
          </div>
        </section>
        {waiting && custom && <p className="visitorNote">{custom}</p>}
        <button className="plain visitorRefresh" onClick={refresh}>
          <RefreshCw size={18} aria-hidden="true" /> Refresh
        </button>
      </main>
    </>
  );
}
