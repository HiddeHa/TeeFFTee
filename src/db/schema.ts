import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * SCHEMA — see docs/blueprint.md §7
 *
 * Three layers, deliberately kept apart:
 *   RAW        append-only facts from Riot match payloads
 *   CURATED    comps and notes written by hand
 *   DERIVED    aggregate stats the site reads
 *
 * Rules that matter:
 *  - Every table that holds game data is keyed by patch/set. A new set must be a
 *    data load, never a code change.
 *  - Never hardcode unit or trait ids in application code; they live here.
 *  - `comp_stats` is what pages query. Pages must never aggregate raw rows.
 */

/**
 * Counts a derived rate on `board_patterns` needs, stored as the count rather
 * than the rate it produces. Every field is optional because each pattern kind
 * carries only the ones it uses.
 */
export type PatternExtra = {
  /** Units: star levels summed, so avgStar is starSum ÷ sample. */
  starSum?: number;
  /** Duos: boards holding either unit — the denominator for overlap. */
  either?: number;
  /** Trios: boards holding any of the three — the denominator for overlap. */
  anyBoards?: number;
  /** Traits: activation tiers summed, so avgTier is tierSum ÷ sample. */
  tierSum?: number;
};

/* -------------------------------------------------------------------------- */
/* Static game data (loaded per set from Data Dragon / Community Dragon)      */
/* -------------------------------------------------------------------------- */

export const patches = pgTable("patches", {
  patch: text("patch").primaryKey(),
  setNumber: smallint("set_number").notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  notesUrl: text("notes_url"),
});

export const units = pgTable(
  "units",
  {
    unitId: text("unit_id").primaryKey(),
    setNumber: smallint("set_number").notNull(),
    name: text("name").notNull(),
    cost: smallint("cost").notNull(),
    traits: text("traits").array().notNull().default([]),
    imageUrl: text("image_url"),
  },
  (table) => [index("units_set_idx").on(table.setNumber)],
);

export const traits = pgTable("traits", {
  traitId: text("trait_id").primaryKey(),
  setNumber: smallint("set_number").notNull(),
  name: text("name").notNull(),
  /** Activation counts, ascending — e.g. [3, 5, 7, 9] for a breakpointed trait. */
  breakpoints: integer("breakpoints").array().notNull().default([]),
  imageUrl: text("image_url"),
});

export const items = pgTable("items", {
  itemId: text("item_id").primaryKey(),
  setNumber: smallint("set_number").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  imageUrl: text("image_url"),
});

export const augments = pgTable("augments", {
  augmentId: text("augment_id").primaryKey(),
  setNumber: smallint("set_number").notNull(),
  name: text("name").notNull(),
  tier: text("tier").notNull(),
  imageUrl: text("image_url"),
});

/* -------------------------------------------------------------------------- */
/* Crawler state + raw match data                                             */
/* -------------------------------------------------------------------------- */

export const players = pgTable(
  "players",
  {
    puuid: text("puuid").primaryKey(),
    /**
     * Riot ID, resolved one request per player from account-v1 by `crawl -- names`.
     * Null means "not resolved yet", never "unnamed": the pages fall back to a
     * shortened PUUID rather than inventing a handle.
     */
    gameName: text("game_name"),
    tagLine: text("tag_line"),
    region: text("region").notNull(),
    tier: text("tier").notNull(),
    lp: integer("lp").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    /** Newest match already discovered for this player — resume point. */
    lastCursor: timestamp("last_cursor", { withTimezone: true }),
  },
  (table) => [index("players_region_tier_idx").on(table.region, table.tier)],
);

export const matchQueue = pgTable(
  "match_queue",
  {
    matchId: text("match_id").primaryKey(),
    region: text("region").notNull(),
    /** pending | fetching | done | failed */
    status: text("status").notNull().default("pending"),
    attempts: smallint("attempts").notNull().default(0),
    enqueuedAt: timestamp("enqueued_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when a worker claims the row; stale claims are reclaimed after a crash. */
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    lastError: text("last_error"),
  },
  (table) => [index("match_queue_status_idx").on(table.status, table.enqueuedAt)],
);

export const matches = pgTable(
  "matches",
  {
    matchId: text("match_id").primaryKey(),
    region: text("region").notNull(),
    patch: text("patch").notNull(),
    setNumber: smallint("set_number").notNull(),
    queueId: integer("queue_id"),
    gameDatetime: timestamp("game_datetime", { withTimezone: true }),
    gameVersion: text("game_version"),
    /** Raw payload kept so a normalizer fix does not require a re-crawl. */
    raw: jsonb("raw"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("matches_patch_idx").on(table.patch),
    index("matches_datetime_idx").on(table.gameDatetime),
  ],
);

export const participants = pgTable(
  "participants",
  {
    matchId: text("match_id")
      .notNull()
      .references(() => matches.matchId, { onDelete: "cascade" }),
    puuid: text("puuid").notNull(),
    placement: smallint("placement").notNull(),
    level: smallint("level"),
    lastRound: smallint("last_round"),
    goldLeft: smallint("gold_left"),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.puuid] }),
    index("participants_puuid_idx").on(table.puuid),
  ],
);

export const participantUnits = pgTable(
  "participant_units",
  {
    matchId: text("match_id").notNull(),
    puuid: text("puuid").notNull(),
    unitId: text("unit_id").notNull(),
    starLevel: smallint("star_level").notNull().default(1),
    item0: text("item_0"),
    item1: text("item_1"),
    item2: text("item_2"),
    /**
     * Board position, taken from the payload array index. Part of the primary
     * key so two copies of the same unit can never collide on insert.
     */
    slot: smallint("slot").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.puuid, table.slot] }),
    index("participant_units_unit_idx").on(table.unitId),
  ],
);

export const participantTraits = pgTable(
  "participant_traits",
  {
    matchId: text("match_id").notNull(),
    puuid: text("puuid").notNull(),
    traitId: text("trait_id").notNull(),
    numUnits: smallint("num_units").notNull().default(0),
    tierCurrent: smallint("tier_current").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.matchId, table.puuid, table.traitId] })],
);

export const participantAugments = pgTable(
  "participant_augments",
  {
    matchId: text("match_id").notNull(),
    puuid: text("puuid").notNull(),
    augmentId: text("augment_id").notNull(),
    slotIndex: smallint("slot_index").notNull(),
  },
  (table) => [primaryKey({ columns: [table.matchId, table.puuid, table.slotIndex] })],
);

/* -------------------------------------------------------------------------- */
/* Curated layer                                                              */
/* -------------------------------------------------------------------------- */

export const comps = pgTable(
  "comps",
  {
    compId: uuid("comp_id").primaryKey().defaultRandom(),
    setNumber: smallint("set_number").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tier: text("tier").notNull(),
    /** Also the assignment signature: boards match on core-unit overlap. */
    coreUnits: text("core_units").array().notNull().default([]),
    flexUnits: text("flex_units").array().notNull().default([]),
    /**
     * A board only counts for this comp if this trait is active. Null means the
     * comp is defined by its units alone (blueprint §8).
     */
    definingTrait: text("defining_trait"),
    difficulty: text("difficulty").notNull().default("Medium"),
    playstyle: text("playstyle").notNull().default("Standard"),
    summary: text("summary").notNull().default(""),
    leveling: text("leveling").notNull().default(""),
    notesWhyNow: text("notes_why_now").notNull().default(""),
    notesHowToPlay: text("notes_how_to_play").notNull().default(""),
    notesMistakes: text("notes_mistakes").notNull().default(""),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("comps_set_published_idx").on(table.setNumber, table.published)],
);

export const compItems = pgTable(
  "comp_items",
  {
    compId: uuid("comp_id")
      .notNull()
      .references(() => comps.compId, { onDelete: "cascade" }),
    unitId: text("unit_id").notNull(),
    itemIds: text("item_ids").array().notNull().default([]),
    priority: smallint("priority").notNull().default(0),
    starLevel: smallint("star_level").notNull().default(2),
  },
  (table) => [primaryKey({ columns: [table.compId, table.unitId] })],
);

export const compAugments = pgTable(
  "comp_augments",
  {
    compId: uuid("comp_id")
      .notNull()
      .references(() => comps.compId, { onDelete: "cascade" }),
    augmentId: text("augment_id").notNull(),
    priority: smallint("priority").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.compId, table.augmentId] })],
);

/* -------------------------------------------------------------------------- */
/* Derived layer — the only thing pages should query                          */
/* -------------------------------------------------------------------------- */

/**
 * Measured augment performance inside one comp, in one scope.
 *
 * `participant_augments` has carried every taken augment since the first fetch,
 * but nothing read it, so the comp page's augment advice was editorial. This is
 * the derived table that lets the page quote the boards instead.
 *
 * Scoped exactly like `comp_stats` (patch, region, rank bucket), so the two can
 * be compared: an augment's games are a subset of the comp's games in the same
 * key, which is what makes "with this augment" and "this comp's average"
 * comparable on read without a join back to raw rows.
 *
 * Counts, not rates, for the same reason as `comp_stats`: sums stay exact when
 * regions are combined, and the average placement, the rates and the delta are
 * derived in `src/lib/augment-stats.ts`.
 */
export const compAugmentStats = pgTable(
  "comp_augment_stats",
  {
    compId: uuid("comp_id")
      .notNull()
      .references(() => comps.compId, { onDelete: "cascade" }),
    patch: text("patch").notNull(),
    region: text("region").notNull(),
    /** 'master+' | 'diamond+' | 'all' */
    rankBucket: text("rank_bucket").notNull(),
    augmentId: text("augment_id").notNull(),
    games: integer("games").notNull().default(0),
    placeSum: integer("place_sum").notNull().default(0),
    top4Count: integer("top4_count").notNull().default(0),
    winCount: integer("win_count").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.compId, table.patch, table.region, table.rankBucket, table.augmentId],
    }),
    index("comp_augment_stats_scope_idx").on(table.patch, table.rankBucket),
  ],
);

/**
 * A materialised AInalyses study: one row per set, replaced by
 * `npm run crawl -- patterns`.
 *
 * Counts, not rates — the same rule `comp_stats` follows. The mining itself
 * (the self-joins over `participant_units`) runs in the crawler, because the
 * page must not pay for a triple join per request as the crawl grows.
 */
export const boardStudies = pgTable("board_studies", {
  setNumber: smallint("set_number").primaryKey(),
  patches: text("patches").array().notNull().default([]),
  matches: integer("matches").notNull().default(0),
  boards: integer("boards").notNull().default(0),
  unitsSeen: integer("units_seen").notNull().default(0),
  itemsSeen: integer("items_seen").notNull().default(0),
  itemSlots: integer("item_slots").notNull().default(0),
  placeSum: integer("place_sum").notNull().default(0),
  top4Count: integer("top4_count").notNull().default(0),
  winCount: integer("win_count").notNull().default(0),
  /** Thresholds travel with the snapshot, so the page never quotes a stale one. */
  minSample: smallint("min_sample").notNull().default(25),
  minPairSample: smallint("min_pair_sample").notNull().default(15),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One mined pattern, keyed by kind and its own identity key.
 *
 * Ids only. Names, costs and icons are resolved against the set catalogue on
 * read, exactly like every other board on the site: a renamed unit converges
 * instead of keeping a stale name in a derived table.
 *
 * `kinds`: `unit` | `duo` | `core` | `item` | `item-unit` | `trait`.
 * `extra` carries the counts a rate needs (`{"either":12000}` for a duo,
 * `{"anyBoards":9000}` for a trio, `{"starSum":48000}` for a unit,
 * `{"tierSum":5400}` for a trait) — never a rate, because rates do not combine
 * across scopes the way counts do.
 */
export const boardPatterns = pgTable(
  "board_patterns",
  {
    setNumber: smallint("set_number")
      .notNull()
      .references(() => boardStudies.setNumber, { onDelete: "cascade" }),
    /** unit | duo | core | item | item-unit | trait */
    kind: text("kind").notNull(),
    /** Unit id, `a\u0001b`, `a\u0001b\u0001c`, item id, `unit\u0001item`, or trait id. */
    key: text("key").notNull(),
    /** 1-based display order within the kind. */
    rank: smallint("rank").notNull(),
    sample: integer("sample").notNull().default(0),
    placeSum: integer("place_sum").notNull().default(0),
    top4Count: integer("top4_count").notNull().default(0),
    winCount: integer("win_count").notNull().default(0),
    extra: jsonb("extra").$type<PatternExtra>().notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.setNumber, table.kind, table.key] }),
    index("board_patterns_rank_idx").on(table.setNumber, table.kind, table.rank),
  ],
);

export const compStats = pgTable(
  "comp_stats",
  {
    compId: uuid("comp_id")
      .notNull()
      .references(() => comps.compId, { onDelete: "cascade" }),
    patch: text("patch").notNull(),
    region: text("region").notNull(),
    /** 'master+' | 'diamond+' | 'all' */
    rankBucket: text("rank_bucket").notNull(),
    games: integer("games").notNull().default(0),
    /**
     * Sum of placements, not an average. Counts are stored because they can be
     * summed across regions exactly; rates cannot (and pick rate needs its
     * denominator, `boards`). Every rate and the Wilson bound are derived at
     * read time in src/lib/stats-source.ts.
     */
    placeSum: integer("place_sum").notNull().default(0),
    top4Count: integer("top4_count").notNull().default(0),
    winCount: integer("win_count").notNull().default(0),
    /** Total boards in this scope, including unclassified ones. */
    boards: integer("boards").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.compId, table.patch, table.region, table.rankBucket],
    }),
    index("comp_stats_patch_idx").on(table.patch, table.rankBucket),
  ],
);
