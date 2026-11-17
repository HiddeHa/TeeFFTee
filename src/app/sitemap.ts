import type { MetadataRoute } from "next";

import { comps } from "@/content/comps";
import { guides } from "@/content/guides";
import { patches } from "@/content/patches";
import { SET_19_AS_OF, set19Units } from "@/content/set-19";
import { site } from "@/content/site";
import { unitPageHref } from "@/lib/set19-anchors";

/**
 * Generated from content, so a new comp or patch is indexable the moment it is
 * published — no hand-maintained list to forget (blueprint §12).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");

  const staticRoutes = [
    "",
    "/meta",
    "/meta/stats",
    "/teambuilder",
    "/ainalyses",
    "/lab",
    "/guides",
    // Not /players: that path is a redirect to the board, and a sitemap entry
    // that 307s tells a crawler nothing about the page that actually exists.
    "/leaderboards",
    "/tier-lists",
    "/set-19",
    "/set-19/units",
    "/set-19/traits",
    "/set-19/unlockables",
    "/coaching",
    "/about",
    "/terms",
    "/privacy",
  ].map(
    (path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    }),
  );

  const compRoutes = comps
    .filter((comp) => comp.published && comp.setNumber === site.setNumber)
    .map((comp) => ({
      url: `${base}/meta/${comp.slug}`,
      lastModified: new Date(comp.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // One indexable page per Set 19 champion, before the set has any stats: the
  // roster is the only new-set content that exists on day minus-one.
  const set19UnitRoutes = set19Units.map((unit) => ({
    url: `${base}${unitPageHref(unit.name)}`,
    lastModified: new Date(SET_19_AS_OF),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const guideRoutes = guides.map((guide) => ({
    url: `${base}/guides/${guide.slug}`,
    lastModified: new Date(guide.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const patchRoutes = patches
    .filter((patch) => patch.setNumber === site.setNumber)
    .map((patch) => ({
      url: `${base}/patch/${patch.patch}`,
      lastModified: new Date(patch.releasedAt),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [
    ...staticRoutes,
    ...set19UnitRoutes,
    ...compRoutes,
    ...guideRoutes,
    ...patchRoutes,
  ];
}
