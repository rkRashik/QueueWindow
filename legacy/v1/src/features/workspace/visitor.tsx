"use client";

import { ArrowUpRight, CircleCheck, RefreshCw } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
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
  const [bangla, setBangla] = useState(
    () =>
      token !== null &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("lang") === "bn",
  );
  const t = (bn: string, en: string) => (bangla ? bn : en);
  const language = (
    <button
      className="plain languageControl"
      lang={bangla ? "en" : "bn"}
      onClick={() => setBangla(!bangla)}
    >
      {t("English", "বাংলা")}
    </button>
  );
  const {
    data: pass,
    error,
    refresh,
  } = usePoll<VisitorView>(token ? "/api/ticket" : null, token ?? undefined);
  if (!pass)
    return (
      <>
        <Header>{language}</Header>
        <State
          title={
            token === ""
              ? t("টিকিট আছে?", "Have a ticket?")
              : error
                ? t("টিকিট পাওয়া যায়নি", "Ticket not found")
                : t("টিকিট খোঁজা হচ্ছে…", "Finding your ticket…")
          }
          detail={
            token === ""
              ? t(
                  "টিকিটের লিংক খুলুন বা কাউন্টারের দেওয়া QR কোড স্ক্যান করুন।",
                  "Open your private link or scan the QR code from the desk.",
                )
              : error
                ? t(
                    "লিংকটি আবার দেখুন বা কাউন্টারে কথা বলুন।",
                    "Check your link or ask at the desk.",
                  )
                : undefined
          }
        >
          {error && (
            <button className="plain" onClick={refresh}>
              {t("আবার চেষ্টা করুন", "Try again")}
            </button>
          )}
        </State>
      </>
    );

  const stage = pass.ticket.state;
  const waiting = stage === "waiting";
  const called = stage === "called";
  const done = stage === "completed";
  const banglaStates = {
    waiting: "অপেক্ষায়",
    called: "আপনার পালা এসেছে",
    serving: "সেবা চলছে",
    completed: "সেবা শেষ",
    absent: "উপস্থিত ছিলেন না",
    cancelled: "টিকিট বাতিল",
  };
  const title = bangla
    ? waiting
      ? pass.ahead
        ? new Intl.NumberFormat("bn-BD").format(pass.ahead) + " জন আগে আছেন"
        : "এরপর আপনার পালা"
      : banglaStates[stage]
    : waiting
      ? pass.ahead
        ? count(pass.ahead) +
          (pass.ahead === 1 ? " person ahead" : " people ahead")
        : "You’re next"
      : called
        ? "It’s your turn"
        : titleFor[stage];
  const detail = bangla
    ? called
      ? "এই কাউন্টারে যান: " + pass.desk
      : waiting
        ? "আপনার পালা এলে এখানে দেখাবে।"
        : stage === "absent"
          ? "কাউন্টারে কথা বলুন।"
          : undefined
    : called
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
      <Header>{language}</Header>
      <main id="main" className="visitor" lang={bangla ? "bn" : "en"}>
        <div className="visitorTop">
          <p>{business(pass.name)}</p>
        </div>
        {error && <Offline refresh={refresh} />}
        <section className="pass" data-called={called || undefined}>
          {!["absent", "cancelled"].includes(stage) && (
            <ol
              className="journey"
              aria-label={t("টিকিটের অবস্থা", "Ticket progress")}
            >
              {(["waiting", "called", "serving", "completed"] as const).map(
                (step, index, steps) => (
                  <li
                    key={step}
                    aria-current={stage === step ? "step" : undefined}
                    data-reached={steps.indexOf(stage as typeof step) >= index}
                  >
                    {
                      (bangla
                        ? ["অপেক্ষায়", "ডাকা হয়েছে", "সেবা চলছে", "শেষ"]
                        : ["Waiting", "Called", "In service", "Done"])[index]
                    }
                  </li>
                ),
              )}
            </ol>
          )}
          <div className="passNumber">
            <span>{t("আপনার টোকেন", "Your ticket")}</span>
            <Number value={pass.ticket.number} />
          </div>
          <div className="passStatus" aria-live="polite" aria-atomic="true">
            <div key={stage} className="ticketStateCopy">
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
        {waiting && (custom || pass.paused) && (
          <p className="visitorNote">
            {custom || "New ticket issuance is paused."}
          </p>
        )}
        <button className="plain visitorRefresh" onClick={refresh}>
          <RefreshCw size={18} aria-hidden="true" /> {t("আবার দেখুন", "Refresh")}
        </button>
      </main>
    </>
  );
}
