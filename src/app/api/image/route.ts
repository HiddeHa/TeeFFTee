import type { NextRequest } from "next/server";

/**
 * Same-origin image proxy for the catalogue's asset sources.
 *
 * Why it exists: `raw.communitydragon.org` answers a share of requests with 522,
 * commonly a different share each time a page loads a hundred tiles. A retry from
 * the server usually gets the bytes, and once it does the image is cached, so the
 * next visitor never touches the CDN at all.
 *
 * The allowlist is deliberately narrow — this is not an open proxy. Two sources
 * are fetched: Community Dragon's `/latest/game/` tree, and the Set 19 unit
 * portraits on tactics.tools while that set has no Community Dragon tree. The
 * response must actually be an image.
 */

export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = [
  { host: "raw.communitydragon.org", pathPrefix: "/latest/game/" },
  // Set 19 units: no Community Dragon asset tree for the set exists yet.
  { host: "ap.tft.tools", pathPrefix: "/img/s99/" },
];

/** Attempts per request: the first, then two retries with a short backoff. */
const ATTEMPTS = 3;

/** In-process byte cache. Bounded so a long dev session cannot grow without end. */
const CACHE_MAX_BYTES = 48 * 1024 * 1024;
const ONE_YEAR = "public, max-age=31536000, immutable";

type CachedImage = { bytes: ArrayBuffer; type: string };

const cache = new Map<string, CachedImage>();
const inFlight = new Map<string, Promise<CachedImage | null>>();
let cacheBytes = 0;

function remember(key: string, entry: CachedImage): void {
  while (cache.size > 0 && cacheBytes + entry.bytes.byteLength > CACHE_MAX_BYTES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    cacheBytes -= oldest?.bytes.byteLength ?? 0;
  }
  cache.set(key, entry);
  cacheBytes += entry.bytes.byteLength;
}

function imageResponse(entry: CachedImage): Response {
  return new Response(entry.bytes, {
    status: 200,
    headers: {
      "content-type": entry.type,
      "content-length": String(entry.bytes.byteLength),
      "cache-control": ONE_YEAR,
    },
  });
}

async function attempt(url: string): Promise<CachedImage | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: { accept: "image/*" },
    });

    // Any failure is retried: the CDN's 522s are indistinguishable from a 404
    // for a file it will happily serve a minute later.
    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) return null;

    return { bytes, type };
  } catch {
    // Timeout, reset, DNS: all of it is worth one more try.
    return null;
  }
}

async function fetchImage(url: string): Promise<CachedImage | null> {
  for (let index = 0; index < ATTEMPTS; index += 1) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 250 * index));
    }
    const result = await attempt(url);
    if (result) return result;
  }
  return null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const raw = request.nextUrl.searchParams.get("src");
  if (!raw) {
    return new Response("Missing src", { status: 400 });
  }

  let source: URL;
  try {
    source = new URL(raw);
  } catch {
    return new Response("Bad src", { status: 400 });
  }

  const allowed =
    source.protocol === "https:" &&
    ALLOWED_SOURCES.some(
      (entry) => source.hostname === entry.host && source.pathname.startsWith(entry.pathPrefix),
    );

  if (!allowed) {
    return new Response("Not an allowed image", { status: 400 });
  }

  const key = source.toString();
  const hit = cache.get(key);
  if (hit) return imageResponse(hit);

  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetchImage(key).finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
  }

  const fetched = await pending;
  if (!fetched) {
    // The tile falls back to a label. Not cached: the CDN may serve it later.
    return new Response(null, { status: 502, headers: { "cache-control": "no-store" } });
  }

  remember(key, fetched);
  return imageResponse(fetched);
}
