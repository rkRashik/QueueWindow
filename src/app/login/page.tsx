import type { Metadata } from "next";
import { AccessPage } from "@/features/auth/access-page";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <AccessPage mode="login" />;
}
