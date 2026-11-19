"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CounterBadge } from "@/components/counter-badge";
import { getCounterTheme } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { formatWait, pace, targetSeconds } from "@/lib/time";
import type { analytics } from "@/features/queue/read-model";
import { useLocale } from "./locale";

type Analytics = Awaited<ReturnType<typeof analytics>>;
type Row = Analytics["counters"][number];

const spring = { type: "spring", stiffness: 90, damping: 22 } as const;

export function LoadChart({ rows }: { rows: Row[] }) {
  const { t, language } = useLocale();
  const reduce = useReducedMotion();
  const max = Math.max(1, ...rows.map((row) => row.issued));
  const number = (value: number) => formatNumber(value, language);
  return (
    <section
      aria-labelledby="load-chart"
      className="surface p-4 sm:p-5 xl:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="load-chart" className="section-heading">
            {t.chartLoad}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t.chartLoadDetail}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-muted">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-slate-700" />
            {t.served}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="chart-stripes size-2.5 rounded-sm bg-slate-400" />
            {t.waiting}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-rose-500" />
            {t.skipped}
          </li>
        </ul>
      </div>
      <ul className="mt-5 grid gap-4">
        {rows.map((row) => {
          const theme = getCounterTheme(row.prefix);
          const rest = Math.max(
            0,
            row.issued - row.served - row.waiting - row.skipped,
          );
          return (
            <li key={row.counterId}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-extrabold">
                  <CounterBadge prefix={row.prefix} size="sm" />
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
                  {number(row.served)} / {number(row.issued)}
                </span>
              </div>
              <div
                role="img"
                aria-label={`${row.name}: ${row.issued} ${t.issued}, ${row.served} ${t.served}, ${row.waiting} ${t.waiting}, ${row.skipped} ${t.skipped}`}
                className="h-3.5 rounded-full bg-slate-900/[0.05]"
              >
                <motion.div
                  className="flex h-full origin-left overflow-hidden rounded-full"
                  style={{ width: `${(100 * row.issued) / max}%` }}
                  initial={{ scaleX: reduce ? 1 : 0 }}
                  animate={{ scaleX: 1 }}
                  transition={reduce ? { duration: 0 } : spring}
                >
                  <span
                    style={{ flexGrow: row.served, backgroundColor: theme.strong }}
                  />
                  <span
                    className="chart-stripes"
                    style={{
                      flexGrow: row.waiting + rest,
                      backgroundColor: theme.hue,
                      opacity: 0.45,
                    }}
                  />
                  <span
                    className="bg-rose-500"
                    style={{ flexGrow: row.skipped }}
                  />
                </motion.div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function EfficiencyPanel({
  rows,
  totals,
}: {
  rows: Row[];
  totals: Analytics["totals"];
}) {
  const { t, language } = useLocale();
  const reduce = useReducedMotion();
  const rate = totals.issued ? totals.served / totals.issued : 0;
  const circumference = 2 * Math.PI * 42;
  const targetMinutes = targetSeconds / 60;
  return (
    <section aria-labelledby="efficiency" className="surface p-4 sm:p-5">
      <h2 id="efficiency" className="section-heading">
        {t.chartEfficiency}
      </h2>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="relative size-28 shrink-0"
          role="img"
          aria-label={`${t.completion}: ${Math.round(rate * 100)}%`}
        >
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="9"
              className="stroke-slate-900/[0.07]"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              stroke="#0D9488"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: reduce ? circumference * (1 - rate) : circumference }}
              animate={{ strokeDashoffset: circumference * (1 - rate) }}
              transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-2xl leading-none font-extrabold tracking-tight tabular-nums">
              {formatNumber(Math.round(rate * 100), language)}%
            </span>
          </div>
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-extrabold">{t.completion}</p>
          <p className="mt-0.5 text-muted tabular-nums">
            {formatNumber(totals.served, language)} /{" "}
            {formatNumber(totals.issued, language)} {t.served.toLowerCase()}
          </p>
        </div>
      </div>
      <p className="mt-5 text-xs font-bold text-muted">{t.vsTarget}</p>
      <ul className="mt-2 grid gap-3">
        {rows.map((row) => {
          const seconds = (row.avgServiceMinutes ?? 0) * 60;
          const { color, ratio } = pace(seconds);
          return (
            <li key={row.counterId}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
                <span className="flex min-w-0 items-center gap-1.5">
                  <CounterBadge prefix={row.prefix} size="sm" />
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatWait(row.avgServiceMinutes, language)}
                </span>
              </div>
              <div
                className="relative h-2 overflow-hidden rounded-full bg-slate-900/[0.06]"
                role="img"
                aria-label={`${row.name}: ${formatWait(row.avgServiceMinutes, language)} / ${formatWait(targetMinutes, language)}`}
              >
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ background: color, width: "100%" }}
                  initial={{ scaleX: reduce ? Math.min(1, ratio) : 0 }}
                  animate={{ scaleX: Math.min(1, ratio) }}
                  transition={reduce ? { duration: 0 } : spring}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
