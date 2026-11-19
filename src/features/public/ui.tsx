"use client";

import { WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { VenueMark } from "@/components/venue-mark";
import { PublicLanguage, usePublicLocale } from "./language";
import type { Venue } from "./live";

export function VisitorShell({
  venue,
  children,
  wide = false,
  tone,
}: {
  venue?: Venue;
  children: ReactNode;
  wide?: boolean;
  tone?: "signal";
}) {
  const { language } = usePublicLocale();
  return (
    <main id="main" lang={language} className="visitor" data-wide={wide} data-tone={tone}>
      <header className="visitor-head no-print">
        <div className="flex min-w-0 items-center gap-3">
          <VenueMark venue={venue} />
          <p className="sign visitor-venue">{venue?.name ?? "QueueWindow"}</p>
        </div>
        <PublicLanguage />
      </header>
      <div className="visitor-body">{children}</div>
    </main>
  );
}

export function ConnectionNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="notice no-print">
      <WifiOff aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
