"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { InputField } from "@/features/workspace/ui";
import { api, ApiError, jsonRequest } from "@/features/workspace/client";
import { loginInput, signupInput } from "./validation";

const labels: Record<string, string> = {
  orgName: "Enter an organization name.",
  fullName: "Enter your full name.",
  identifier: "Enter a valid email or username.",
  email: "Enter a valid email address.",
};

export function AccessForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const endpoint = `/api/auth/${mode}`;
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const result = (signup ? signupInput : loginInput).safeParse(values);
    setError("");
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        next[key] ??=
          labels[key] ??
          (key === "password"
            ? signup
              ? "Use at least 12 characters and no more than 72 bytes."
              : "Enter your password."
            : issue.message);
      }
      setFields(next);
      const first = Object.keys(next)[0];
      requestAnimationFrame(() => {
        const field = form.elements.namedItem(first);
        if (field instanceof HTMLElement) field.focus();
      });
      return;
    }
    setFields({});
    inFlight.current = true;
    setPending(true);
    try {
      await api(endpoint, jsonRequest("POST", result.data));
      router.replace("/desk");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : "Could not reach QueueWindow. Check your connection and try again.",
      );
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form
      action={endpoint}
      method="post"
      noValidate
      className="mt-6 space-y-3.5"
      onSubmit={submit}
    >
      {signup ? (
        <>
          <InputField
            name="orgName"
            label="Organization name"
            autoComplete="organization"
            maxLength={100}
            required
            error={fields.orgName}
          />
          <InputField
            name="fullName"
            label="Full name"
            autoComplete="name"
            maxLength={100}
            required
            error={fields.fullName}
          />
          <InputField
            name="username"
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            required
            help="Use 3–32 letters, numbers, periods, underscores, or hyphens."
            error={fields.username}
          />
          <InputField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={254}
            required
            error={fields.email}
          />
        </>
      ) : (
        <InputField
          name="identifier"
          label="Email or username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          required
          error={fields.identifier}
        />
      )}
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            className="field pe-16"
            type={passwordVisible ? "text" : "password"}
            autoComplete={signup ? "new-password" : "current-password"}
            maxLength={72}
            required
            aria-invalid={fields.password ? true : undefined}
            aria-describedby={
              [signup && "password-hint", fields.password && "password-error"]
                .filter(Boolean)
                .join(" ") || undefined
            }
          />
          <button
            type="button"
            className="absolute inset-y-1 end-1 grid w-11 place-items-center rounded-md text-muted hover:bg-slate-100 hover:text-ink"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {signup && (
          <p id="password-hint" className="field-help">
            Use at least 12 characters.
          </p>
        )}
        {fields.password && (
          <p className="field-error" id="password-error">
            {fields.password}
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary mt-2 min-h-12 w-full"
      >
        {pending ? (
          <LoaderCircle
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
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
