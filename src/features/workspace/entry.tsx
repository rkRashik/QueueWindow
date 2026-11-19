"use client";
import { ArrowRight, ArrowUpRight, Check, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { request } from "@/lib/client";
import { errorText, Header, Number } from "./ui";

function useEntry() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open(input: { mode: "demo" } | { password: string }) {
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
  const { busy, error, open } = useEntry();
  const [called, setCalled] = useState(false);
  return (
    <>
      <Header>
        <Link className="plain" href="/login">
          Staff sign in <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </Header>
      <main id="main" className="entry">
        <section className="entryCopy">
          <h1>
            A little less
            <br />
            waiting around.
          </h1>
          <p>A clear next step. For everyone in line.</p>
          <button
            className="button"
            disabled={busy}
            onClick={() => open({ mode: "demo" })}
          >
            {busy ? "Opening workspace…" : "Try the demo"}
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          {error && (
            <p className="feedback warn" role="alert">
              {error}
            </p>
          )}
        </section>
        <section className="preview" aria-label="Interactive queue preview">
          <div className="previewToolbar">
            <span>
              <span className="dot" /> Live preview
            </span>
            <button
              className="previewTrigger"
              onClick={() => setCalled(!called)}
            >
              {called ? (
                <RotateCcw size={17} aria-hidden="true" />
              ) : (
                <Play size={17} aria-hidden="true" />
              )}
              {called ? "Reset preview" : "Call next"}
            </button>
          </div>
          <div className="previewStage" data-called={called}>
            <div className="previewCall" aria-live="polite">
              <span>{called ? "Now calling" : "In service"}</span>
              <Number value={called ? 25 : 24} />
              <span className="previewCaption">
                {called
                  ? "Please head to Desk 01"
                  : "A smoother rhythm to your day."}
              </span>
            </div>
            <div className="previewPhone" data-called={called}>
              <span className="phoneSpeaker" aria-hidden="true" />
              <span>Your ticket</span>
              <Number value={25} />
              <div key={String(called)} className="phoneStatus">
                {called ? (
                  <Check size={24} aria-hidden="true" />
                ) : (
                  <span className="position">1</span>
                )}
                <strong>{called ? "It’s your turn" : "You’re next"}</strong>
              </div>
              <span>{called ? "Desk 01" : "We’ll update you here"}</span>
            </div>
          </div>
          <div className="previewFooter">
            <div className="previewLine">
              <span>Up next</span>
              <b>{called ? "A026" : "A025"}</b>
              <span>{called ? "A027" : "A026"}</span>
              <span>{called ? "A028" : "A027"}</span>
            </div>
          </div>
        </section>
        <footer className="entryFooter">
          <span>One queue. Everyone connected.</span>
          <div>
            <span>Staff workspace</span>
            <span>Private tickets</span>
            <span>Public display</span>
          </div>
        </footer>
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
        <button
          className="plain"
          disabled={busy}
          onClick={() => open({ mode: "demo" })}
        >
          Try the demo
        </button>
      </main>
    </>
  );
}
