"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Check, KeyRound, LockKeyhole, Smartphone, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CounterBadge } from "@/components/counter-badge";
import { counterVars, getCounterTheme } from "@/lib/counter-theme";

const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 22 },
  },
};

function Card({
  className = "",
  title,
  text,
  children,
}: {
  className?: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <motion.article
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      className={`bento-card ${className}`}
    >
      <div className="bento-art" aria-hidden="true">
        {children}
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 max-w-[44ch] text-sm leading-relaxed text-muted">
        {text}
      </p>
    </motion.article>
  );
}

/** A repeating tick: undefined timer when motion is reduced. */
function useTick(ms: number) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setTick((value) => value + 1), ms);
    return () => clearInterval(timer);
  }, [ms, reduce]);
  return tick;
}

function CountersArt() {
  const tick = useTick(2200);
  const prefixes = ["A", "B", "C", "D", "E"];
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
      {prefixes.map((prefix, index) => {
        const theme = getCounterTheme(prefix);
        const number = 7 + Math.floor((tick + index * 2) / 3) + index;
        const token = `${prefix}-${String(number % 100).padStart(2, "0")}`;
        return (
          <div
            key={prefix}
            style={counterVars(theme)}
            className="flex items-center gap-2 rounded-xl border bg-(--c-soft) p-2 pe-3"
            data-flash={(tick + index) % 3 === 0}
          >
            <CounterBadge prefix={prefix} index={index + 1} />
            <span className="relative h-6 grow overflow-hidden text-end text-base font-extrabold text-(--c-ink) tabular-nums">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={token}
                  className="block"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                >
                  {token}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PulseArt() {
  return (
    <svg viewBox="0 0 220 96" className="h-full w-full max-w-72">
      <path
        d="M10 48 H60 L72 18 L88 78 L102 34 L112 48 H210"
        fill="none"
        stroke="rgba(15,23,42,0.1)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="pulse-line"
        d="M10 48 H60 L72 18 L88 78 L102 34 L112 48 H210"
        fill="none"
        stroke="#0D9488"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
      />
      {[
        { x: 10, c: "#0D9488" },
        { x: 210, c: "#2563EB" },
      ].map(({ x, c }) => (
        <g key={x}>
          <circle cx={x} cy="48" r="9" fill={c} opacity="0.15" className="pulse-halo" />
          <circle cx={x} cy="48" r="4.5" fill={c} />
        </g>
      ))}
    </svg>
  );
}

function LanguageArt() {
  const tick = useTick(2600);
  const reduce = useReducedMotion();
  const modes = ["EN", "বাংলা", "Both"] as const;
  const active = reduce ? 2 : tick % 3;
  return (
    <div className="grid w-full max-w-60 gap-3">
      <div className="mx-auto inline-flex gap-0.5 rounded-full border bg-white p-0.5">
        {modes.map((mode, index) => (
          <span
            key={mode}
            className="relative rounded-full px-3 py-1 text-xs font-extrabold"
          >
            {index === active && (
              <motion.span
                layoutId="bento-lang"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <span className={`relative ${index === active ? "text-white" : "text-muted"}`}>
              {mode}
            </span>
          </span>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-3 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {active !== 1 && (
              <p className="text-sm font-extrabold">Now serving A-07</p>
            )}
            {active !== 0 && (
              <p
                lang="bn"
                className={`font-extrabold ${active === 2 ? "mt-0.5 text-xs text-muted" : "text-sm"}`}
              >
                এখন ডাকছেন A-07
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function QrArt() {
  // A fixed 9x9 pattern: three finder squares plus pseudo-random modules.
  const cells = Array.from({ length: 81 }, (_, index) => {
    const x = index % 9;
    const y = Math.floor(index / 9);
    const finder = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
    return finder || (x * 7 + y * 13 + x * y) % 3 === 0;
  });
  return (
    <div className="relative flex items-center gap-4">
      <div className="qr-art relative size-28 overflow-hidden rounded-xl border bg-white p-2.5">
        <div className="grid h-full grid-cols-9 gap-px">
          {cells.map((on, index) => (
            <span
              key={index}
              className={on ? "rounded-[1px] bg-ink" : "bg-transparent"}
            />
          ))}
        </div>
        <span className="scan-line" />
      </div>
      <div className="grid size-14 place-items-center rounded-2xl border bg-(--c-soft) text-(--c-ink)" style={counterVars(getCounterTheme("A"))}>
        <Smartphone className="size-6" />
      </div>
    </div>
  );
}

function AccessArt() {
  return (
    <div className="grid w-full max-w-60 gap-2">
      {[
        { role: "Owner", items: "Counters · Team · Branding", c: "#0F172A" },
        { role: "Staff", items: "Call · Complete · Skip", c: "#0D9488" },
      ].map(({ role, items, c }) => (
        <div
          key={role}
          className="flex items-center gap-3 rounded-xl border bg-white p-2.5"
        >
          <span
            className="grid size-9 place-items-center rounded-lg text-white"
            style={{ background: c }}
          >
            <KeyRound className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-extrabold">{role}</span>
            <span className="block text-xs text-muted">{items}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function PrivacyArt() {
  return (
    <div className="flex w-full items-center justify-center gap-5">
      <span className="lock-ring grid size-20 shrink-0 place-items-center rounded-full bg-ink text-white">
        <LockKeyhole className="size-8" />
      </span>
      <ul className="grid w-full max-w-56 gap-2 text-xs font-bold">
        {[
          { label: "Name", ok: false },
          { label: "Phone", ok: false },
          { label: "Account", ok: false },
          { label: "Ticket", ok: true },
        ].map(({ label, ok }) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5"
          >
            <span className="w-14 text-muted">{label}</span>
            {ok ? (
              <span className="font-extrabold tabular-nums">A-07</span>
            ) : (
              <span className="h-2 grow rounded-full bg-slate-200" />
            )}
            {ok ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <X className="size-3.5 text-slate-400" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BentoGrid() {
  return (
    <div className="bento-grid">
      <Card
        className="md:col-span-2"
        title="Every desk has its own colour"
        text="Reception is teal, the doctor is blue. Separate numbers and waiting lists, recognised in half a second on the TV, desk and phone."
      >
        <CountersArt />
      </Card>
      <Card
        title="One call, every screen"
        text="Call a ticket once. The waiting room TV and the visitor’s phone follow instantly."
      >
        <PulseArt />
      </Card>
      <Card
        title="English, বাংলা, or both"
        text="Pure English by default. Switch to Bangla, or show both when you want."
      >
        <LanguageArt />
      </Card>
      <Card
        title="QR, kiosk and print"
        text="Print a sign or run a reception tablet. Visitors scan and join in a tap."
      >
        <QrArt />
      </Card>
      <Card
        title="Owner and staff access"
        text="Owners manage counters and team. Desk staff run the queue."
      >
        <AccessArt />
      </Card>
      <Card
        className="md:col-span-2"
        title="No visitor data collected"
        text="Visitors take a ticket without an account, name or phone number."
      >
        <PrivacyArt />
      </Card>
    </div>
  );
}
