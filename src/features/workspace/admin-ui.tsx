"use client";

import type { ReactNode } from "react";
import { useLocale } from "./locale";
import { Notice } from "./ui";

export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="page-heading">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ResourceNotice({
  error,
  load,
  loading,
}: {
  error: string;
  load: () => void;
  loading: boolean;
}) {
  const { t, language } = useLocale();
  if (error)
    return (
      <Notice title={language === "en" ? error : t.error} tone="error">
        <button className="btn mt-2" type="button" onClick={load}>
          {t.retry}
        </button>
      </Notice>
    );
  if (loading)
    return (
      <p role="status" className="panel p-6 text-sm text-muted">
        {t.loading}
      </p>
    );
  return null;
}
