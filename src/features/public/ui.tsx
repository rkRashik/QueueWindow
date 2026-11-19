"use client";

import Image from "next/image";
import { WifiOff } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { PublicLanguage, usePublicLocale } from "./language";
import type { Venue } from "./live";

/** The venue's logo, or its initial on its brand colour (a plate for the venue). */
export function VenueMark({
  logoUrl,
  primaryColor,
  name = "",
}: {
  logoUrl?: string | null;
  primaryColor?: string;
  name?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (logoUrl && /^https:\/\//i.test(logoUrl) && !failed)
    return (
      <Image
        alt=""
        unoptimized
        src={logoUrl}
        width={80}
        height={80}
        referrerPolicy="no-referrer"
        className="venue-mark"
        onError={() => setFailed(true)}
      />
    );
  const initial = Array.from(name.trim())[0]?.toUpperCase();
  if (!initial) return null;
  return (
    <span
      aria-hidden="true"
      className="venue-mark"
      style={
        primaryColor && /^#[0-9a-f]{6}$/i.test(primaryColor)
          ? ({ "--venue": primaryColor } as CSSProperties)
          : undefined
      }
    >
      {initial}
    </span>
  );
}

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
          <VenueMark
            key={venue?.logoUrl}
            logoUrl={venue?.logoUrl}
            primaryColor={venue?.primaryColor}
            name={venue?.name}
          />
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
