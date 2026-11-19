"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, Clipboard, LogOut, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Wordmark } from "@/components/brand";
import { LanguageSwitch, useLocale } from "./locale";

export type Workspace = {
  demo?: boolean;
  name: string;
  slug: string;
  role: "OWNER" | "STAFF";
  expiresAt: string;
};

export { Wordmark };

export function WorkspaceHeader({
  organization,
  children,
}: {
  organization: string;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <header className="ws-head">
      <div className="ws-head-row">
        <Wordmark href="/desk" />
        <span className="ws-org" title={organization}>
          {organization}
        </span>
        <div className="ms-auto flex items-center gap-1.5">
          <Link className="key key-quiet key-sm" href="/desk">
            <ArrowLeft aria-hidden="true" />
            {t.desk}
          </Link>
          <LanguageSwitch />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="key key-quiet key-sm">
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">{t.logout}</span>
              <span className="sr-only sm:hidden">{t.logout}</span>
            </button>
          </form>
        </div>
      </div>
      {children}
    </header>
  );
}

export function StatusPill({ status }: { status: "OPEN" | "PAUSED" }) {
  const { t } = useLocale();
  return (
    <span className="state" data-state={status}>
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
          [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined
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
    <div role={tone === "error" ? "alert" : "status"} className="notice" data-tone={tone}>
      <AlertCircle aria-hidden="true" />
      <div className="min-w-0 break-words">
        <p className="font-bold">{title}</p>
        {children && <div className="muted mt-0.5">{children}</div>}
      </div>
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<{ text: string; error: boolean; id: number } | null>(
    null,
  );
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismiss = useCallback(() => {
    clearTimeout(timeout.current);
    setMessage(null);
  }, []);
  const notify = useCallback((text: string, error = false) => {
    clearTimeout(timeout.current);
    setMessage((previous) => ({ text, error, id: (previous?.id ?? 0) + 1 }));
    timeout.current = setTimeout(() => setMessage(null), error ? 8_000 : 3_000);
  }, []);
  useEffect(() => () => clearTimeout(timeout.current), []);
  return { message, notify, dismiss };
}

export function Toast({ toast }: { toast: ReturnType<typeof useToast> }) {
  const { t } = useLocale();
  return (
    <div className="toast-dock">
      <div role="status" aria-atomic="true">
        {toast.message && (
          <div key={toast.message.id} className="toast" data-error={toast.message.error}>
            <span className="min-w-0 break-words">{toast.message.text}</span>
            <button
              type="button"
              className="key"
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
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
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
      <div className="dialog-head">
        <h2 id={heading} className="sign text-xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          className="key key-quiet key-icon"
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
      className="key"
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
