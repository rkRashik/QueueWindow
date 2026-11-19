"use client";
import { ArrowRight, ArrowUpRight, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { request } from "@/lib/client";
import { errorText, Header } from "./ui";

function useEntry() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open(input: { password: string }) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/session", {
        method: "POST",
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(12000),
      });
      router.push("/desk");
    } catch (failure) {
      setError(errorText(failure, "password" in input));
      setBusy(false);
    }
  }
  return { busy, error, open };
}
export function Landing() {
  return (
    <>
      <Header>
        <Link className="plain" href="/login">
          Staff sign in <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </Header>
      <main id="main" className="arrivalHome">
        <section>
          <h1>
            Take a ticket.
            <br />
            Keep your place.
          </h1>
          <p>Scan the QR sign at your venue to join the queue.</p>
          <Link className="button" href="/ticket">
            Find your ticket <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </section>
        <aside lang="bn" className="arrivalSign">
          <Ticket size={32} aria-hidden="true" />
          <strong>টোকেন নিন</strong>
          <p>কাউন্টারের QR কোড স্ক্যান করুন, অথবা কিয়স্ক থেকে টিকিট নিন।</p>
        </aside>
      </main>
    </>
  );
}
export function SignIn() {
  const [visible, setVisible] = useState(false);
  const { busy, error, open } = useEntry();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void open({
      password: String(new FormData(event.currentTarget).get("password")),
    });
  }
  return (
    <>
      <Header />
      <main id="main" className="signIn">
        <span className="loginSymbol" aria-hidden="true">
          <ArrowRight size={32} />
        </span>
        <h1>Welcome back.</h1>
        <p>Your desk is ready.</p>
        <form className="form" onSubmit={submit}>
          <label>
            Password
            <input
              name="password"
              type={visible ? "text" : "password"}
              required
              maxLength={200}
              autoComplete="current-password"
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>
          <button
            className="plain passwordToggle"
            type="button"
            onClick={() => setVisible(!visible)}
          >
            {visible ? "Hide password" : "Show password"}
          </button>
          {error && (
            <p id="login-error" className="feedback warn" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Opening workspace…" : "Sign in"}
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </form>
      </main>
    </>
  );
}
