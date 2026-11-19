import type { Metadata } from "next";
import { requireSlug } from "@/features/public/server";
import { TvScreen } from "@/features/public/tv";

export const metadata: Metadata = { title: "Waiting room display" };

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  return <TvScreen slug={requireSlug((await params).orgSlug)} />;
}
