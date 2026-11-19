import { WorkspaceAccess } from "@/features/auth/workspace-access";

export default function AdminPage() {
  return <WorkspaceAccess ownerOnly />;
}
