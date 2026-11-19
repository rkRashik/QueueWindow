"use client";

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
import { useState } from "react";
import type { analytics } from "@/features/queue/read-model";
import { formatNumber } from "@/lib/i18n";
import { BrandingSection, type Branding } from "./branding";
import { useResource } from "./admin-data";
import { AdminHeading, ResourceNotice } from "./admin-ui";
import { CountersSection, TeamSection } from "./admin-operations";
import { LocaleProvider, useLocale } from "./locale";
import { Toast, useToast, WorkspaceHeader, type Workspace } from "./ui";

export const sections = ["overview", "counters", "team", "branding"] as const;
export type AdminSection = (typeof sections)[number];
export type AdminWorkspace = Workspace & Branding;

function Overview() {
  const { t, language } = useLocale();
  const { data, error, reload } = useResource<
    Awaited<ReturnType<typeof analytics>>
  >("/api/admin/analytics");
  const number = (value: number) => formatNumber(value, language);
  const minutes = (value: number | null) =>
    value === null ? "—" : `${number(value)} ${t.minutes}`;

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
            {[
              { label: t.issued, value: data.totals.issued, Icon: Ticket },
              { label: t.served, value: data.totals.served, Icon: CheckCheck },
              {
                label: t.waiting,
                value: data.totals.waiting,
                Icon: ListOrdered,
              },
            ].map(({ label, value, Icon }) => (
              <div className="panel p-4.5 sm:p-5" key={label}>
                <div className="flex items-center justify-between gap-2 text-sm font-bold text-muted">
                  <h2>{label}</h2>
                  <Icon
                    className="size-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-3xl leading-none font-extrabold -tracking-[.04em] tabular-nums">
                  {number(value)}
                </p>
              </div>
            ))}
            <div className="panel p-4.5 sm:p-5">
              <div className="flex items-center justify-between gap-2 text-sm font-bold text-muted">
                <h2>{t.timing}</h2>
                <Clock3
                  className="size-4 shrink-0 text-brand"
                  aria-hidden="true"
                />
              </div>
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
            </div>
          </div>
          <section aria-labelledby="performance" className="panel mt-5">
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
                  {data.counters.map((counter) => (
                    <tr key={counter.counterId}>
                      <td className="font-extrabold">{counter.name}</td>
                      <td>{number(counter.issued)}</td>
                      <td>{number(counter.served)}</td>
                      <td>{number(counter.waiting)}</td>
                      <td>{number(counter.skipped)}</td>
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
              className={`flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold ${id === section ? "bg-indigo-50 text-indigo-800" : "text-muted hover:bg-slate-100 hover:text-ink"}`}
            >
              <Icon className="nav-icon" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <main id="main" className="min-w-0 py-7 sm:py-9">
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
