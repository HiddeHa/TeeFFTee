import type { MetadataRoute } from "next";

import { comps } from "@/content/comps";
import { patches } from "@/content/patches";
import { site } from "@/content/site";

/**
 * Generated from content, so a new comp or patch is indexable the moment it is
 * published — no hand-maintained list to forget (blueprint §12).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");

  const staticRoutes = ["", "/comps", "/coaching", "/about", "/terms", "/privacy"].map(
    (path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    }),
  );

  const compRoutes = comps
    .filter((comp) => comp.published)
    .map((comp) => ({
      url: `${base}/comps/${comp.slug}`,
      lastModified: new Date(comp.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const patchRoutes = patches.map((patch) => ({
    url: `${base}/patch/${patch.patch}`,
    lastModified: new Date(patch.releasedAt),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...compRoutes, ...patchRoutes];
}
