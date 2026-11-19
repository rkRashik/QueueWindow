"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";

const fieldClass =
  "block min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
};

function Field({ name, label, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <input id={name} name={name} className={fieldClass} required {...props} />
    </div>
  );
}

export function AccessForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const endpoint = `/api/auth/${mode}`;
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const values = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    setPending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const result = await response.json();
        const message = result.error ?? "Please try again.";
        setError(
          response.status >= 500 && result.requestId
            ? `${message} Reference ${result.requestId}.`
            : message,
        );
        return;
      }
      router.replace("/desk");
      router.refresh();
    } catch {
      setError(
        "Could not reach QueueWindow. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={endpoint}
      method="post"
      className="mt-7 space-y-4"
      onSubmit={submit}
    >
      {signup ? (
        <>
          <Field
            name="orgName"
            label="Organization name"
            autoComplete="organization"
            maxLength={100}
          />
          <Field
            name="fullName"
            label="Full name"
            autoComplete="name"
            maxLength={100}
          />
          <Field
            name="username"
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,31}"
            aria-describedby="username-hint"
          />
          <p id="username-hint" className="-mt-2 text-sm text-muted">
            Use 3–32 letters, numbers, periods, underscores, or hyphens. Start
            with a letter or number.
          </p>
          <Field
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={254}
          />
        </>
      ) : (
        <Field
          name="identifier"
          label="Email or username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
        />
      )}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-bold">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            className={`${fieldClass} pr-22`}
            type={passwordVisible ? "text" : "password"}
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 12 : undefined}
            maxLength={72}
            aria-describedby={signup ? "password-hint" : undefined}
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-1 min-w-17 rounded-sm px-2 text-sm font-bold text-brand hover:underline"
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? "Hide" : "Show"}
            <span className="sr-only"> password</span>
          </button>
        </div>
        {signup && (
          <p id="password-hint" className="mt-1.5 text-sm text-muted">
            Use at least 12 characters.
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="break-words rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark disabled:cursor-wait disabled:bg-brand-dark"
      >
        {signup
          ? pending
            ? "Creating workspace…"
            : "Create workspace"
          : pending
            ? "Signing in…"
            : "Sign in"}
      </button>
    </form>
  );
}
