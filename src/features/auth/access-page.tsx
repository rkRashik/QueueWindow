import Link from "next/link";
import { AccessForm } from "./access-form";

export function AccessPage({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  return (
    <main
      id="main"
      className="mx-auto grid min-h-dvh max-w-7xl md:grid-cols-[0.8fr_1.2fr]"
    >
      <aside className="flex flex-col justify-between gap-12 bg-brand-dark px-6 py-5 text-white md:px-10 md:py-10 lg:px-14">
        <Link
          href="/"
          className="w-fit rounded-sm text-lg font-extrabold tracking-tight focus-visible:outline-white"
        >
          QueueWindow
        </Link>
        <p className="hidden max-w-72 text-4xl leading-tight font-semibold tracking-tight md:block lg:text-5xl">
          A service queue for your whole team.
        </p>
        <div
          aria-hidden="true"
          className="hidden w-20 border-t-2 border-white/40 md:block"
        />
      </aside>
      <section
        aria-labelledby="access-title"
        className="flex items-center px-6 py-9 md:px-12 md:py-14"
      >
        <div className="mx-auto w-full max-w-md">
          <h1
            id="access-title"
            className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl"
          >
            {signup ? "Create your workspace" : "Sign in to your workspace"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            {signup
              ? "Set up your organization and start a 14-day trial."
              : "Use your email or username to access the desk."}
          </p>
          <AccessForm mode={mode} />
          <div className="mt-7 border-t border-line pt-4 text-sm text-muted">
            {signup ? "Already have an account? " : "Need a workspace? "}
            <Link
              href={signup ? "/login" : "/signup"}
              className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4"
            >
              {signup ? "Sign in" : "Create a workspace"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
