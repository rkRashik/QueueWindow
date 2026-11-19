import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/features/auth/session";
import { AdminScreen } from "@/features/workspace/admin";

export const metadata: Metadata = { title: "Workspace administration" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const [identity, { section }] = await Promise.all([
    getCurrentIdentity(),
    searchParams,
  ]);
  if (!identity) redirect("/login");
  const { organization, user } = identity;
  if (user.role !== "OWNER") redirect("/desk");
  const current =
    section === "counters" || section === "team" || section === "branding"
      ? section
      : "overview";
  const { name, slug, plan, primaryColor, logoUrl, expiresAt } = organization;
  return (
    <AdminScreen
      workspace={{
        name,
        slug,
        plan,
        primaryColor,
        logoUrl,
        expiresAt: expiresAt.toISOString(),
        role: user.role,
      }}
      section={current}
    />
  );
}
