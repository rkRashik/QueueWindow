import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { BentoGrid } from "@/features/landing/bento";
import { DemoButton } from "@/features/landing/demo-button";
import {
  Item,
  LandingNav,
  ScrollProgress,
  Stagger,
} from "@/features/landing/motion";
import { ProductPreview } from "@/features/landing/preview";

export const metadata: Metadata = {
  title: "Live service queues",
  description:
    "Run multi-counter queues with a color-coded waiting room display, QR admission, and live mobile ticket tracking.",
};

export default function Home() {
  return (
    <>
      <header className="landing-header">
        <div className="landing-width flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
          <Wordmark className="min-h-11" />
          <LandingNav />
        </div>
        <ScrollProgress />
      </header>
      <main id="main">
        <section aria-labelledby="hero-heading" className="landing-hero">
          <div className="landing-width landing-hero-layout">
            <Stagger>
              <Item
                as="h1"
                id="hero-heading"
                className="max-w-[16ch] font-display text-[2.6rem] leading-[1.02] font-semibold -tracking-[.03em] text-balance sm:text-6xl lg:text-[4.1rem]"
              >
                Run the queue from desk to waiting room.
              </Item>
              <Item as="p" className="landing-summary">
                Call a ticket once and the waiting room TV and every visitor’s
                phone follow. Each desk keeps its own colour, numbers and list.
              </Item>
              <Item className="mt-7">
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
          className="landing-width py-14 sm:py-20"
        >
          <h2
            id="capabilities"
            className="max-w-[20ch] font-display text-3xl leading-tight font-semibold -tracking-[.02em] text-balance sm:text-4xl"
          >
            Calm for visitors. Quick for staff.
          </h2>
          <div className="mt-8">
            <BentoGrid />
          </div>
        </section>

        <section aria-labelledby="closing" className="landing-width pb-16 sm:pb-24">
          <div className="landing-closing">
            <h2
              id="closing"
              className="max-w-[18ch] font-display text-3xl leading-tight font-semibold -tracking-[.02em] text-balance text-white sm:text-4xl"
            >
              Set up your first counter in minutes.
            </h2>
            <Link className="btn btn-primary min-h-13 px-5" href="/signup">
              Create your workspace
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-line bg-white">
        <div className="landing-width flex flex-wrap items-center justify-between gap-3 py-5">
          <Wordmark className="min-h-11" />
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
