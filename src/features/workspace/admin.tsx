"use client";

import Link from "next/link";
import { useState } from "react";
import type { analytics } from "@/features/queue/read-model";
import { Plate } from "@/components/plate";
import { sortCounters } from "@/lib/counter-theme";
import { formatNumber } from "@/lib/i18n";
import { formatDay, formatWait, pace, targetSeconds } from "@/lib/time";
import { BrandingSection, type Branding } from "./branding";
import { useResource } from "./admin-data";
import { AdminHeading, ResourceNotice } from "./admin-ui";
import { CountersSection, TeamSection } from "./admin-operations";
import { LocaleProvider, useLocale } from "./locale";
import { Notice, Toast, useToast, WorkspaceHeader, type Workspace } from "./ui";

export const sections = ["overview", "counters", "team", "branding"] as const;
export type AdminSection = (typeof sections)[number];
export type AdminWorkspace = Workspace & Branding;
type Analytics = Awaited<ReturnType<typeof analytics>>;

/** Served / waiting / skipped as one segmented bar: proportions, not decoration. */
function Outcome({ row }: { row: Analytics["counters"][number] }) {
  const { t, language } = useLocale();
  const total = Math.max(row.issued, 1);
  const parts = [
    ["served", row.served],
    ["waiting", row.waiting],
    ["skipped", row.skipped],
  ] as const;
  return (
    <div
      className="outcome"
      role="img"
      aria-label={`${t.served} ${row.served}, ${t.waiting} ${row.waiting}, ${t.skipped} ${row.skipped}`}
    >
      <div className="outcome-bar">
        {parts.map(([kind, value]) =>
          value ? (
            <span key={kind} data-kind={kind} style={{ width: `${(100 * value) / total}%` }} />
          ) : null,
        )}
      </div>
      <span className="outcome-key num">
        {formatNumber(row.served, language)} · {formatNumber(row.waiting, language)} ·{" "}
        {formatNumber(row.skipped, language)}
      </span>
    </div>
  );
}

function Overview() {
  const { t, language } = useLocale();
  const { data, error, reload } = useResource<Analytics>("/api/admin/analytics");
  const number = (value: number) => formatNumber(value, language);
  const minutes = (value: number | null) => formatWait(value, language);
  const rows = sortCounters(data?.counters ?? []);
  const target = targetSeconds / 60;
  return (
    <>
      <AdminHeading title={t.overview} description={`${formatDay(new Date(), language)} · ${t.today}`} />
      <ResourceNotice error={error} load={() => void reload()} loading={!data} />
      {data && (
        <>
          <dl className="figures">
            {(
              [
                [t.issued, number(data.totals.issued)],
                [t.served, number(data.totals.served)],
                [t.waiting, number(data.totals.waiting)],
                [t.avgWait, minutes(data.totals.avgWaitMinutes)],
                [t.avgService, minutes(data.totals.avgServiceMinutes)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="sign">{value}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="performance" className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="performance" className="admin-sub mb-0">
                {t.performance}
              </h2>
              <p className="legend">
                <span data-kind="served">{t.served}</span>
                <span data-kind="waiting">{t.waiting}</span>
                <span data-kind="skipped">{t.skipped}</span>
              </p>
            </div>
            <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="performance">
              <table className="ledger min-w-[40rem]">
                <thead>
                  <tr>
                    <th scope="col">{t.counter}</th>
                    <th scope="col" className="text-end">
                      {t.issued}
                    </th>
                    <th scope="col" className="w-[34%]">
                      {t.served} · {t.waiting} · {t.skipped}
                    </th>
                    <th scope="col" className="text-end">
                      {t.avgWait}
                    </th>
                    <th scope="col">{t.vsTarget}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const service = row.avgServiceMinutes;
                    return (
                      <tr key={row.counterId}>
                        <td>
                          <span className="flex items-center gap-2.5 font-bold">
                            <Plate prefix={row.prefix} className="text-xl" />
                            {row.name}
                          </span>
                        </td>
                        <td className="sign text-end text-xl font-semibold">{number(row.issued)}</td>
                        <td>{row.issued ? <Outcome row={row} /> : <span className="muted">—</span>}</td>
                        <td className="num text-end whitespace-nowrap">{minutes(row.avgWaitMinutes)}</td>
                        <td>
                          <div
                            className="versus"
                            data-level={service === null ? undefined : pace(service * 60).level}
                          >
                            <span className="versus-bar" aria-hidden="true">
                              <span style={{ width: `${Math.min(1, (service ?? 0) / (target * 1.5)) * 100}%` }} />
                            </span>
                            <span className="num whitespace-nowrap">{minutes(service)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!data.counters.length && (
              <p className="muted py-6">
                {t.noCounters}.{" "}
                <Link className="font-bold underline" href="/admin?section=counters">
                  {t.newCounter}
                </Link>
              </p>
            )}
            {data.counters.length > 0 && data.totals.issued === 0 && (
              <p className="muted py-4">{t.noTicketsTodayDetail}</p>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Admin({ workspace, section }: { workspace: AdminWorkspace; section: AdminSection }) {
  const { t } = useLocale();
  const [branding, setBranding] = useState<Branding>(workspace);
  const toast = useToast();
  const items = [
    { id: "overview", label: t.overview },
    { id: "counters", label: t.counters },
    { id: "team", label: t.team },
    { id: "branding", label: t.branding },
  ];
  return (
    <div className="admin">
      <WorkspaceHeader organization={branding} />
      <div className="admin-body">
        <nav aria-label={t.adminNavigation} className="admin-index">
          {items.map(({ id, label }) => (
            <Link
              key={id}
              href={id === "overview" ? "/admin" : `/admin?section=${id}`}
              aria-current={id === section ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main id="main" className="admin-main">
          {branding.plan === "DEMO" && section !== "branding" && (
            <div className="mb-6">
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
    </div>
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
