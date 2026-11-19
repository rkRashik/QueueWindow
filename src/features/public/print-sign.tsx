"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { VenueMark } from "@/components/venue-mark";
import type { Venue } from "./live";
import { QrCode } from "./qr";

export function PrintSign({ venue, url, slug }: { venue: Venue; url: string; slug: string }) {
  return (
    <main id="main" className="poster-page">
      <nav className="no-print poster-controls" aria-label="QR sign controls">
        <Link href={`/join/${slug}`} className="key key-quiet">
          <ArrowLeft aria-hidden="true" />
          Visitor page
        </Link>
        <p className="muted hidden text-sm sm:block">A4 portrait · prints in black and white</p>
        <button type="button" className="key key-primary" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print sign
        </button>
      </nav>
      <article className="poster" aria-labelledby="poster-title">
        <header className="poster-venue">
          <VenueMark venue={venue} />
          <span className="sign">{venue.name}</span>
        </header>
        <h1 id="poster-title" className="sign poster-title">
          Scan to take a ticket
          <span lang="bn">স্ক্যান করে টিকিট নিন</span>
        </h1>
        <div className="poster-qr">
          <QrCode value={url} label="Join queue QR code" />
        </div>
        <ol className="poster-steps">
          <li>
            Open your phone camera
            <span lang="bn">ফোনের ক্যামেরা খুলুন</span>
          </li>
          <li>
            Point it at the code
            <span lang="bn">কোডের দিকে ধরুন</span>
          </li>
          <li>
            Choose your counter
            <span lang="bn">কাউন্টার বেছে নিন</span>
          </li>
        </ol>
        <footer className="poster-foot">
          <span className="sign">{new URL(url).host}</span>
          <span className="poster-brand">
            <BrandMark size={20} />
            QueueWindow
          </span>
        </footer>
      </article>
    </main>
  );
}
