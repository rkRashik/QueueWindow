"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock3,
  Monitor,
  Smartphone,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import { CounterBadge } from "@/components/counter-badge";
import { counterVars, getCounterTheme } from "@/lib/counter-theme";

const samples = ["A-07", "A-08", "A-09", "A-10", "A-11", "A-12"];
const slot = {
  type: "spring",
  stiffness: 380,
  damping: 26,
  mass: 0.8,
} as const;
const teal = getCounterTheme("A");

export function ProductPreview() {
  const [position, setPosition] = useState(0);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Depth parallax: the screens drift apart at different speeds while scrolling.
  const tvY = useTransform(scrollY, [0, 420], reduce ? [0, 0] : [0, -26]);
  const phoneY = useTransform(scrollY, [0, 420], reduce ? [0, 0] : [0, -64]);
  const deskY = useTransform(scrollY, [0, 420], reduce ? [0, 0] : [0, 14]);

  const active = samples[position];
  const next = samples.slice(position + 1, position + 4);
  const tracked = samples[3];
  const turn = position === 3;
  const progress = Math.min(1, position / 3);
  const visitorState = turn
    ? "It’s your turn"
    : position > 3
      ? "Service complete"
      : `${3 - position} ahead of you`;

  return (
    <motion.section
      id="product"
      aria-labelledby="product-heading"
      className="landing-preview"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 140, damping: 22, delay: 0.25 }}
    >
      <h2
        id="product-heading"
        className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
      >
        Three screens, one queue
      </h2>
      <p className="mt-1 text-sm text-muted">
        Call a sample ticket to see every screen update.
      </p>

      <div className="preview-grid mt-5">
        <motion.article className="preview-tv" style={{ y: tvY }}>
          <div className="preview-screen">
            <h3 className="preview-card-header">
              <Monitor aria-hidden="true" />
              Waiting room TV
              <span
                className="ms-auto inline-flex items-center gap-1.5 text-[0.65rem] tracking-wider text-emerald-300"
                aria-hidden="true"
              >
                <span className="live-dot" />
                LIVE
              </span>
            </h3>
            <div className="preview-tv-body">
              <div style={counterVars(teal)}>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <CounterBadge prefix="A" index={1} size="sm" />
                  Now serving
                </div>
                <div className="preview-number">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span
                      key={active}
                      className="block"
                      initial={{ opacity: 0, y: 36, rotateX: -50 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      exit={{
                        opacity: 0,
                        y: -36,
                        rotateX: 50,
                        transition: { duration: 0.1 },
                      }}
                      transition={slot}
                    >
                      {active}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex min-h-7 items-center gap-1.5 text-xs text-slate-300">
                <span>Up next</span>
                <ol className="ms-1 flex items-center gap-1.5">
                  <AnimatePresence initial={false} mode="popLayout">
                    {(next.length ? next : ["—"]).map((token) => (
                      <motion.li
                        layout
                        key={token}
                        className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2 py-0.5 font-bold text-teal-50 tabular-nums"
                        initial={{ opacity: 0, scale: 0.8, x: 12 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -12 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 30,
                        }}
                      >
                        {token}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              </div>
              <div
                className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1.5 text-xs"
                style={counterVars(getCounterTheme("B"))}
              >
                <CounterBadge prefix="B" index={2} size="sm" />
                <span className="font-bold text-slate-200">Dr. Rahman</span>
                <span className="ms-auto font-extrabold text-(--c-accent) tabular-nums">
                  B-0{2 + Math.min(position, 3)}
                </span>
              </div>
            </div>
          </div>
        </motion.article>

        <motion.article
          className="preview-visitor"
          style={{ y: phoneY, ...counterVars(teal) }}
        >
          <h3 className="preview-card-header">
            <Smartphone aria-hidden="true" />
            Visitor mobile
          </h3>
          <div className="preview-visitor-body">
            <div className="relative grid size-[5.6rem] place-items-center">
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className="absolute inset-0 -rotate-90"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  strokeWidth="6"
                  className="stroke-slate-200"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={turn ? "stroke-emerald-600" : "stroke-(--c-hue)"}
                  initial={false}
                  animate={{ pathLength: Math.max(0.05, progress) }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </svg>
              {turn && (
                <motion.span
                  key="pulse"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-emerald-500"
                  initial={{ opacity: 0.8, scale: 0.9 }}
                  animate={{ opacity: 0, scale: 1.3 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              )}
              <p className="relative text-lg leading-none font-extrabold -tracking-[.03em] text-(--c-ink) tabular-nums">
                {tracked}
              </p>
            </div>
            <p
              className={`mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold transition-colors duration-300 ${turn ? "bg-emerald-100 text-emerald-950" : "bg-(--c-soft) text-(--c-ink)"}`}
            >
              <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
              <motion.span
                key={visitorState}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={slot}
              >
                {visitorState}
              </motion.span>
            </p>
            <div
              aria-hidden="true"
              className="mt-1 flex w-full items-center justify-between px-1"
            >
              {[0, 1, 2].map((step) => {
                const done = progress * 2 >= step;
                return (
                  <span
                    key={step}
                    className={`grid size-3.5 place-items-center rounded-full transition-colors duration-300 ${done ? (turn ? "bg-emerald-600" : "bg-(--c-hue)") : "bg-slate-200"}`}
                  >
                    {done && <Check className="size-2.5 text-white" strokeWidth={3} />}
                  </span>
                );
              })}
            </div>
          </div>
        </motion.article>
      </div>

      <motion.article className="preview-staff" style={{ y: deskY }}>
        <div>
          <h3 className="flex items-center gap-2 text-xs font-extrabold">
            <Ticket className="size-3.5 text-brand" aria-hidden="true" />
            Staff desk
            <span className="flex gap-1">
              <CounterBadge prefix="A" size="sm" />
              <CounterBadge prefix="B" size="sm" className="opacity-45" />
            </span>
          </h3>
          <p
            className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs font-semibold text-muted"
            aria-live="polite"
          >
            <span className="rounded-sm bg-teal-100 px-1.5 py-0.5 font-extrabold text-teal-900 tabular-nums">
              <span className="sr-only">Now serving </span>
              {active}
            </span>
            <span className="tabular-nums">
              {next.length
                ? `Waiting: ${next.join(" · ")}`
                : "No tickets waiting"}
            </span>
          </p>
        </div>
        <motion.button
          type="button"
          className="btn btn-counter w-fit"
          style={counterVars(teal)}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          onClick={() => setPosition((value) => (value + 1) % samples.length)}
        >
          {position === samples.length - 1
            ? "Reset sample"
            : "Call next in preview"}
          <ArrowRight aria-hidden="true" />
        </motion.button>
      </motion.article>
    </motion.section>
  );
}
