import type { NextConfig } from "next";

/**
 * The comp pages live at /meta as of 2026-11-15. The old /comps paths stay as
 * permanent redirects so inbound links, bookmarks and anything already indexed
 * keep working — including comp slugs and the stats view.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/comps", destination: "/meta", permanent: true },
      { source: "/comps/stats", destination: "/meta/stats", permanent: true },
      { source: "/comps/:slug", destination: "/meta/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
