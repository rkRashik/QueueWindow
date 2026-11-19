import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  Languages,
  Layers2,
  LockKeyhole,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { DemoButton } from "@/features/landing/demo-button";
import { ProductPreview } from "@/features/landing/preview";

export const metadata: Metadata = {
  title: "Live service queues",
  description:
    "Run multi-counter queues with a bilingual waiting room display, QR admission, and mobile ticket tracking.",
};

const features = [
  {
    title: "Independent counters",
    text: "Give reception, diagnostics, and other service points their own ticket numbers and waiting lists.",
    Icon: Layers2,
  },
  {
    title: "Updates across screens",
    text: "Call a ticket once. The waiting room TV and the visitor’s phone update automatically.",
    Icon: Activity,
  },
  {
    title: "Bangla and English",
    text: "Use either language on the desk. The TV shows both together so visitors can read at their own pace.",
    Icon: Languages,
  },
  {
    title: "QR, kiosk, and print",
    text: "Print a venue QR sign or run a reception tablet with thermal receipts. Visitors can retry a dropped request safely.",
    Icon: Printer,
  },
  {
    title: "Owner and staff access",
    text: "Owners manage counters and accounts. Desk staff can run the queue with a username and password.",
    Icon: LockKeyhole,
  },
  {
    title: "No visitor PII",
    text: "Visitors take a ticket without an account, name, or phone number.",
    Icon: ShieldCheck,
  },
];

function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2.5 font-extrabold tracking-tight"
      translate="no"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
        <Layers2 className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </span>
      QueueWindow
    </Link>
  );
}

export default function Home() {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="landing-width flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
          <Brand />
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-1 sm:gap-2"
          >
            <a className="btn btn-quiet hidden sm:inline-flex" href="#product">
              Product
            </a>
            <Link className="btn btn-quiet" href="/login">
              Log in
            </Link>
            <Link className="btn" href="/signup">
              Sign up
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <div className="landing-width">
          <section className="landing-hero">
            <div>
              <h1>Run the queue from desk to waiting room.</h1>
              <p className="landing-summary">
                Call tickets across counters and let visitors follow their turn
                on their phones. The waiting room display shows Bangla and
                English together.
              </p>
              <div className="mt-6 flex flex-wrap items-start gap-3">
                <DemoButton />
                <Link className="btn min-h-13 px-5" href="/signup">
                  Start Free Trial
                </Link>
              </div>
            </div>
            <div className="landing-context">
              <BadgeCheck
                className="mb-3 size-5 text-brand"
                aria-hidden="true"
              />
              <p className="font-extrabold">
                For clinics, diagnostic centers, banks, and service desks.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Visitors join with a QR code. No names, phone numbers, or
                accounts needed.
              </p>
            </div>
          </section>
          <ProductPreview />
        </div>

        <section
          aria-labelledby="capabilities"
          className="landing-width py-14 sm:py-20"
        >
          <h2
            id="capabilities"
            className="text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            What your team can do
          </h2>
          <div className="feature-grid mt-5">
            {features.map(({ title, text, Icon }) => (
              <article key={title}>
                <Icon className="mb-3 size-5 text-brand" aria-hidden="true" />
                <h3 className="font-extrabold">{title}</h3>
                <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-muted">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-line bg-white">
        <div className="landing-width flex flex-wrap items-center justify-between gap-3 py-5">
          <Brand />
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-1"
          >
            <Link className="btn btn-quiet" href="/login">
              Log in
            </Link>
            <Link className="btn btn-quiet" href="/signup">
              Sign up
            </Link>
            <DemoButton compact />
          </nav>
        </div>
      </footer>
    </>
  );
}
