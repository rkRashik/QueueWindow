import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { slug as slugSchema } from "@/features/queue/input";
import { freshDemo } from "@/features/auth/demo";
import { displaySnapshot } from "@/features/queue/public";
import type { DisplayData } from "./live";
import { AppError } from "@/lib/app-error";

export function requireSlug(value: string) {
  const slug = slugSchema.safeParse(value);
  if (!slug.success) notFound();
  return slug.data;
}

/** First paint carries real data: no client-side loading flash. Heals the shared demo. */
export async function getSnapshot(slug: string): Promise<DisplayData> {
  try {
    await freshDemo(slug);
    // Round-trip through JSON so the client receives exactly the wire shape.
    return JSON.parse(JSON.stringify(await displaySnapshot(getDb(), slug)));
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

export async function getVenue(slug: string) {
  return (await getSnapshot(slug)).organization;
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
