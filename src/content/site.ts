import type { Region, RankBucket } from "./types";

/**
 * SITE CONFIGURATION
 *
 * Everything in this file is content you control by hand. As of 2026-11-10 the
 * site content is real (docs/decisions.md D3–D6) and PLACEHOLDER_CONTENT is off;
 * the one thing still missing is the domain, which NEXT_PUBLIC_SITE_URL supplies
 * at build time. Keep this file honest: if a field becomes a placeholder again,
 * turn the flag in ./flags.ts back on rather than leaving it looking finished.
 */
export const site = {
  /** Keep "Riot" out of the name and the domain. "TFT" is referenced in copy, never in the name. */
  name: "TeeFFTee",
  tagline: "High-elo TFT stats, read by someone who plays there.",
  description:
    "Tier lists, comp stats and patch reads for Teamfight Tactics, built from Challenger and Grandmaster games on EUW and KR.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  //
  // No booking tool yet (docs/decisions.md D6): every CTA opens a pre-filled email
  // rather than pretending to send you to a calendar that does not exist. Point this
  // at Calendly or a Stripe link when one exists — every component reads it here.
  bookingUrl:
    process.env.NEXT_PUBLIC_BOOKING_URL ??
    "mailto:hidde.hanning.bee@gmail.com?subject=TeeFFTee%20coaching",

  /** Current live set. Set 19 lands the week of 2026-12-01. */
  setNumber: 18,
  setCodename: "Enchanted Wilds",
  currentPatch: "18.6",
  currentPatchDate: "2026-11-04",

  /** Regions the crawler seeds. Shown as filters, so keep in sync with the data. */
  regions: ["EUW", "KR"] as Region[],
  rankBuckets: ["master+", "diamond+", "all"] as RankBucket[],

  /** The credibility block. Appears beside every coaching CTA and on /about. */
  author: {
    name: "Hitmoney",
    /** No public handle volunteered; /about omits the line when this is empty. */
    handle: "",
    peakRank: "Challenger",
    currentRank: "Master",
    server: "EUW",
    proof: "Current Master on EUW, peak Challenger.",
  },

  /** Real prices (docs/decisions.md D6). Put them on the page; “DM for price” converts worse. */
  offers: [
    {
      id: "vod",
      name: "VOD review",
      price: 45,
      currency: "EUR",
      format: "One ranked game, 48h turnaround",
      includes: [
        "Written notes on economy, positioning and itemisation",
        "Voice breakdown of every meaningful decision",
        "A concrete plan for your next 10 games",
      ],
      flagship: false,
    },
    {
      id: "live",
      name: "Live session",
      price: 90,
      currency: "EUR",
      format: "60 minutes, screen share",
      includes: [
        "We review your games together, live",
        "Comp selection for your rank and region",
        "Positioning and tempo drills you can repeat",
      ],
      flagship: true,
    },
    {
      id: "climb",
      name: "Climb package",
      price: 240,
      currency: "EUR",
      format: "3 sessions across one patch",
      includes: [
        "Three live sessions, spread over a patch",
        "Between-session check-ins on your games",
        "Patch-by-patch plan while the meta settles",
      ],
      flagship: false,
    },
  ],

  /**
   * No public profiles yet (docs/decisions.md D5): a dead Discord invite and a made-up
   * handle are worse than a short column, so the footer links the one channel that
   * exists. Add real handles here when there are some.
   */
  socials: [{ label: "Email", href: "mailto:hidde.hanning.bee@gmail.com" }],

  contactEmail: "hidde.hanning.bee@gmail.com",
} as const;

/**
 * Riot requires this notice to be genuinely visible to players.
 * Do not remove it, and keep the wording intact.
 */
export const RIOT_DISCLAIMER = `${site.name} isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.`;

/** Methodology text shown on /about and under the tier list. */
export const METHODOLOGY = {
  sample:
    "Every number is computed from full 8-player matches crawled from the EUW and KR ranked ladders, seeded from Master, Grandmaster and Challenger entries.",
  bucket:
    "Rank buckets describe which ladders were crawled, not each player's rank at the time of the match — Riot does not expose historical rank per match. Treat “Master+” as “high-elo ladder sample”.",
  assignment:
    "A board is assigned to a comp when at least 60% of that comp's core units are present and the comp's defining trait is active. Boards that match nothing are counted, not hidden: the unclassified rate is published as a data-health number.",
  confidence:
    "Comps are ranked by the Wilson 95% lower bound of their top-4 rate, so a small sample cannot outrank a large one. Games played is always shown next to the number.",
  privacy:
    "Player names, PUUIDs and match histories are never published. Only aggregates are displayed.",
} as const;
