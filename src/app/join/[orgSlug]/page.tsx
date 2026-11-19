import type { Metadata } from "next";
import { ArrivalScreen } from "@/features/public/arrival";
import { requireSlug } from "@/features/public/server";

export const metadata: Metadata = { title: "Take a ticket" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  return <ArrivalScreen slug={requireSlug((await params).orgSlug)} />;
}
