"use client";

import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/features/workspace/client";

export function DemoButton({
  compact = false,
  children,
}: {
  compact?: boolean;
  children?: ReactNode;
}) {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError(false);
    try {
      const { redirectTo } = await api<{ redirectTo: "/desk" }>(
        "/api/auth/demo",
        {
          method: "POST",
          headers: { Accept: "application/json" },
        },
      );
      window.location.replace(redirectTo);
    } catch {
      locked.current = false;
      setPending(false);
      setError(true);
    }
  }
  return (
    <form action="/api/auth/demo" method="post" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={`btn ${compact ? "btn-quiet" : "btn-primary min-h-13 px-3 sm:px-5"}`}
        >
          {pending ? "Opening…" : "Try Live Demo"}
          {pending ? (
            <LoaderCircle
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : (
            <ArrowUpRight aria-hidden="true" />
          )}
        </button>
        {children}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-2 max-w-xs text-sm font-semibold text-rose-800"
        >
          The demo couldn’t open. Try again in a moment.
        </p>
      )}
    </form>
  );
}
