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
