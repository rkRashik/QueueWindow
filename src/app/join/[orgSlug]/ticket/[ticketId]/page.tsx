import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getSnapshot, requireSlug } from "@/features/public/server";
import { TicketScreen } from "@/features/public/ticket-screen";
import { id } from "@/features/queue/input";
import { organizationBySlug, visitorTicket } from "@/features/queue/public";
import { AppError } from "@/lib/app-error";

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
  const slug = requireSlug(orgSlug);
  const venue = await getSnapshot(slug);
  const db = getDb();
  const ticket = await visitorTicket(db, (await organizationBySlug(db, slug)).id, ticketId).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.status === 404) notFound();
      throw error;
    },
  );
  return <TicketScreen slug={slug} ticketId={ticketId} initial={{ ticket, venue }} />;
}
