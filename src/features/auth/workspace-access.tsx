import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "./session";

export async function WorkspaceAccess({
  ownerOnly = false,
}: {
  ownerOnly?: boolean;
}) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login");
  if (ownerOnly && identity.user.role !== "OWNER") redirect("/desk");

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-bold text-brand">
        {ownerOnly ? "Workspace administration" : "Service desk"}
      </p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight wrap-anywhere">
        {identity.organization.name}
      </h1>
      <p className="mt-4 text-muted wrap-anywhere">
        Signed in as {identity.user.fullName} (
        {identity.user.role === "OWNER" ? "owner" : "staff"}).
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="min-h-11 rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark"
          >
            Sign out
          </button>
        </form>
        {identity.user.role === "OWNER" && (
          <Link
            href={ownerOnly ? "/desk" : "/admin"}
            className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4"
          >
            {ownerOnly ? "Go to the desk" : "Workspace administration"}
          </Link>
        )}
      </div>
    </main>
  );
}
