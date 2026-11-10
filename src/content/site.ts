import type { Region, RankBucket } from "./types";

/**
 * SITE CONFIGURATION
 *
 * Everything in this file is content you control by hand. The fields marked
 * PLACEHOLDER must be replaced before the site is submitted to Riot for a
 * production key or promoted publicly.
 */
export const site = {
  /** Keep "TFT", "Teamfight" and "Riot" out of the name and the domain. */
  name: "metaread",
  tagline: "High-elo TFT stats, read by someone who plays there.",
  description:
    "Tier lists, comp stats and patch reads for Teamfight Tactics, built from Challenger and Grandmaster games on EUW and KR.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  // PLACEHOLDER — replace with your live booking page (Calendly, Stripe link, ...).
  bookingUrl:
    process.env.NEXT_PUBLIC_BOOKING_URL ??
    "https://calendly.com/your-handle/tft-coaching",
  // PLACEHOLDER
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/your-invite",

  /** Current live set. Set 19 lands the week of 2026-12-01. */
  setNumber: 18,
  setCodename: "Enchanted Wilds",
  currentPatch: "18.6",
  currentPatchDate: "2026-11-04",

  /** Regions the crawler seeds. Shown as filters, so keep in sync with the data. */
  regions: ["EUW", "KR"] as Region[],
  rankBuckets: ["master+", "diamond+", "all"] as RankBucket[],

  /** PLACEHOLDER — your credibility block. This appears next to every coaching CTA. */
  author: {
    name: "Your Name",
    handle: "@yourhandle",
    peakRank: "Challenger",
    currentRank: "Challenger",
    server: "EUW",
    proof: "Replace with your real track record, e.g. “coached 40+ players to Master”.",
  },

  /** PLACEHOLDER — set your own prices. Put them on the page; “DM for price” converts worse. */
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

  socials: [
    { label: "Discord", href: "https://discord.gg/your-invite" },
    { label: "X", href: "https://x.com/yourhandle" },
    { label: "Twitch", href: "https://twitch.tv/yourhandle" },
  ],

  contactEmail: "you@example.com",
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
