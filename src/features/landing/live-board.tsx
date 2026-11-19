"use client";

import { useEffect, useState } from "react";
import { Board } from "@/features/public/tv";
import { PublicLocale } from "@/features/public/language";
import type { PublicCounter } from "@/features/public/live";

type Desk = { id: string; name: string; prefix: string; served: number; issued: number; open: boolean };

const start: Desk[] = [
  { id: "a", name: "Reception", prefix: "A", served: 14, issued: 18, open: true },
  { id: "b", name: "Dr. Rahman", prefix: "B", served: 6, issued: 8, open: true },
  { id: "c", name: "Pharmacy", prefix: "C", served: 9, issued: 9, open: true },
];
const order = ["a", "b", "a", "c", "a", "b"];
const pad = (value: number) => String(value).padStart(2, "0");

function view(desk: Desk): PublicCounter {
  const waiting = Array.from(
    { length: desk.issued - desk.served },
    (_, index) => `${desk.prefix}-${pad(desk.served + index + 1)}`,
  );
  return {
    id: desk.id,
    name: desk.name,
    prefix: desk.prefix,
    status: desk.open ? "OPEN" : "PAUSED",
    calledTicket: desk.served
      ? { tokenNumber: `${desk.prefix}-${pad(desk.served)}`, calledAt: String(desk.served) }
      : null,
    waitingTokens: waiting.slice(0, 3),
    waitingCount: waiting.length,
    estimatedWaitMinutes: waiting.length * 4,
  };
}

/** The real board component, fed a small simulation: calls every few seconds. */
export function LiveBoard() {
  const [desks, setDesks] = useState(start);
  const [step, setStep] = useState(0);
  const [calls, setCalls] = useState<{ id: string; key: string; at: number }[]>([]);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setStep((value) => value + 1), 3_400);
    return () => clearInterval(timer);
  }, []);

  const [seen, setSeen] = useState(0);
  if (step !== seen) {
    setSeen(step);
    const id = order[step % order.length];
    const next = desks.map((desk) => {
      let { served, issued } = desk;
      if (desk.id === id && issued > served) served += 1;
      if (desk.id === order[(step + 2) % order.length] && issued - served < 4) issued += 1;
      return { ...desk, served, issued };
    });
    const called = next.find((desk) => desk.id === id)!;
    setDesks(next);
    // A lamp lasts two steps (6.8 s, matched by --lamp on .mini).
    const live = calls.filter((call) => step - call.at < 2 && call.id !== id);
    if (called.served !== desks.find((desk) => desk.id === id)!.served)
      live.push({ id, key: `${id}${called.served}`, at: step });
    setCalls(live);
  }
  const calling = new Map(calls.map((call) => [call.id, call.key]));

  return (
    <div className="mini" role="img" aria-label="Preview of the waiting-room board: three counters calling tickets in turn">
      <div className="mini-screen board surface-dark" aria-hidden="true" data-awake="true">
        <div className="mini-head">
          <span className="sign">City Clinic</span>
          <span className="sign">10:42 AM</span>
        </div>
        <PublicLocale>
          <Board counters={desks.map(view)} calling={calling} label="Board preview" />
        </PublicLocale>
      </div>
    </div>
  );
}
