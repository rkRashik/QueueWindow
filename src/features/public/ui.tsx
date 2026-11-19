"use client";

import Image from "next/image";
import { WifiOff } from "lucide-react";
import { QueueMark } from "@/components/brand";
import { useState, type ReactNode } from "react";
import { PublicLanguage, usePublicLocale } from "./language";
import type { Venue } from "./live";

export function VenueMark({
  logoUrl,
  primaryColor,
}: {
  logoUrl?: string | null;
  primaryColor?: string;
}) {
  const [failed, setFailed] = useState(false);
  return logoUrl && /^https:\/\//i.test(logoUrl) && !failed ? (
    <Image
      alt=""
      unoptimized
      src={logoUrl}
      width={48}
      height={48}
      referrerPolicy="no-referrer"
      className="venue-mark bg-white object-contain"
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className="venue-mark grid place-items-center border-0 bg-transparent"
      style={
        primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
          ? { outline: `2px solid ${primaryColor}`, outlineOffset: 2 }
          : undefined
      }
    >
      <QueueMark size={44} />
    </span>
  );
}

export function VisitorShell({
  venue,
  children,
}: {
  venue?: Venue;
  children: ReactNode;
}) {
  const { language } = usePublicLocale();
  return (
    <main id="main" lang={language} className="visitor-shell">
      <div className="visitor-ambient no-print" aria-hidden="true" />
      <header
        className="visitor-header no-print"
        style={
          venue && /^#[0-9a-f]{6}$/i.test(venue.primaryColor)
            ? { borderColor: venue.primaryColor }
            : undefined
        }
      >
        <div className="flex min-w-0 items-center gap-3">
          <VenueMark
            key={venue?.logoUrl}
            logoUrl={venue?.logoUrl}
            primaryColor={venue?.primaryColor}
          />
          <p className="min-w-0 break-words text-base font-extrabold">
            {venue?.name ?? "QueueWindow"}
          </p>
        </div>
        <PublicLanguage />
      </header>
      <div className="visitor-content">{children}</div>
    </main>
  );
}

export function ConnectionNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="visitor-note no-print">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
