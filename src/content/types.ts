/**
 * Content model.
 *
 * These types describe what a comp *is*, independent of where it is stored.
 * They mirror the curated tables in src/db/schema.ts, so swapping the seeded
 * content for Postgres rows later is a change of source, not of shape.
 */

export type Tier = "S" | "A" | "B" | "C";

export type Region = "EUW" | "KR";

/** Rank buckets are approximated by which ladder we crawled. Label them honestly. */
export type RankBucket = "master+" | "diamond+" | "all";

export type Cost = 1 | 2 | 3 | 4 | 5;
export type Star = 1 | 2 | 3;

/**
 * One slot on a board, as authored in content: *which* unit and how it is
 * itemised.
 *
 * Deliberately carries no name or cost. Those come from the set catalogue
 * (`units`, loaded from Community Dragon), so a comp can never disagree with the
 * game about what a unit is called or what it costs — and there is nowhere for a
 * placeholder name to hide.
 */
export type UnitSlot = {
  /** Riot unit apiName, e.g. DA_18_Ashe. See the `units` table. */
  id: string;
  star: Star;
  items: string[];
};

/**
 * A slot resolved against the catalogue.
 *
 * `null` means the id is not in the loaded set — a placeholder id, a renamed
 * unit, or a catalogue that has not been loaded. The UI shows the id and says so
 * rather than inventing a name, which is how a bad id becomes visible instead of
 * plausible.
 */
export type BoardUnit = UnitSlot & {
  name: string | null;
  /** 0 is a summons (Training Dummy); null is unknown. */
  cost: number | null;
  imageUrl: string | null;
};

/**
 * Aggregated numbers for one (comp, patch, region, rank bucket) combination.
 * Never invent these: `null` means "not enough data yet" and the UI must say so.
 */
export type CompStats = {
  patch: string;
  /** "all" means the figure combines every region the crawler covers. */
  region: Region | "all";
  rankBucket: RankBucket;
  games: number;
  avgPlace: number;
  /** 0..1 */
  top4Rate: number;
  /** 0..1 */
  winRate: number;
  /** 0..1 — share of all boards in the sample that played this comp */
  pickRate: number;
  /**
   * Wilson 95% lower bound on top4Rate. Sort by this, not by raw top4Rate, so a
   * 12-game comp cannot outrank a well-sampled one.
   */
  top4CiLow: number;
  computedAt: string;
};

export type Comp = {
  slug: string;
  name: string;
  tier: Tier;
  setNumber: number;
  patch: string;
  /** e.g. "Fast 8", "Slow roll", "Reroll", "Flex" */
  playstyle: string;
  difficulty: "Easy" | "Medium" | "Hard";
  /** One line: what this board is trying to do. */
  summary: string;
  /** The leveling/rolling plan, in the player's words. */
  leveling: string;
  board: UnitSlot[];
  /** Subset of board ids that define the comp — this is also the assignment signature. */
  coreUnits: string[];
  flexUnits: string[];
  /**
   * Trait that must be active for a board to count as this comp. Optional: a
   * comp whose core units already identify it unambiguously can omit it.
   */
  definingTrait?: string;
  augments: string[];
  notes: {
    whyNow: string;
    howToPlay: string;
    mistakes: string;
  };
  matchups?: {
    beats: string[];
    losesTo: string[];
  };
  stats: CompStats | null;
  published: boolean;
  updatedAt: string;
};

export type PatchChange = {
  kind: "buff" | "nerf" | "adjust" | "new";
  subject: string;
  detail: string;
};

export type Patch = {
  patch: string;
  setNumber: number;
  title: string;
  releasedAt: string;
  /** Plain-language summary of Riot's notes — never a copy-paste. */
  summary: string;
  changes: PatchChange[];
  metaRead: {
    headline: string;
    paragraphs: string[];
  };
  /**
   * Data-driven movers. Empty until the crawler has patch-window data; the page
   * renders a "collecting data" note rather than pretending.
   */
  risers: { compSlug: string; label: string; delta: string }[];
  fallers: { compSlug: string; label: string; delta: string }[];
  sourceUrl: string;
};
