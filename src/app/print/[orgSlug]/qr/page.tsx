import type { Metadata } from "next";
import { PrintSign } from "@/features/public/print-sign";
import { getVenue, publicOrigin, requireSlug } from "@/features/public/server";

export const metadata: Metadata = { title: "Print venue QR sign" };

export default async function PrintPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const slug = requireSlug((await params).orgSlug);
  const [venue, origin] = await Promise.all([getVenue(slug), publicOrigin()]);
  return (
    <PrintSign
      venue={venue}
      slug={slug}
      url={new URL(`/join/${slug}`, origin).href}
    />
  );
}
