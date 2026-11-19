import { Admission } from "@/features/workspace/admission";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <Admission code={code} />;
}
