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
import {
  FeatureCard,
  Item,
  LandingNav,
  Stagger,
} from "@/features/landing/motion";
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
      <span className="grid size-8 place-items-center rounded-lg bg-linear-to-b from-indigo-500 to-indigo-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_6px_-1px_rgba(79,70,229,0.5)]">
        <Layers2 className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </span>
      QueueWindow
    </Link>
  );
}

export default function Home() {
  return (
    <>
      <header className="landing-header">
        <div className="landing-width flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
          <Brand />
          <LandingNav />
        </div>
      </header>
      <main id="main">
        <section aria-labelledby="hero-heading" className="landing-hero">
          <div className="landing-width landing-hero-layout">
            <Stagger>
              <Item>
                <p className="landing-badge">
                  <span className="live-dot" aria-hidden="true" />
                  Multi-Counter Queue SaaS • Bangla &amp; English
                </p>
              </Item>
              <Item
                as="h1"
                id="hero-heading"
                className="mt-5 max-w-[17ch] text-4xl leading-[1.06] font-extrabold -tracking-[.045em] text-balance sm:text-5xl lg:text-6xl"
              >
                Run the queue from desk to{" "}
                <span className="text-indigo-700">waiting room.</span>
              </Item>
              <Item as="p" className="landing-summary">
                Call tickets across counters and let visitors follow their turn
                on their phones. The waiting room display shows Bangla and
                English together.
              </Item>
              <Item className="mt-6">
                <DemoButton>
                  <Link className="btn min-h-13 px-3 sm:px-5" href="/signup">
                    Start Free Trial
                  </Link>
                </DemoButton>
              </Item>
              <Item
                as="p"
                className="mt-5 flex items-start gap-2 text-sm leading-relaxed font-semibold text-muted"
              >
                <BadgeCheck
                  className="mt-0.5 size-4 shrink-0 text-brand"
                  aria-hidden="true"
                />
                Visitors join by QR code without sharing personal details.
              </Item>
            </Stagger>
            <ProductPreview />
          </div>
        </section>

        <section
          aria-labelledby="capabilities"
          className="landing-width py-11 sm:py-14"
        >
          <h2
            id="capabilities"
            className="text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            What your team can do
          </h2>
          <div className="feature-grid mt-5">
            {features.map(({ title, text, Icon }, index) => (
              <FeatureCard key={title} index={index}>
                <div className="flex items-start justify-between">
                  <span className="feature-icon">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span
                    className="text-xs font-extrabold text-slate-400 tabular-nums"
                    aria-hidden="true"
                  >
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-base font-extrabold tracking-tight text-slate-950">
                  {title}
                </h3>
                <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-muted">
                  {text}
                </p>
              </FeatureCard>
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
