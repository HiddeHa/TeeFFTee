import type { MetadataRoute } from "next";

import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The analysis workbench is private (blueprint §4).
        disallow: ["/lab"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
