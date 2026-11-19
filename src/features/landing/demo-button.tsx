"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api } from "@/features/workspace/client";

/** Signs into the shared demo clinic and opens its desk. Works without JS too. */
export function DemoButton({ className = "key key-primary landing-cta" }: { className?: string }) {
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
      const { redirectTo } = await api<{ redirectTo: "/desk" }>("/api/auth/demo", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      window.location.replace(redirectTo);
    } catch {
      locked.current = false;
      setPending(false);
      setError(true);
    }
  }
  return (
    <form action="/api/auth/demo" method="post" onSubmit={submit}>
      <button type="submit" disabled={pending} className={className}>
        {pending ? "Opening…" : "Open live demo"}
        {pending ? (
          <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-(--color-stop)">
          The demo couldn’t open. Try again in a moment.
        </p>
      )}
    </form>
  );
}
