/**
 * Catalogue image URLs, pointed at this site instead of at the CDN.
 *
 * Set artwork comes from Community Dragon's `raw.communitydragon.org` tree, and
 * that host refuses a share of requests (HTTP 522) — sometimes for a moment, and
 * for a handful of PvE monsters more or less permanently. Loading those PNGs
 * straight from the browser means a page of a hundred tiles shows a scatter of
 * blank boxes and a different scatter on every reload.
 *
 * So every catalogue image goes through `/api/image`, which retries a failure
 * server-side and caches a success for a year. Only the Community Dragon asset
 * tree is proxied: anything else keeps its own URL, and `null` stays `null` so a
 * catalogue row with no artwork still renders as a placeholder rather than a
 * broken image.
 */

const CDN_PREFIX = "https://raw.communitydragon.org/latest/game/";

export function assetSrc(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith(CDN_PREFIX)) {
    return `/api/image?src=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}
