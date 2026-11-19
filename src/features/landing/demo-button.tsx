"use client";

import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api } from "@/features/workspace/client";

export function DemoButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
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
      await api("/api/auth/demo", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      router.replace("/desk");
      router.refresh();
    } catch {
      locked.current = false;
      setPending(false);
      setError(true);
    }
  }
  return (
    <form action="/api/auth/demo" method="post" onSubmit={submit}>
      <button
        type="submit"
        disabled={pending}
        className={`btn ${compact ? "btn-quiet" : "btn-primary min-h-13 px-5"}`}
      >
        {pending ? "Opening demo…" : "Try Live Demo"}
        {pending ? (
          <LoaderCircle
            aria-hidden="true"
            className="motion-safe:animate-spin"
          />
        ) : (
          <ArrowUpRight aria-hidden="true" />
        )}
      </button>
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
