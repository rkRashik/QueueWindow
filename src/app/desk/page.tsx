import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/features/auth/session";
import { DeskScreen } from "@/features/workspace/desk";

export const metadata: Metadata = { title: "Service desk" };

export default async function DeskPage() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login");
  const { organization, user } = identity;
  return (
    <DeskScreen
      workspace={{
        name: organization.name,
        slug: organization.slug,
        role: user.role,
        expiresAt: organization.expiresAt.toISOString(),
      }}
    />
  );
}
