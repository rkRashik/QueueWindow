import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSlug } from "@/features/public/server";
import { TicketScreen } from "@/features/public/ticket-screen";
import { id } from "@/features/queue/input";

export const metadata: Metadata = {
  title: "Your ticket",
  referrer: "no-referrer",
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ orgSlug: string; ticketId: string }>;
}) {
  const { orgSlug, ticketId } = await params;
  if (!id.safeParse(ticketId).success) notFound();
  return <TicketScreen slug={requireSlug(orgSlug)} ticketId={ticketId} />;
}
