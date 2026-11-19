import type { Metadata } from "next";
import { AccessPage } from "@/features/auth/access-page";

export const metadata: Metadata = { title: "Create a workspace" };

export default function SignupPage() {
  return <AccessPage mode="signup" />;
}
