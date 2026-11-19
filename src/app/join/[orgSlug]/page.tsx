import type { Metadata } from "next";
import { ArrivalScreen } from "@/features/public/arrival";
import { getSnapshot, requireSlug } from "@/features/public/server";

export const metadata: Metadata = { title: "Take a ticket" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const slug = requireSlug((await params).orgSlug);
  return <ArrivalScreen slug={slug} initial={await getSnapshot(slug)} />;
}
