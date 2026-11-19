"use client";

import { ArrowRight, Clock3, Monitor, Smartphone, Ticket } from "lucide-react";
import { useState } from "react";

const samples = ["A-07", "A-08", "A-09", "A-10", "A-11", "A-12"];

export function ProductPreview() {
  const [position, setPosition] = useState(0);
  const active = samples[position];
  const next = samples.slice(position + 1, position + 4);
  const tracked = "A-10";
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="product-heading"
            className="text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            Three screens, one queue
          </h2>
          <p className="mt-2 text-sm text-muted">
            Call the next sample ticket to see every screen update.
          </p>
        </div>
        <button
          type="button"
          className="btn min-h-12"
          onClick={() => setPosition((value) => (value + 1) % samples.length)}
        >
          {position === samples.length - 1
            ? "Reset sample"
            : "Call next in preview"}
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <div className="preview-grid">
        <article className="preview-staff">
          <h3 className="preview-card-header">
            <Ticket aria-hidden="true" />
            Staff desk
          </h3>
          <div className="preview-staff-body">
            <div className="preview-active">
              <p className="text-xs font-bold text-emerald-900">Now serving</p>
              <p
                className="text-5xl font-extrabold tracking-tight text-emerald-950 tabular-nums"
                aria-live="polite"
              >
                {active}
              </p>
            </div>
            <div className="px-1">
              <p className="mb-2 text-xs font-bold text-muted">Waiting</p>
              <ol className="divide-y divide-line">
                {next.length ? (
                  next.map((token) => (
                    <li
                      key={token}
                      className="py-2 text-sm font-bold tabular-nums"
                    >
                      {token}
                    </li>
                  ))
                ) : (
                  <li className="py-2 text-sm text-muted">
                    No tickets waiting
                  </li>
                )}
              </ol>
            </div>
          </div>
        </article>
        <article className="preview-tv">
          <h3 className="preview-card-header">
            <Monitor aria-hidden="true" />
            Waiting room TV
          </h3>
          <div className="preview-tv-body">
            <div>
              <p className="text-xs font-bold text-slate-300">
                <span lang="bn">এখন ডাকছেন</span>
                <span aria-hidden="true"> · </span>NOW SERVING
              </p>
              <p className="mt-2 text-5xl font-extrabold tracking-tight text-emerald-400 tabular-nums">
                {active}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">
                <span lang="bn">পরবর্তী</span>
                <span aria-hidden="true"> · </span>UP NEXT
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums">
                {next.join(" · ") || "—"}
              </p>
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
            <p className="text-4xl font-extrabold tracking-tight tabular-nums">
              {tracked}
            </p>
            <p
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold ${position === 3 ? "bg-emerald-100 text-emerald-950" : "bg-indigo-50 text-indigo-950"}`}
            >
              <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
              {visitorState}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
