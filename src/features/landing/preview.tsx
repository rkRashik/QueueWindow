"use client";

import { ArrowRight, Clock3, Monitor, Smartphone, Ticket } from "lucide-react";
import { useState } from "react";

const samples = ["A-07", "A-08", "A-09", "A-10", "A-11", "A-12"];

export function ProductPreview() {
  const [position, setPosition] = useState(0);
  const active = samples[position];
  const next = samples.slice(position + 1, position + 4);
  const tracked = samples[3];
  const visitorState =
    position === 3
      ? "It’s your turn"
      : position > 3
        ? "Service complete"
        : `${3 - position} ahead of you`;

  return (
    <section
      id="product"
      aria-labelledby="product-heading"
      className="landing-preview"
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
          <h3 className="preview-card-header">
            <Monitor aria-hidden="true" />
            Waiting room TV
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
              <p className="mt-1 text-5xl leading-none font-extrabold -tracking-[.045em] text-emerald-300 tabular-nums sm:text-6xl">
                <span key={active} className="preview-update">
                  {active}
                </span>
              </p>
            </div>
            <p className="min-h-5 text-xs text-slate-300">
              <span lang="bn">পরবর্তী</span>
              <span aria-hidden="true"> · </span>
              <span>Up next</span>
              <span
                key={active}
                className="preview-update ml-2 font-bold text-slate-100 tabular-nums"
              >
                {next.join(" · ") || "—"}
              </span>
            </p>
          </div>
        </article>

        <article className="preview-visitor">
          <h3 className="preview-card-header">
            <Smartphone aria-hidden="true" />
            Visitor mobile
          </h3>
          <div className="preview-visitor-body">
            <p className="text-xs font-bold text-muted">Your ticket</p>
            <p className="text-4xl leading-none font-extrabold -tracking-[.04em] tabular-nums">
              {tracked}
            </p>
            <p
              className={`mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold transition-colors ${position === 3 ? "bg-emerald-100 text-emerald-950" : "bg-indigo-50 text-indigo-950"}`}
            >
              <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
              <span key={visitorState} className="preview-update">
                {visitorState}
              </span>
            </p>
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
            <span key={active} className="preview-update tabular-nums">
              {next.length
                ? `Waiting: ${next.join(" · ")}`
                : "No tickets waiting"}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="btn w-fit"
          onClick={() => setPosition((value) => (value + 1) % samples.length)}
        >
          {position === samples.length - 1
            ? "Reset sample"
            : "Call next in preview"}
          <ArrowRight aria-hidden="true" />
        </button>
      </article>
    </section>
  );
}
