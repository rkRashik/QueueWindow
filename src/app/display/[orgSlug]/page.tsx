import type { Metadata } from "next";
import { getSnapshot, requireSlug } from "@/features/public/server";
import { TvScreen } from "@/features/public/tv";

export const metadata: Metadata = { title: "Waiting room display" };

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const slug = requireSlug((await params).orgSlug);
  return (
    <>
      <script
        // Apply the stored board theme before first paint (no dark-to-light flash).
        dangerouslySetInnerHTML={{
          __html: `try{document.documentElement.dataset.tv=localStorage.getItem("qw-tv-theme")||"dark"}catch(e){}`,
        }}
      />
      <TvScreen slug={slug} initial={await getSnapshot(slug)} />
    </>
  );
}
