"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock3, Monitor, Smartphone, Ticket } from "lucide-react";
import { useState } from "react";

const samples = ["A-07", "A-08", "A-09", "A-10", "A-11", "A-12"];
const slot = {
  type: "spring",
  stiffness: 380,
  damping: 26,
  mass: 0.8,
} as const;

export function ProductPreview() {
  const [position, setPosition] = useState(0);
  const active = samples[position];
  const next = samples.slice(position + 1, position + 4);
  const tracked = samples[3];
  const turn = position === 3;
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
        className="text-xl font-extrabold tracking-tight sm:text-2xl"
      >
        Three screens, one queue
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        Call a sample ticket to see every screen update.
      </p>

      <div className="preview-grid mt-5">
        <article className="preview-tv">
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
              <div>
                <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs font-bold text-slate-300">
                  <span lang="bn" className="text-sm">
                    এখন ডাকছেন
                  </span>
                  <span aria-hidden="true">·</span>
                  Now serving
                </p>
                <div className="preview-number">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span
                      key={active}
                      className="block"
                      initial={{ opacity: 0, y: 36, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{
                        opacity: 0,
                        y: -36,
                        scale: 0.94,
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
                <span lang="bn">পরবর্তী</span>
                <span aria-hidden="true">·</span>
                <span>Up next</span>
                <ol className="ms-1 flex items-center gap-1.5">
                  <AnimatePresence initial={false} mode="popLayout">
                    {(next.length ? next : ["—"]).map((token) => (
                      <motion.li
                        layout
                        key={token}
                        className="rounded-full border border-white/10 bg-white/[0.07] px-2 py-0.5 font-bold text-slate-100 tabular-nums"
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
            </div>
          </div>
        </article>

        <article className="preview-visitor">
          <h3 className="preview-card-header">
            <Smartphone aria-hidden="true" />
            Visitor mobile
          </h3>
          <div className="preview-visitor-body">
            <p className="text-xs font-bold text-muted">Your ticket</p>
            <div className="relative grid place-items-center">
              {turn && (
                <motion.span
                  key="pulse"
                  aria-hidden="true"
                  className="absolute -inset-x-3 -inset-y-1 rounded-2xl border-2 border-emerald-500"
                  initial={{ opacity: 0.8, scale: 0.9 }}
                  animate={{ opacity: 0, scale: 1.25 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              )}
              <p className="relative text-4xl leading-none font-extrabold -tracking-[.04em] tabular-nums">
                {tracked}
              </p>
            </div>
            <p
              className={`mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold transition-colors duration-300 ${turn ? "bg-emerald-100 text-emerald-950" : "bg-indigo-50 text-indigo-950"}`}
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
              className="mt-1 h-1 w-3/4 overflow-hidden rounded-full bg-slate-200"
            >
              <motion.div
                className={`h-full rounded-full ${turn ? "bg-emerald-600" : "bg-indigo-700"}`}
                initial={false}
                animate={{ width: `${Math.min(100, (position / 3) * 100)}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </article>
      </div>

      <article className="preview-staff">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-extrabold">
            <Ticket className="size-3.5 text-brand" aria-hidden="true" />
            Staff desk
          </h3>
          <p
            className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs font-semibold text-muted"
            aria-live="polite"
          >
            <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 font-extrabold text-emerald-900 tabular-nums">
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
          className="btn btn-primary w-fit"
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          onClick={() => setPosition((value) => (value + 1) % samples.length)}
        >
          {position === samples.length - 1
            ? "Reset sample"
            : "Call next in preview"}
          <ArrowRight aria-hidden="true" />
        </motion.button>
      </article>
    </motion.section>
  );
}
