import Link from "next/link";
import { ArrowRight, CircleCheck, Layers2 } from "lucide-react";
import { AccessForm } from "./access-form";

export function AccessPage({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  return (
    <main
      id="main"
      className="grid min-h-dvh bg-white md:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]"
    >
      <aside className="flex flex-col justify-between gap-14 bg-ink px-6 py-5 text-white md:px-10 md:py-9 lg:px-14 xl:px-18">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 rounded-md font-extrabold tracking-tight focus-visible:outline-white"
          translate="no"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
            <Layers2
              className="size-[18px]"
              aria-hidden="true"
              strokeWidth={2.4}
            />
          </span>
          QueueWindow
        </Link>
        <div className="hidden max-w-[30rem] md:block">
          <p className="text-[clamp(2.4rem,4vw,4rem)] leading-[1.1] font-extrabold -tracking-[.04em] text-balance">
            A clearer next step for everyone in line.
          </p>
          <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-slate-300">
            Issue tickets, call the next visitor, and keep service moving across
            counters.
          </p>
          <div
            aria-hidden="true"
            className="mt-9 grid max-w-44 grid-cols-[2fr_1fr_1fr] gap-2"
          >
            <span className="h-1 rounded-full bg-indigo-300" />
            <span className="h-1 rounded-full bg-slate-600" />
            <span className="h-1 rounded-full bg-slate-700" />
          </div>
        </div>
        {signup && (
          <p className="hidden items-center gap-2 text-sm font-semibold text-slate-300 md:flex">
            <CircleCheck
              className="size-4 text-indigo-200"
              aria-hidden="true"
            />
            14-day trial
          </p>
        )}
      </aside>
      <section
        aria-labelledby="access-title"
        className="flex items-center px-6 py-9 sm:px-12 md:py-10"
      >
        <div className="mx-auto w-full max-w-md">
          <h1 id="access-title" className="page-heading text-balance">
            {signup ? "Create your workspace" : "Sign in to your workspace"}
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted sm:text-base">
            {signup
              ? "Set up your organization and start a 14-day trial."
              : "Enter your email or username to open the service desk."}
          </p>
          <AccessForm mode={mode} />
          <div className="mt-6 flex flex-wrap items-center gap-x-2 border-t border-line pt-3 text-sm text-muted">
            {signup ? "Already have an account?" : "Need a workspace?"}
            <Link
              href={signup ? "/login" : "/signup"}
              className="inline-flex min-h-11 items-center gap-1.5 font-extrabold text-brand hover:underline"
            >
              {signup ? "Sign in" : "Create a workspace"}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
