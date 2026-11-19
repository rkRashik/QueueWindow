"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { HttpError } from "@/lib/client";
import { ticketLabel, type TicketState } from "@/lib/domain";

const number = new Intl.NumberFormat("en");
export const count = (value: number) => number.format(value);
export const titleFor: Record<TicketState, string> = {
  waiting: "Waiting",
  called: "Now calling",
  serving: "In service",
  completed: "All done",
  absent: "Absent",
  cancelled: "Cancelled",
};
export const business = (value: string) => value;
export const desk = (value: string) => value;
export function errorText(error: unknown, login = false) {
  if (error instanceof HttpError) {
    if (error.status === 401)
      return login
        ? "Incorrect password. Try again."
        : "Session expired. Please sign in.";
    if (error.status === 404) return "This item is no longer available.";
    if (error.status === 409)
      return "The queue changed. Check the latest state and try again.";
    if (error.status === 429) return "Please wait a moment and try again.";
    if (error.status === 400) return "Check your details and try again.";
    if (login && error.status === 503)
      return "Staff sign-in is not configured. Contact your queue administrator.";
  }
  return "Unable to connect. Please try again.";
}

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="QueueWindow home">
      <span className="mark" aria-hidden="true">
        <i />
      </span>
      <span lang="en">QueueWindow</span>
    </Link>
  );
}
export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="header">
      <div className="headerInner">
        <Brand />
        {children && <div className="tools">{children}</div>}
      </div>
    </header>
  );
}
export function Number({ value }: { value?: number }) {
  const code = value === undefined ? "—" : ticketLabel(value);
  return (
    <span className="number" lang="en">
      <span key={code}>{code}</span>
    </span>
  );
}
export function State({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <main id="main" className="state">
      <h1>{title}</h1>
      {detail && <p>{detail}</p>}
      {children}
    </main>
  );
}
export function Offline({ refresh }: { refresh: () => void }) {
  return (
    <div className="feedback warn" role="status">
      <span>Offline. Showing the last update.</span>
      <button className="plain" onClick={refresh}>
        Refresh
      </button>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  restore,
  print = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  restore?: Element | null;
  print?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const node = ref.current;
    const trigger = restore ?? document.activeElement;
    node?.showModal();
    return () => {
      node?.close();
      queueMicrotask(() => {
        if (document.querySelector("dialog[open]")) return;
        if (
          trigger instanceof HTMLElement &&
          trigger.isConnected &&
          !trigger.matches(":disabled")
        )
          trigger.focus();
        else document.getElementById("staff-title")?.focus();
      });
    };
  }, [restore]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={id}
      data-print={print || undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modalHead">
        <h2 id={id}>{title}</h2>
        <button className="icon" aria-label="Close" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function HomeLink() {
  return (
    <Link className="button" href="/">
      Back home <ArrowRight size={19} aria-hidden="true" />
    </Link>
  );
}
