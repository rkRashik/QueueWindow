import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { AccessForm } from "./access-form";

export function AccessPage({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  return (
    <div className="access">
      <header className="access-head">
        <Wordmark />
        <Link className="key key-quiet key-sm" href={signup ? "/login" : "/signup"}>
          {signup ? "Log in" : "Create workspace"}
        </Link>
      </header>
      <main id="main" className="access-body">
        <h1 id="access-title" className="sign text-[2.25rem] leading-none font-bold">
          {signup ? "Create your workspace" : "Log in"}
        </h1>
        <p className="muted mt-2">
          {signup ? "Your desks, board and QR sign, ready in a minute." : "Open your service desk."}
        </p>
        <AccessForm mode={mode} />
        <p className="muted mt-6 border-t border-(--line) pt-4 text-sm">
          {signup ? "Already have a workspace? " : "New here? "}
          <Link href={signup ? "/login" : "/signup"} className="font-bold text-(--fg) underline underline-offset-4">
            {signup ? "Log in" : "Create a workspace"}
          </Link>
          {" · "}
          <Link href="/" className="font-bold text-(--fg) underline underline-offset-4">
            Try the live demo
          </Link>
        </p>
      </main>
    </div>
  );
}
