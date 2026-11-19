import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { slug as slugSchema } from "@/features/queue/input";
import { displaySnapshot } from "@/features/queue/public";
import { AppError } from "@/lib/app-error";

export function requireSlug(value: string) {
  const slug = slugSchema.safeParse(value);
  if (!slug.success) notFound();
  return slug.data;
}

export async function getVenue(slug: string) {
  try {
    return (await displaySnapshot(getDb(), slug)).organization;
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

export async function publicOrigin() {
  const configured = process.env.APP_URL;
  if (configured) {
    const url = new URL(configured);
    if (["http:", "https:"].includes(url.protocol)) return url.origin;
  }
  const incoming = await headers();
  const host = incoming.get("host");
  const protocol =
    incoming.get("x-forwarded-proto") === "https" ? "https" : "http";
  if (!host || !/^[\w.:[\]-]+$/.test(host))
    throw new Error("A valid public origin is required");
  return new URL(`${protocol}://${host}`).origin;
}
