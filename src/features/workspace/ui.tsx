"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleCheck,
  Clipboard,
  Layers2,
  LogOut,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { LanguageSwitch, useLocale } from "./locale";

export type Workspace = {
  demo?: boolean;
  name: string;
  slug: string;
  role: "OWNER" | "STAFF";
  expiresAt: string;
};

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex w-fit shrink-0 items-center gap-2.5 font-extrabold tracking-tight"
      translate="no"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-linear-to-b from-indigo-500 to-indigo-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_6px_-1px_rgba(79,70,229,0.5)]">
        <Layers2 aria-hidden="true" className="size-[18px]" strokeWidth={2.4} />
      </span>
      QueueWindow
    </Link>
  );
}

export function WorkspaceHeader({
  organization,
  surface,
  children,
}: {
  organization: string;
  surface: "desk" | "admin";
  children?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <header className="eyeline sticky top-0 z-20 bg-white/85 backdrop-blur-xl">
      <div className="shell-width flex min-h-17 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <Wordmark />
          <span
            className="hidden h-5 border-s border-line sm:block"
            aria-hidden="true"
          />
          <span
            className="max-w-[16ch] truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 sm:max-w-[24ch]"
            title={organization}
          >
            {organization}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {surface === "admin" && (
            <Link className="btn btn-quiet" href="/desk">
              <ArrowLeft aria-hidden="true" />
              {t.desk}
            </Link>
          )}
          <LanguageSwitch />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-quiet whitespace-nowrap">
              <LogOut aria-hidden="true" />
              {t.logout}
            </button>
          </form>
        </div>
      </div>
      {children && (
        <div className="border-t border-slate-100">
          <div className="shell-width">{children}</div>
        </div>
      )}
    </header>
  );
}

export function StatusPill({ status }: { status: "OPEN" | "PAUSED" }) {
  const { t } = useLocale();
  return (
    <span
      className={`status-pill ${status === "OPEN" ? "status-open" : "status-paused"}`}
    >
      {status === "OPEN" ? t.open : t.paused}
    </span>
  );
}

export function InputField({
  label,
  name,
  help,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  help?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        {...props}
        id={id}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [help && `${id}-help`, error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {help && (
        <p id={`${id}-help`} className="field-help">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Notice({
  title,
  children,
  tone = "warning",
}: {
  title: string;
  children?: ReactNode;
  tone?: "warning" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 break-words text-sm">
        <p className="font-extrabold">{title}</p>
        {children && <div className="mt-0.5">{children}</div>}
      </div>
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismiss = useCallback(() => {
    clearTimeout(timeout.current);
    setMessage(null);
  }, []);
  const notify = useCallback((text: string, error = false) => {
    clearTimeout(timeout.current);
    setMessage({ text, error });
    timeout.current = setTimeout(() => setMessage(null), error ? 8_000 : 4_000);
  }, []);
  useEffect(() => () => clearTimeout(timeout.current), []);
  return { message, notify, dismiss };
}

export function Toast({ toast }: { toast: ReturnType<typeof useToast> }) {
  const { t } = useLocale();
  return (
    <div className="fixed right-4 bottom-4 z-30 sm:right-7 sm:bottom-6">
      <div role="status" aria-atomic="true">
        {toast.message && (
          <div className="toast">
            {toast.message.error ? (
              <AlertCircle
                className="size-4 shrink-0 text-rose-700"
                aria-hidden="true"
              />
            ) : (
              <CircleCheck
                className="size-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 break-words">{toast.message.text}</span>
            <button
              type="button"
              className="btn btn-quiet min-h-8 px-2"
              aria-label={t.dismiss}
              onClick={toast.dismiss}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  busy,
  children,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const heading = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const { t } = useLocale();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="eyeline flex items-center justify-between gap-4 px-5 py-3">
        <h2 id={heading} className="section-heading">
          {title}
        </h2>
        <button
          type="button"
          className="btn btn-quiet px-2.5"
          aria-label={t.close}
          disabled={busy}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  notify,
}: {
  value: () => string;
  label: string;
  copiedLabel?: string;
  notify: ReturnType<typeof useToast>["notify"];
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value());
          setCopied(true);
          notify(copiedLabel ?? t.copied);
        } catch {
          notify(t.copyError, true);
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
      {label}
    </button>
  );
}
