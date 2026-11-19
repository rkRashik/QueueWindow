"use client";

import { ArrowRight, Printer, Ticket as TicketIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HttpError, request, requestKey, usePoll } from "@/lib/client";
import {
  ticketLabel,
  type AdmissionView,
  type PublicTicket,
} from "@/lib/domain";
import { Brand } from "./ui";
import { Qr } from "./qr";

export function Admission({
  code,
  kiosk = false,
}: {
  code: string;
  kiosk?: boolean;
}) {
  const endpoint = "/api/join/" + encodeURIComponent(code);
  const storageKey =
    "queuewindow:pending:" + code + (kiosk ? ":kiosk" : ":phone");
  const { data, error, refresh } = usePoll<AdmissionView>(
    endpoint,
    undefined,
    15000,
  );
  const [bangla, setBangla] = useState(true);
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [recover, setRecover] = useState(false);
  const lock = useRef(false);
  const attempt = useRef("");
  const t = (bn: string, en: string) => (bangla ? bn : en);

  useEffect(() => {
    try {
      attempt.current = sessionStorage.getItem(storageKey) || "";
    } catch {}
    if (attempt.current) {
      const show = setTimeout(() => setRecover(true), 0);
      return () => clearTimeout(show);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!kiosk || !ticket) return;
    const cleanup = setTimeout(() => setTicket(null), 90000);
    return () => clearTimeout(cleanup);
  }, [kiosk, ticket]);

  function clearAttempt() {
    attempt.current = "";
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setRecover(false);
  }

  async function issue() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setNotice("");
    try {
      attempt.current ||= requestKey();
      try {
        sessionStorage.setItem(storageKey, attempt.current);
      } catch {}
      const issued = await request<PublicTicket>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ key: attempt.current }),
        },
        15000,
      );
      clearAttempt();
      if (kiosk) setTicket(issued);
      else
        window.location.replace(
          "/ticket?lang=" + (bangla ? "bn" : "en") + "#" + issued.token,
        );
    } catch (failure) {
      if (
        failure instanceof HttpError &&
        [400, 403, 404, 409, 410].includes(failure.status)
      ) {
        clearAttempt();
        setNotice("closed");
        void refresh();
      } else {
        setRecover(Boolean(attempt.current));
        setNotice("retry");
      }
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  const ticketPath = ticket
    ? "/ticket?lang=" + (bangla ? "bn" : "en") + "#" + ticket.token
    : "";
  const ticketUrl = ticket ? window.location.origin + ticketPath : "";
  return (
    <main
      id="main"
      className="admission"
      lang={bangla ? "bn" : "en"}
      data-kiosk={kiosk}
    >
      <header className="admissionHeader">
        <Brand />
        <button
          type="button"
          className="plain languageControl"
          onClick={() => setBangla(!bangla)}
          lang={bangla ? "en" : "bn"}
        >
          {t("English", "বাংলা")}
        </button>
      </header>
      {ticket ? (
        <section className="admissionReceipt">
          <div className="receiptBody">
            <p>{data?.name}</p>
            <h1>{t("আপনার টোকেন", "Your ticket")}</h1>
            <strong className="receiptNumber" lang="en">
              {ticketLabel(ticket.number)}
            </strong>
            <p>{data?.desk}</p>
            <Qr
              value={ticketUrl}
              label={t("টিকিট দেখার QR কোড", "QR code for your ticket")}
            />
            <p>
              {t("ফোনে টিকিট দেখতে স্ক্যান করুন", "Scan to follow on your phone")}
            </p>
            {data?.footer && <p>{data.footer}</p>}
          </div>
          <div className="admissionActions">
            <button className="button" onClick={() => window.print()}>
              <Printer size={20} aria-hidden="true" />
              {t("প্রিন্ট করুন", "Print ticket")}
            </button>
            <button className="plain" onClick={() => setTicket(null)}>
              {t("শেষ করুন", "Done")}
            </button>
          </div>
        </section>
      ) : (
        <section className="admissionPanel">
          <span className="admissionSymbol">
            <TicketIcon size={30} aria-hidden="true" />
          </span>
          {data && <p className="admissionVenue">{data.name}</p>}
          <h1>{t("লাইনে যোগ দিন", "Join the queue")}</h1>
          <p>
            {kiosk
              ? t(
                  "টিকিট প্রিন্ট করুন বা ফোনে রাখুন।",
                  "Print your ticket or keep it on your phone.",
                )
              : t(
                  "টিকিট নিলেই লাইনে যোগ হবেন।",
                  "Take a ticket to join the queue.",
                )}
          </p>
          {notice && (
            <p role="alert">
              {notice === "closed"
                ? t(
                    "এখন টিকিট পাওয়া যাচ্ছে না। কাউন্টারে বলুন।",
                    "Tickets are unavailable. Please ask at the desk.",
                  )
                : t(
                    "সংযোগে সমস্যা। একই টিকিটের জন্য আবার চেষ্টা করুন।",
                    "Connection interrupted. Retry to recover the same ticket.",
                  )}
            </p>
          )}
          {data && !data.open && (
            <p role="status">
              {data.message ||
                t(
                  "টিকিটের জন্য কাউন্টারে যান।",
                  "Please ask at the desk for a ticket.",
                )}
            </p>
          )}
          {!data && (
            <p role="status">
              {error
                ? t("সংযোগ পাওয়া যাচ্ছে না।", "Unable to reach the queue.")
                : t("লাইন খুলছে…", "Opening the queue…")}
            </p>
          )}
          {(data?.open || recover) && (
            <button className="button" disabled={pending} onClick={issue}>
              {pending
                ? t("একটু অপেক্ষা করুন…", "Please wait…")
                : recover
                  ? t("আবার চেষ্টা করুন", "Retry ticket")
                  : t("টোকেন নিন", "Get a ticket")}{" "}
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          )}
          {error && !recover && (
            <button className="plain" onClick={() => void refresh()}>
              {t("সংযোগ আবার দেখুন", "Check connection")}
            </button>
          )}
        </section>
      )}
    </main>
  );
}
