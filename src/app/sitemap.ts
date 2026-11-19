import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/login", "/signup"].map((path) => ({ url: siteUrl(path).href }));
}
