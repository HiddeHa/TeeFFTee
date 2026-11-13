"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { assetSrc } from "@/lib/image-src";

/**
 * A catalogue picture with somewhere to land when it cannot be loaded.
 *
 * The proxy in `/api/image` retries and caches, but a handful of assets the CDN
 * refuses outright (the PvE monsters, a few skin splashes) will never arrive. A
 * blank box there reads as a broken page, so every call site passes the fallback
 * it already used for "no artwork in the catalogue" — the champion's name, the
 * raw id, a dashed placeholder — and the tile keeps its meaning.
 */
export function AssetImage({
  src,
  className,
  width,
  height,
  style,
  eager = false,
  fallback = null,
}: {
  /** Catalogue image URL, or null when the catalogue has no artwork. */
  src: string | null | undefined;
  className?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
  /** Load immediately rather than lazily — for above-the-fold artwork. */
  eager?: boolean;
  /** Rendered instead of the image when there is nothing to load. */
  fallback?: ReactNode;
}) {
  const resolved = assetSrc(src);
  const [failed, setFailed] = useState(false);

  // A different picture deserves its own chance.
  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) return <>{fallback}</>;

  return (
    <img
      src={resolved}
      alt=""
      width={width}
      height={height}
      style={style}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
