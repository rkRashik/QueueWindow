import type { Metadata } from "next";
import { ArrivalScreen } from "@/features/public/arrival";
import { publicOrigin, requireSlug } from "@/features/public/server";

export const metadata: Metadata = {
  title: "Reception kiosk",
  referrer: "no-referrer",
};

export default async function KioskPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return (
    <ArrivalScreen
      slug={requireSlug(orgSlug)}
      kioskOrigin={await publicOrigin()}
    />
  );
}
