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
 * Comp archetype (docs/decisions.md D14).
 *
 * A closed set rather than free text, because the tier list filters on it: "Fast 8"
 * as a string cannot be offered as a filter chip without a vocabulary to enumerate.
 */
export type Playstyle =
  | "Fast 8"
  | "Fast 9"
  | "Slow roll"
  | "Reroll"
  | "Standard"
  | "Emblem"
  | "Augment"
  | "Flex";

/**
 * Ordered augment *categories*, not a score per augment.
 *
 * This is the honest shape while the corpus has no augment rows: it says "take an
 * econ augment before a combat one" without pretending to rank 600 augments.
 */
export type AugmentPriority = "ECON" | "ITEMS" | "COMBAT" | "EMBLEM" | "HERO";

/** One step of the stage-by-stage gameplan. Stage "5+" is the cap-out. */
export type CompStage = {
  stage: "2" | "3" | "4" | "5+";
  plan: string;
};

/**
 * Item priority for one unit: best-in-slot first, then the components you settle
 * for. Riot item ids, so each step resolves to a name and an icon.
 */
export type ItemPriority = {
  unitId: string;
  chain: string[];
};

/**
 * One authored board position. `row` 0 is the front line, `col` 0 is the left edge,
 * on a 4-row × 7-col half-board.
 *
 * Authored, never derived: the TFT match payload carries no board coordinates, and
 * `participant_units.slot` is array order, not a hex position (docs/decisions.md D15).
 */
export type BoardPosition = {
  unitId: string;
  row: number;
  col: number;
};

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
  /**
   * Riot item ids, e.g. `DA_GuinsoosRageblade` (docs/decisions.md D11).
   *
   * Ids rather than display names because these are the values the crawler stores
   * on `participant_units.item_0..2`, so an item can be joined to its stats later,
   * and because a name alone cannot resolve an icon. Names and icons come from the
   * `items` catalogue; an unknown id renders unresolved rather than guessed.
   */
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
  /** Slot items resolved against the item catalogue; unknown ids stay null-named. */
  resolvedItems: ResolvedItem[];
};

/** One item, resolved against the catalogue. `null` name means the id is unknown. */
export type ResolvedItem = {
  id: string;
  name: string | null;
  imageUrl: string | null;
};

/** A board position resolved against the catalogue, for the positioning board. */
export type PositionedUnit = BoardPosition & {
  name: string | null;
  imageUrl: string | null;
  cost: number | null;
  star: Star | null;
};

/** An item-priority chain resolved for display: no unresolved id is ever hidden. */
export type ResolvedPriority = {
  unitId: string;
  unitName: string | null;
  chain: ResolvedItem[];
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

/** One site's verdict on a comp, kept verbatim so the average is auditable. */
export type TierSource = {
  /** Site name, e.g. "EmblemComp". */
  source: string;
  /** Its letter as published: S, S+, A, B, C, D. */
  tier: string;
};

/**
 * The consensus tier behind a comp's letter.
 *
 * `score` is the mean of the published letters (S/S+ = 4, A = 3, B = 2, C = 1,
 * D = 0) across every source that lists the comp. The individual letters travel
 * with it because an average nobody can audit is just an opinion with decimals.
 */
export type Consensus = {
  score: number;
  sources: TierSource[];
};

/** The leave signal, and what to play instead. */
export type CompAbandon = {
  when: string;
  instead: string;
};

export type Comp = {
  slug: string;
  name: string;
  tier: Tier;
  /** Letter derived from the averaged tier lists; `tier` is its band. */
  consensus: Consensus;
  /** "Only play this if…" — every entry is checkable in game. */
  preconditions: string[];
  /** When to leave the comp, and the cheaper board to move to. */
  abandon: CompAbandon;
  /** The one situation in which this guide is wrong. */
  counterCase: string;
  setNumber: number;
  patch: string;
  /** Archetype, from the closed vocabulary so the tier list can filter on it. */
  playstyle: Playstyle;
  difficulty: "Easy" | "Medium" | "Hard";
  /** One line: what this board is trying to do. */
  summary: string;
  /** The leveling/rolling plan, in the player's words. */
  leveling: string;
  /** Stage 2, 3, 4 and the cap-out, as concrete instructions. */
  stages: CompStage[];
  /** Best-in-slot then fallback components, per carry. */
  itemPriority: ItemPriority[];
  /** Ordered augment categories — the shape used while no augment data exists. */
  augmentPriority: AugmentPriority[];
  /** Authored starting layout. Absent means the page shows no positioning board. */
  positioning?: BoardPosition[];
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

/** One half of a within-patch momentum comparison. */
export type MomentumHalf = {
  games: number;
  /** 0..1 */
  top4Rate: number;
  avgPlace: number;
};

/**
 * How one comp moved between the first and second half of a single patch's
 * crawl window. This is intra-patch drift, not a riser or faller.
 */
export type MomentumEntry = {
  compSlug: string;
  label: string;
  first: MomentumHalf;
  second: MomentumHalf;
  /** second minus first, in fraction points of top-4 rate */
  top4Delta: number;
  /** second minus first, in placement (negative is better) */
  placeDelta: number;
};

/**
 * Measured inside one patch. Written by `npm run momentum:measure`, never
 * estimated: the window, split timestamp and sample sizes travel with the data.
 */
export type PatchMomentum = {
  generatedAt: string;
  /** e.g. "first half vs second half of the 18.6 crawl window" */
  label: string;
  patch: string;
  setNumber: number;
  scope: string;
  windowStart: string;
  windowEnd: string;
  splitAt: string;
  matches: number;
  boards: number;
  classified: number;
  /** A comp must clear this many games in both halves to be reported. */
  minGames: number;
  source: string;
  entries: MomentumEntry[];
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
   * Within-patch drift, measured first half vs second half of the crawl window.
   * Deliberately separate from risers/fallers: those are patch-over-patch, this
   * is not, and the page says so.
   */
  momentum?: PatchMomentum | null;
  sourceUrl: string;
};

/** One block of guide prose. Authored, so a list is a list rather than a paragraph. */
export type GuideBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

export type GuideSection = {
  id: string;
  heading: string;
  blocks: GuideBlock[];
};

/**
 * A long-form guide.
 *
 * Deliberately carries no stats payload: a guide that stops working when the
 * database is empty is a table with prose around it (docs/guide-standard.md §5).
 * `measured` and `judgement` are the visible labels the standard requires, and
 * `counterCase` is the one situation in which the guide is wrong.
 */
export type Guide = {
  slug: string;
  title: string;
  /** One line for the index card. */
  dek: string;
  /** The question this guide answers, in the reader's words. */
  answers: string;
  setNumber: number;
  patch: string;
  readingMinutes: number;
  updatedAt: string;
  /** What the numbers on this page are, and where they come from. */
  measured: string;
  /** What is the author's read rather than a measurement. */
  judgement: string;
  /** The line the guide says it is wrong on. Never omitted. */
  counterCase: string;
  /**
   * Mechanics references for the rules quoted in the guide — Riot's numbers, not
   * our measurements. Optional, because not every guide quotes game rules.
   */
  sources?: { label: string; href: string }[];
  /**
   * Comp pages that surface this guide. Authored here rather than on the comp, so
   * the relevance is decided once, next to the argument it supports.
   */
  compSlugs: string[];
  sections: GuideSection[];
};
