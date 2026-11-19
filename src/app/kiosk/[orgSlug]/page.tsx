import type { Metadata } from "next";
import { ArrivalScreen } from "@/features/public/arrival";
import { getSnapshot, publicOrigin, requireSlug } from "@/features/public/server";

export const metadata: Metadata = {
  title: "Reception kiosk",
  referrer: "no-referrer",
};

export default async function KioskPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const slug = requireSlug((await params).orgSlug);
  const [initial, origin] = await Promise.all([getSnapshot(slug), publicOrigin()]);
  return <ArrivalScreen slug={slug} kioskOrigin={origin} initial={initial} />;
}
