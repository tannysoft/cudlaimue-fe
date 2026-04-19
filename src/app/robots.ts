import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/sitemap";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/api", "/checkout", "/read"],
      },
    ],
    sitemap: `${origin}/sitemap_index.xml`,
  };
}
