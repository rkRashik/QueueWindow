"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { Venue } from "./live";
import { QrCode } from "./qr";
import { VenueMark } from "./ui";

export function PrintSign({
  venue,
  url,
  slug,
}: {
  venue: Venue;
  url: string;
  slug: string;
}) {
  return (
    <main id="main" className="poster-shell">
      <nav className="no-print poster-controls" aria-label="QR sign controls">
        <Link href={`/join/${slug}`} className="visitor-button">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Visitor queue
        </Link>
        <button
          type="button"
          className="visitor-button visitor-primary"
          onClick={() => window.print()}
        >
          <Printer className="size-4" aria-hidden="true" />
          Print QR sign
        </button>
      </nav>
      <article className="qr-poster" aria-labelledby="poster-venue">
        <VenueMark logoUrl={venue.logoUrl} primaryColor={venue.primaryColor} />
        <p className="poster-venue" id="poster-venue">
          {venue.name}
        </p>
        <h1 lang="bn">স্ক্যান করে টিকিট নিন</h1>
        <p className="poster-subtitle" lang="en">
          Scan to join the queue
        </p>
        <div className="poster-qr">
          <QrCode value={url} label="Join queue QR code" />
        </div>
        <p lang="bn">ফোনের ক্যামেরা খুলে QR কোডটি স্ক্যান করুন।</p>
        <p lang="en" className="mt-1">
          Open your phone camera and point it at the QR code.
        </p>
        <p className="poster-address">{new URL(url).host}</p>
      </article>
    </main>
  );
}
