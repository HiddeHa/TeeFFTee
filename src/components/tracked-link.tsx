"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Analytics event name, e.g. "cta_book_coaching". */
  event: string;
  /** Where the CTA sits, so you can compare placements later. */
  placement: string;
};

/**
 * Outbound link with a click hook.
 *
 * This exists so the coaching funnel is measurable from day one (blueprint §10):
 * every CTA renders through this component and reports its own placement.
 * Wire a real analytics provider in `handleClick` — Plausible and PostHog both
 * accept a custom event call there.
 */
export function TrackedLink({ event, placement, onClick, ...rest }: TrackedLinkProps) {
  function handleClick(clickEvent: MouseEvent<HTMLAnchorElement>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[cta] ${event} · placed at "${placement}"`);
    }
    onClick?.(clickEvent);
  }

  return <a {...rest} onClick={handleClick} />;
}
