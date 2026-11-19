"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  CheckCheck,
  Clock3,
  ListOrdered,
  Paintbrush,
  Ticket,
  Users,
  Workflow,
} from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { analytics } from "@/features/queue/read-model";
import { CounterBadge } from "@/components/counter-badge";
import { getCounterTheme, sortCounters } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { formatWait } from "@/lib/time";
import { EfficiencyPanel, LoadChart } from "./admin-charts";
import { BrandingSection, type Branding } from "./branding";
import { useResource } from "./admin-data";
import { AdminHeading, ResourceNotice } from "./admin-ui";
import { CountersSection, TeamSection } from "./admin-operations";
import { LocaleProvider, useLocale } from "./locale";
import { Notice, Toast, useToast, WorkspaceHeader, type Workspace } from "./ui";

export const sections = ["overview", "counters", "team", "branding"] as const;
export type AdminSection = (typeof sections)[number];
export type AdminWorkspace = Workspace & Branding;

function CountUp({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const text = useTransform(motionValue, (latest) =>
    format(Math.round(latest)),
  );
  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [motionValue, reduce, value]);
  return <motion.span>{text}</motion.span>;
}

function Kpi({
  index,
  label,
  tone,
  Icon,
  children,
}: {
  index: number;
  label: string;
  tone: string;
  Icon: typeof Ticket;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="surface relative overflow-hidden p-4.5 sm:p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
        delay: index * 0.06,
      }}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-5 top-0 h-px [mask-image:linear-gradient(90deg,transparent,#000_30%,#000_70%,transparent)] ${tone}`}
      />
      <div className="flex items-center justify-between gap-2 text-sm font-bold text-muted">
        <h2>{label}</h2>
        <span
          className={`grid size-8 place-items-center rounded-lg ring-1 ring-inset ${tone === "bg-teal-400" ? "bg-teal-50 text-teal-700 ring-teal-200/70" : tone === "bg-emerald-400" ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70" : tone === "bg-amber-400" ? "bg-amber-50 text-amber-700 ring-amber-200/70" : "bg-sky-50 text-sky-700 ring-sky-200/70"}`}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
        </span>
      </div>
      {children}
    </motion.div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "amber" | "rose" | "emerald";
  children: ReactNode;
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-900 ring-amber-600/20",
    rose: "bg-rose-50 text-rose-800 ring-rose-600/20",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  }[tone];
  return (
    <span
      className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-extrabold ring-1 ring-inset ${colors}`}
    >
      {children}
    </span>
  );
}

function Overview() {
  const { t, language } = useLocale();
  const { data, error, reload } = useResource<
    Awaited<ReturnType<typeof analytics>>
  >("/api/admin/analytics");
  const number = (value: number) => formatNumber(value, language);
  const minutes = (value: number | null) => formatWait(value, language);
  const rows = sortCounters(data?.counters ?? []);

  return (
    <>
      <AdminHeading title={t.overview} description={t.overviewDetail} />
      <ResourceNotice
        error={error}
        load={() => void reload()}
        loading={!data}
      />
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi index={0} label={t.issued} tone="bg-teal-400" Icon={Ticket}>
              <p className="mt-4 text-3xl leading-none font-extrabold -tracking-[.04em] tabular-nums">
                <CountUp value={data.totals.issued} format={number} />
              </p>
              <p className="mt-3 text-xs font-semibold text-muted">{t.today}</p>
            </Kpi>
            <Kpi
              index={1}
              label={t.served}
              tone="bg-emerald-400"
              Icon={CheckCheck}
            >
              <p className="mt-4 text-3xl leading-none font-extrabold -tracking-[.04em] tabular-nums">
                <CountUp value={data.totals.served} format={number} />
              </p>
              <div
                aria-hidden="true"
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
              >
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-600"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${data.totals.issued ? Math.round((100 * data.totals.served) / data.totals.issued) : 0}%`,
                  }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </Kpi>
            <Kpi
              index={2}
              label={t.waiting}
              tone="bg-amber-400"
              Icon={ListOrdered}
            >
              <p className="mt-4 flex items-center gap-2.5 text-3xl leading-none font-extrabold -tracking-[.04em] tabular-nums">
                <CountUp value={data.totals.waiting} format={number} />
                {data.totals.waiting > 0 && (
                  <span
                    className="live-dot !bg-amber-500"
                    style={{ boxShadow: "0 0 8px 1px rgba(245,158,11,0.7)" }}
                    aria-hidden="true"
                  />
                )}
              </p>
              <p className="mt-3 text-xs font-semibold text-muted">{t.today}</p>
            </Kpi>
            <Kpi index={3} label={t.timing} tone="bg-sky-400" Icon={Clock3}>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-xs font-semibold text-muted">
                    {t.avgWait}
                  </dt>
                  <dd className="mt-1 text-base font-extrabold tabular-nums">
                    {minutes(data.totals.avgWaitMinutes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">
                    {t.avgService}
                  </dt>
                  <dd className="mt-1 text-base font-extrabold tabular-nums">
                    {minutes(data.totals.avgServiceMinutes)}
                  </dd>
                </div>
              </dl>
            </Kpi>
          </div>
          {data.totals.issued > 0 ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-5">
              <LoadChart rows={rows} />
              <div className="xl:col-span-2">
                <EfficiencyPanel rows={rows} totals={data.totals} />
              </div>
            </div>
          ) : (
            <div className="surface mt-5 grid place-items-center gap-2 p-8 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <BarChart3 className="size-5" aria-hidden="true" />
              </span>
              <p className="font-extrabold">{t.noTicketsToday}</p>
              <p className="max-w-[40ch] text-sm text-muted">
                {t.noTicketsTodayDetail}
              </p>
            </div>
          )}
          <section
            aria-labelledby="performance"
            className="surface mt-4 overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-5">
              <h2 id="performance" className="section-heading">
                {t.performance}
              </h2>
              <span className="text-xs font-bold text-muted">{t.today}</span>
            </div>
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-labelledby="performance"
            >
              <table className="data-table min-w-[35rem] tabular-nums">
                <thead>
                  <tr>
                    {[
                      t.counter,
                      t.issued,
                      t.served,
                      t.waiting,
                      t.skipped,
                      t.avgWait,
                      t.avgService,
                    ].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((counter) => (
                    <tr key={counter.counterId}>
                      <td
                        className="font-extrabold"
                        style={{
                          boxShadow: `inset 3px 0 0 ${getCounterTheme(counter.prefix).hue}`,
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <CounterBadge prefix={counter.prefix} size="sm" />
                          {counter.name}
                        </span>
                      </td>
                      <td>{number(counter.issued)}</td>
                      <td>
                        <Pill tone="emerald">{number(counter.served)}</Pill>
                      </td>
                      <td>
                        {counter.waiting ? (
                          <Pill tone="amber">{number(counter.waiting)}</Pill>
                        ) : (
                          number(counter.waiting)
                        )}
                      </td>
                      <td>
                        {counter.skipped ? (
                          <Pill tone="rose">{number(counter.skipped)}</Pill>
                        ) : (
                          number(counter.skipped)
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        {minutes(counter.avgWaitMinutes)}
                      </td>
                      <td className="whitespace-nowrap">
                        {minutes(counter.avgServiceMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.counters.length && (
              <p className="p-5 text-sm text-muted">{t.noCounters}</p>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Admin({
  workspace,
  section,
}: {
  workspace: AdminWorkspace;
  section: AdminSection;
}) {
  const { t } = useLocale();
  const navPill = useId();
  const [branding, setBranding] = useState<Branding>(workspace);
  const toast = useToast();
  const items = [
    { id: "overview", label: t.overview, Icon: BarChart3 },
    { id: "counters", label: t.counters, Icon: Workflow },
    { id: "team", label: t.team, Icon: Users },
    { id: "branding", label: t.branding, Icon: Paintbrush },
  ];
  return (
    <>
      <WorkspaceHeader organization={branding.name} surface="admin" />
      <div className="shell-width grid min-h-[calc(100dvh-4.25rem)] lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <nav
          aria-label={t.adminNavigation}
          className="flex flex-wrap content-start gap-1.5 border-b border-line py-3 lg:flex-col lg:border-e lg:border-b-0 lg:py-8 lg:pe-4"
        >
          <p className="hidden px-3 pb-2 text-xs font-extrabold text-muted lg:block">
            {t.workspace}
          </p>
          {items.map(({ id, label, Icon }) => (
            <Link
              key={id}
              href={id === "overview" ? "/admin" : `/admin?section=${id}`}
              aria-current={id === section ? "page" : undefined}
              className={`relative flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold ${id === section ? "text-teal-800" : "text-muted hover:bg-slate-100 hover:text-ink"}`}
            >
              {id === section && (
                <motion.span
                  layoutId={navPill}
                  className="absolute inset-0 rounded-lg bg-teal-50 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.18),0_1px_2px_rgba(15,118,110,0.08)]"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <Icon className="nav-icon relative" aria-hidden="true" />
              <span className="relative">{label}</span>
            </Link>
          ))}
        </nav>
        <main id="main" className="min-w-0 py-7 sm:py-9">
          {branding.plan === "DEMO" && (
            <div className="mb-5">
              <Notice title={t.liveDemo}>{t.demoReadOnly}</Notice>
            </div>
          )}
          {section === "overview" && <Overview />}
          {section === "counters" && <CountersSection notify={toast.notify} />}
          {section === "team" && <TeamSection notify={toast.notify} />}
          {section === "branding" && (
            <BrandingSection
              branding={branding}
              slug={workspace.slug}
              expiresAt={workspace.expiresAt}
              onSaved={setBranding}
              notify={toast.notify}
            />
          )}
        </main>
      </div>
      <Toast toast={toast} />
    </>
  );
}

export function AdminScreen({
  workspace,
  section,
}: {
  workspace: AdminWorkspace;
  section: AdminSection;
}) {
  return (
    <LocaleProvider>
      <Admin workspace={workspace} section={section} />
    </LocaleProvider>
  );
}
