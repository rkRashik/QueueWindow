"use client";

import Image from "next/image";
import { useState } from "react";
import { BrandMark } from "./brand";

export type VenueBranding = { plan: string; logoUrl: string | null };

export function validLogoUrl(value: string) {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}

export function VenueMark({ venue, size, className = "venue-mark" }: {
  venue?: VenueBranding;
  size?: number;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = venue?.plan === "PRO" ? venue.logoUrl : null;
  if (!url || url === failedUrl || !validLogoUrl(url)) {
    return <BrandMark size={size} className={className} />;
  }
  return (
    <Image
      alt=""
      unoptimized
      src={url}
      width={size ?? 80}
      height={size ?? 80}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailedUrl(url)}
    />
  );
}
