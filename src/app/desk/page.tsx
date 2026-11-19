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
        plan: organization.plan,
        logoUrl: organization.logoUrl,
        slug: organization.slug,
        role: user.role,
        demo:
          organization.slug === "demo-clinic" && organization.plan === "DEMO",
        expiresAt: organization.expiresAt.toISOString(),
      }}
    />
  );
}
