import type { Metadata } from "next";
import { getSnapshot, requireSlug } from "@/features/public/server";
import { TvScreen, type DisplayStyle } from "@/features/public/tv";

export const metadata: Metadata = { title: "Waiting room display" };

// Kept here: values exported from a "use client" module are references on the server.
const styles: readonly DisplayStyle[] = ["board", "spotlight", "kinetic"];

export default async function DisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ style?: string | string[] }>;
}) {
  const slug = requireSlug((await params).orgSlug);
  const { style } = await searchParams;
  const forcedStyle = styles.find((value) => value === style);
  return (
    <>
      <script
        // Apply the stored board theme before first paint (no dark-to-light flash).
        dangerouslySetInnerHTML={{
          __html: `try{document.documentElement.dataset.tv=localStorage.getItem("qw-tv-theme")||"dark"}catch(e){}`,
        }}
      />
      <TvScreen slug={slug} initial={await getSnapshot(slug)} forcedStyle={forcedStyle} />
    </>
  );
}
