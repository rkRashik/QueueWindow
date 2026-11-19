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
    <div className="admin-heading">
      <div className="min-w-0">
        <h1 className="sign admin-title">{title}</h1>
        <p className="muted mt-1">{description}</p>
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
        <button className="key key-sm mt-2" type="button" onClick={load}>
          {t.retry}
        </button>
      </Notice>
    );
  if (loading)
    return (
      <p role="status" className="muted py-6">
        {t.loading}
      </p>
    );
  return null;
}
