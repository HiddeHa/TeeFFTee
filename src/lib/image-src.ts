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
 * server-side and caches a success for a year. Two sources are proxied: the
 * Community Dragon asset tree, and the Set 19 unit portraits that have no
 * Community Dragon path yet (`src/content/set-19-portraits.ts`). Anything else
 * keeps its own URL, and `null` stays `null` so a catalogue row with no artwork
 * still renders as a placeholder rather than a broken image.
 */

const CDN_PREFIX = "https://raw.communitydragon.org/latest/game/";
/** Set 19 unit art, from the copy on tactics.tools until CDragon ships the set. */
const SET19_PORTRAIT_PREFIX = "https://ap.tft.tools/img/s99/";

const PROXIED_PREFIXES = [CDN_PREFIX, SET19_PORTRAIT_PREFIX];

export function assetSrc(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (PROXIED_PREFIXES.some((prefix) => imageUrl.startsWith(prefix))) {
    return `/api/image?src=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}
