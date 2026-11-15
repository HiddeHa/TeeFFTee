import { and, eq, gt, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import { matches, participants, participantTraits, participantUnits } from "@/db/schema";

import { loadItemCatalogue } from "./items";
import { loadTraitCatalogue } from "./traits";
import { loadUnitCatalogue } from "./units";

/**
 * PATTERN MINING over the crawled boards.
 *
 * Aggregates `participant_units`, `participant_traits` and `participants` into the
 * six questions the data can actually answer:
 *
 *   units     which units appear on the most boards, and how those boards placed
 *   duos      which two units share a board more often than their play rates
 *             would explain, and whether the pair finishes better than either
 *   items     which items are held most often, and how those boards placed
 *   popular   which item a specific unit actually holds, most-held first
 *   pairings  which item on which unit performed best (the carry, not the item)
 *   traits    which active traits boards reached, and how they placed
 *
 * Duos are the only mining here with a join across boards (a self-join of
 * `participant_units`), so it is scoped to the most-played units rather than the
 * whole table: a pair involving a unit nobody plays is not a pattern, it is an
 * anecdote with a champion attached.
 *
 * Two rules keep this honest:
 *
 *  1. **Support comes first.** Nothing is reported below `MIN_SAMPLE` boards (or
 *     `MIN_PAIR_SAMPLE` slots for a pairing). A 3-board average is noise with a
 *     decimal point.
 *  2. **It is evidence, not advice.** Average placement next to the sample
 *     baseline is correlation: an item on winning boards may be a consequence of
 *     winning, not a cause. Every number carries its sample so the reader can
 *     judge it, and the page says so in prose.
 *
 * Only final boards are stored in the crawl — no bench, no gold curve, no
 * augment order — so nothing here claims to measure those. Ids resolve through
 * the set catalogue exactly like the rest of the site: an unknown id keeps its
 * raw name rather than being guessed.
 */

export const MIN_SAMPLE = 25;
export const MIN_PAIR_SAMPLE = 15;

const UNIT_LIMIT = 15;
const ITEM_LIMIT = 15;
const PAIR_LIMIT = 10;
const POPULAR_PAIR_LIMIT = 12;
const UNIT_PAIR_LIMIT = 12;
const TRAIT_LIMIT = 15;

/**
 * The board table joined to itself. Two rows share a board when they share the
 * (match, player) key — the same key every other query here carries.
 */
const unitA = alias(participantUnits, "unit_a");
const unitB = alias(participantUnits, "unit_b");

export type PatternSample = {
  /** Boards (or item slots, for a pairing) behind the numbers. */
  sample: number;
  avgPlace: number;
  top4Rate: number;
  winRate: number;
  /**
   * Baseline average placement minus this pattern's average, so a positive
   * number is a better finish (fewer places). This is the only comparison the
   * page makes, and it compares like with like: same set, same crawl.
   */
  placeGain: number;
};

export type ResolvedUnit = {
  id: string;
  /** Null when the set catalogue does not know the id — the UI shows the raw id. */
  name: string | null;
  imageUrl: string | null;
  cost: number | null;
};

export type ResolvedItem = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  kind: string | null;
};

export type UnitPattern = PatternSample & ResolvedUnit & {
  avgStar: number;
  /** The two items this unit held most often on those boards. */
  items: ResolvedItem[];
};

export type ItemPattern = PatternSample & ResolvedItem & {
  /** The unit that held it most often in the mined sample; null when unseen. */
  holder: (ResolvedUnit & { share: number }) | null;
};

export type PairingPattern = PatternSample & {
  unit: ResolvedUnit;
  item: ResolvedItem;
};

/**
 * The same unit/item shape, ranked by how often it happens rather than how well
 * it finished — the "what does this champion build" question.
 */
export type PopularPairingPattern = PairingPattern & {
  /** 0..1 — share of that unit's item slots this item accounts for. */
  share: number;
};

export type UnitPairPattern = PatternSample & {
  /** The two units, alphabetically by id, so a pair is stored one way only. */
  a: ResolvedUnit;
  b: ResolvedUnit;
  /**
   * 0..1 — boards holding both ÷ boards holding either. This is the pairing
   * signal: two champions that are each on 40% of boards and never together
   * score 0, two that only ever appear together score 1.
   */
  overlap: number;
  /**
   * The pair's average placement against the mean of the two units' own
   * averages. Positive means the pair finished better together than the two do
   * apart. Descriptive, not causal: a duo can be good because of the comp around
   * it, and a unit that only appears on winning boards drags its partner up.
   */
  togetherGain: number;
};

export type TraitPattern = PatternSample & {
  id: string;
  name: string | null;
  imageUrl: string | null;
  /** Mean activation tier: 1 = first breakpoint, 2 = second, and so on. */
  avgTier: number;
};

export type AnalysisSummary = {
  setNumber: number;
  patches: string[];
  matches: number;
  boards: number;
  /** Unit ids and item ids seen in the sample — including ones below the threshold. */
  unitsSeen: number;
  itemsSeen: number;
  itemSlots: number;
  avgPlace: number;
  top4Rate: number;
  winRate: number;
  minSample: number;
  minPairSample: number;
};

export type BoardAnalysis =
  | { kind: "unavailable" }
  | {
      kind: "ok";
      summary: AnalysisSummary;
      units: UnitPattern[];
      unitPairs: UnitPairPattern[];
      items: ItemPattern[];
      popularPairings: PopularPairingPattern[];
      pairings: PairingPattern[];
      traits: TraitPattern[];
    };

type Counts = { sample: number; placeSum: number; top4: number; wins: number };

function emptyCounts(): Counts {
  return { sample: 0, placeSum: 0, top4: 0, wins: 0 };
}

function addCounts(target: Counts, source: Counts): void {
  target.sample += source.sample;
  target.placeSum += source.placeSum;
  target.top4 += source.top4;
  target.wins += source.wins;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Counts → the rate shape the UI renders, against one baseline. */
function sampleOf(counts: Counts, baselineAvgPlace: number): PatternSample {
  const avgPlace = counts.sample > 0 ? counts.placeSum / counts.sample : 0;
  return {
    sample: counts.sample,
    avgPlace: round2(avgPlace),
    top4Rate: counts.sample > 0 ? round2(counts.top4 / counts.sample) : 0,
    winRate: counts.sample > 0 ? round2(counts.wins / counts.sample) : 0,
    placeGain: round2(baselineAvgPlace - avgPlace),
  };
}

let warnedAboutDatabase = false;

/**
 * Null-safe key for a merged row. Postgres returns the item column as text; the
 * driver may hand back null for a filtered column in a union-like merge, so the
 * guard is real rather than defensive noise.
 */
function keyOf(value: string | null): string | null {
  return value === null || value === "" ? null : value;
}

/**
 * Read and aggregate one set's boards.
 *
 * `unavailable` means no DATABASE_URL or Postgres did not answer — the same
 * contract as `players.ts`, because an analytics page with no database has
 * nothing to analyse and must say that rather than show zeros as measurements.
 */
export async function analyseBoards(setNumber: number): Promise<BoardAnalysis> {
  if (!process.env.DATABASE_URL) return { kind: "unavailable" };

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return { kind: "unavailable" };
  }

  try {
    const inSet = eq(matches.setNumber, setNumber);
    // A board is one (match, participant) row. Every join below carries both
    // halves of that key, or a unit row could be counted against the wrong
    // player's placement.
    const participantsOnBoard = and(
      eq(participants.matchId, participantUnits.matchId),
      eq(participants.puuid, participantUnits.puuid),
    );

    const [baselineRows, patchRows, diversityRows, unitRows, traitRows] = await Promise.all([
      db
        .select({
          boards: sql<number>`count(*)::int`,
          matches: sql<number>`count(distinct ${matches.matchId})::int`,
          placeSum: sql<number>`coalesce(sum(${participants.placement}), 0)::int`,
          top4: sql<number>`(count(*) filter (where ${participants.placement} <= 4))::int`,
          wins: sql<number>`(count(*) filter (where ${participants.placement} = 1))::int`,
        })
        .from(participants)
        .innerJoin(matches, eq(participants.matchId, matches.matchId))
        .where(inSet),
      db
        .selectDistinct({ patch: matches.patch })
        .from(matches)
        .where(inSet),
      db
        .select({
          units: sql<number>`count(distinct ${participantUnits.unitId})::int`,
          slots: sql<number>`count(*)::int`,
        })
        .from(participantUnits)
        .innerJoin(matches, eq(participantUnits.matchId, matches.matchId))
        .where(inSet),
      db
        .select({
          unitId: participantUnits.unitId,
          sample: sql<number>`count(*)::int`,
          placeSum: sql<number>`coalesce(sum(${participants.placement}), 0)::int`,
          top4: sql<number>`(count(*) filter (where ${participants.placement} <= 4))::int`,
          wins: sql<number>`(count(*) filter (where ${participants.placement} = 1))::int`,
          starSum: sql<number>`coalesce(sum(${participantUnits.starLevel}), 0)::int`,
        })
        .from(participantUnits)
        .innerJoin(matches, eq(participantUnits.matchId, matches.matchId))
        .innerJoin(participants, participantsOnBoard)
        .where(inSet)
        .groupBy(participantUnits.unitId)
        .having(sql`count(*) >= ${MIN_SAMPLE}`)
        .orderBy(sql`count(*) desc, ${participantUnits.unitId} asc`)
        .limit(UNIT_LIMIT),
      db
        .select({
          traitId: participantTraits.traitId,
          sample: sql<number>`count(*)::int`,
          placeSum: sql<number>`coalesce(sum(${participants.placement}), 0)::int`,
          top4: sql<number>`(count(*) filter (where ${participants.placement} <= 4))::int`,
          wins: sql<number>`(count(*) filter (where ${participants.placement} = 1))::int`,
          tierSum: sql<number>`coalesce(sum(${participantTraits.tierCurrent}), 0)::int`,
        })
        .from(participantTraits)
        .innerJoin(matches, eq(participantTraits.matchId, matches.matchId))
        .innerJoin(
          participants,
          and(
            eq(participants.matchId, participantTraits.matchId),
            eq(participants.puuid, participantTraits.puuid),
          ),
        )
        // Tier 0 means the trait never reached its first breakpoint, which is
        // not a pattern a board achieved.
        .where(and(inSet, gt(participantTraits.tierCurrent, 0)))
        .groupBy(participantTraits.traitId)
        .having(sql`count(*) >= ${MIN_SAMPLE}`)
        .orderBy(sql`count(*) desc, ${participantTraits.traitId} asc`)
        .limit(TRAIT_LIMIT),
    ]);

    const baseline = baselineRows[0];
    const boards = baseline?.boards ?? 0;
    const baselineAvgPlace = boards > 0 ? (baseline?.placeSum ?? 0) / boards : 0;

    const unitIds = unitRows.map((row) => row.unitId);

    // A slot holds at most three items, so these three columns are the whole
    // story. Grouping each column separately and merging in JS is the same
    // result as a UNION ALL, without a raw lateral join the HTTP driver would
    // have to parse differently.
    const slotColumns = [participantUnits.item0, participantUnits.item1, participantUnits.item2];

    const [itemSlotRows, pairRows, duoRows] = await Promise.all([
      Promise.all(
        slotColumns.map((column) =>
          db
            .select({
              itemId: sql<string>`${column}`,
              sample: sql<number>`count(*)::int`,
              placeSum: sql<number>`coalesce(sum(${participants.placement}), 0)::int`,
              top4: sql<number>`(count(*) filter (where ${participants.placement} <= 4))::int`,
              wins: sql<number>`(count(*) filter (where ${participants.placement} = 1))::int`,
            })
            .from(participantUnits)
            .innerJoin(matches, eq(participantUnits.matchId, matches.matchId))
            .innerJoin(participants, participantsOnBoard)
            .where(and(inSet, isNotNull(column)))
            .groupBy(column),
        ),
      ),
      unitIds.length === 0
        ? Promise.resolve([] as (Counts & { unitId: string; itemId: string })[])
        : Promise.all(
            slotColumns.map((column) =>
              db
                .select({
                  unitId: participantUnits.unitId,
                  itemId: sql<string>`${column}`,
                  sample: sql<number>`count(*)::int`,
                  placeSum: sql<number>`coalesce(sum(${participants.placement}), 0)::int`,
                  top4: sql<number>`(count(*) filter (where ${participants.placement} <= 4))::int`,
                  wins: sql<number>`(count(*) filter (where ${participants.placement} = 1))::int`,
                })
                .from(participantUnits)
                .innerJoin(matches, eq(participantUnits.matchId, matches.matchId))
                .innerJoin(participants, participantsOnBoard)
                .where(and(inSet, isNotNull(column), inArray(participantUnits.unitId, unitIds)))
                .groupBy(participantUnits.unitId, column),
            ),
          ).then((groups) => groups.flat()),
      // Scoped to the units already above the threshold on both sides: that is
      // at most 105 pairs to count, instead of every champion in the set.
      unitIds.length < 2
        ? Promise.resolve([] as (Counts & { aUnitId: string; bUnitId: string })[])
        : db
            .select({
              aUnitId: unitA.unitId,
              bUnitId: unitB.unitId,
              sample: sql<number>`count(*)::int`,
              placeSum: sql<number>`coalesce(sum(${participants.placement}), 0)::int`,
              top4: sql<number>`(count(*) filter (where ${participants.placement} <= 4))::int`,
              wins: sql<number>`(count(*) filter (where ${participants.placement} = 1))::int`,
            })
            .from(unitA)
            .innerJoin(
              unitB,
              and(
                eq(unitB.matchId, unitA.matchId),
                eq(unitB.puuid, unitA.puuid),
                // One row per unordered pair, whichever id sorts first.
                lt(unitA.unitId, unitB.unitId),
              ),
            )
            .innerJoin(matches, eq(matches.matchId, unitA.matchId))
            .innerJoin(
              participants,
              and(
                eq(participants.matchId, unitA.matchId),
                eq(participants.puuid, unitA.puuid),
              ),
            )
            .where(
              and(
                inSet,
                inArray(unitA.unitId, unitIds),
                inArray(unitB.unitId, unitIds),
              ),
            )
            .groupBy(unitA.unitId, unitB.unitId)
            .having(sql`count(*) >= ${MIN_SAMPLE}`)
            .orderBy(sql`count(*) desc`)
            .limit(UNIT_PAIR_LIMIT * 4),
    ]);

    // Item totals across all slots.
    const itemTotals = new Map<string, Counts>();
    for (const rows of itemSlotRows) {
      for (const row of rows) {
        const itemId = keyOf(row.itemId);
        if (!itemId) continue;
        const counts = itemTotals.get(itemId) ?? emptyCounts();
        addCounts(counts, row);
        itemTotals.set(itemId, counts);
      }
    }

    // Unit × item: supports both the pair ranking and each unit's common items.
    const pairTotals = new Map<string, Counts & { unitId: string; itemId: string }>();
    for (const row of pairRows) {
      const itemId = keyOf(row.itemId);
      if (!itemId || !row.unitId) continue;
      const key = `${row.unitId}\u0001${itemId}`;
      const counts = pairTotals.get(key) ?? { ...emptyCounts(), unitId: row.unitId, itemId };
      addCounts(counts, row);
      pairTotals.set(key, counts);
    }

    const unitItems = new Map<string, { itemId: string; sample: number }[]>();
    const itemHolders = new Map<string, { unitId: string; sample: number }[]>();
    // Denominator for "this item is X% of that unit's items" — every slotted
    // item that unit held, not every item in the set.
    const unitSlotTotals = new Map<string, number>();
    for (const entry of pairTotals.values()) {
      const forUnit = unitItems.get(entry.unitId) ?? [];
      forUnit.push({ itemId: entry.itemId, sample: entry.sample });
      unitItems.set(entry.unitId, forUnit);

      const forItem = itemHolders.get(entry.itemId) ?? [];
      forItem.push({ unitId: entry.unitId, sample: entry.sample });
      itemHolders.set(entry.itemId, forItem);

      unitSlotTotals.set(entry.unitId, (unitSlotTotals.get(entry.unitId) ?? 0) + entry.sample);
    }

    // Each unit's own boards and average, for the "better together than apart"
    // comparison. Same rows as the units list, so the two sections agree.
    const unitBoards = new Map<string, number>();
    const unitAvgPlace = new Map<string, number>();
    for (const row of unitRows) {
      unitBoards.set(row.unitId, row.sample);
      if (row.sample > 0) unitAvgPlace.set(row.unitId, row.placeSum / row.sample);
    }

    const [unitIndex, itemIndex, traitIndex] = await Promise.all([
      loadUnitCatalogue(setNumber),
      loadItemCatalogue(setNumber),
      loadTraitCatalogue(setNumber),
    ]);

    const resolveUnit = (unitId: string): ResolvedUnit => {
      const unit = unitIndex?.get(unitId) ?? null;
      return {
        id: unitId,
        name: unit?.name ?? null,
        imageUrl: unit?.imageUrl ?? null,
        cost: unit?.cost ?? null,
      };
    };

    const resolveItem = (itemId: string): ResolvedItem => {
      const item = itemIndex?.get(itemId) ?? null;
      return {
        id: itemId,
        name: item?.name ?? null,
        imageUrl: item?.imageUrl ?? null,
        kind: item?.kind ?? null,
      };
    };

    const units: UnitPattern[] = unitRows.map((row) => {
      const counts: Counts = {
        sample: row.sample,
        placeSum: row.placeSum,
        top4: row.top4,
        wins: row.wins,
      };
      const commonItems = [...(unitItems.get(row.unitId) ?? [])]
        .sort((a, b) => b.sample - a.sample || a.itemId.localeCompare(b.itemId))
        .slice(0, 2)
        .map((entry) => resolveItem(entry.itemId));

      return {
        ...resolveUnit(row.unitId),
        ...sampleOf(counts, baselineAvgPlace),
        avgStar: row.sample > 0 ? round2(row.starSum / row.sample) : 0,
        items: commonItems,
      };
    });

    const items: ItemPattern[] = [...itemTotals.entries()]
      .filter(([, counts]) => counts.sample >= MIN_SAMPLE)
      .sort((a, b) => b[1].sample - a[1].sample || a[0].localeCompare(b[0]))
      .slice(0, ITEM_LIMIT)
      .map(([itemId, counts]) => {
        const holder = [...(itemHolders.get(itemId) ?? [])].sort(
          (a, b) => b.sample - a.sample || a.unitId.localeCompare(b.unitId),
        )[0];

        return {
          ...resolveItem(itemId),
          ...sampleOf(counts, baselineAvgPlace),
          holder:
            holder && counts.sample > 0
              ? { ...resolveUnit(holder.unitId), share: round2(holder.sample / counts.sample) }
              : null,
        };
      });

    const unitPairs: UnitPairPattern[] = duoRows
      .map((row) => {
        const boardsA = unitBoards.get(row.aUnitId) ?? 0;
        const boardsB = unitBoards.get(row.bUnitId) ?? 0;
        const either = boardsA + boardsB - row.sample;
        if (row.sample < MIN_SAMPLE || either <= 0) return null;

        const avgA = unitAvgPlace.get(row.aUnitId) ?? baselineAvgPlace;
        const avgB = unitAvgPlace.get(row.bUnitId) ?? baselineAvgPlace;
        const counts: Counts = {
          sample: row.sample,
          placeSum: row.placeSum,
          top4: row.top4,
          wins: row.wins,
        };

        return {
          a: resolveUnit(row.aUnitId),
          b: resolveUnit(row.bUnitId),
          ...sampleOf(counts, baselineAvgPlace),
          overlap: round2(row.sample / either),
          togetherGain: round2((avgA + avgB) / 2 - row.placeSum / row.sample),
        };
      })
      .filter((entry): entry is UnitPairPattern => entry !== null)
      .sort(
        (a, b) =>
          b.overlap - a.overlap || b.sample - a.sample || a.a.id.localeCompare(b.a.id),
      )
      .slice(0, UNIT_PAIR_LIMIT);

    const popularPairings: PopularPairingPattern[] = [...pairTotals.values()]
      .filter((counts) => counts.sample >= MIN_PAIR_SAMPLE)
      .sort(
        (a, b) =>
          b.sample - a.sample ||
          a.unitId.localeCompare(b.unitId) ||
          a.itemId.localeCompare(b.itemId),
      )
      .slice(0, POPULAR_PAIR_LIMIT)
      .map((counts) => {
        const slots = unitSlotTotals.get(counts.unitId) ?? 0;
        return {
          unit: resolveUnit(counts.unitId),
          item: resolveItem(counts.itemId),
          ...sampleOf(counts, baselineAvgPlace),
          share: slots > 0 ? round2(counts.sample / slots) : 0,
        };
      });

    const pairings: PairingPattern[] = [...pairTotals.values()]
      .filter((counts) => counts.sample >= MIN_PAIR_SAMPLE)
      .map((counts) => ({
        unit: resolveUnit(counts.unitId),
        item: resolveItem(counts.itemId),
        ...sampleOf(counts, baselineAvgPlace),
      }))
      .filter((entry) => entry.placeGain > 0)
      .sort(
        (a, b) => b.placeGain - a.placeGain || b.sample - a.sample || a.unit.id.localeCompare(b.unit.id),
      )
      .slice(0, PAIR_LIMIT);

    const traits: TraitPattern[] = traitRows.map((row) => {
      const trait = traitIndex?.get(row.traitId) ?? null;
      return {
        id: row.traitId,
        name: trait?.name ?? null,
        imageUrl: trait?.imageUrl ?? null,
        ...sampleOf(
          { sample: row.sample, placeSum: row.placeSum, top4: row.top4, wins: row.wins },
          baselineAvgPlace,
        ),
        avgTier: row.sample > 0 ? round2(row.tierSum / row.sample) : 0,
      };
    });

    return {
      kind: "ok",
      summary: {
        setNumber,
        patches: patchRows.map((row) => row.patch).sort(),
        matches: baseline?.matches ?? 0,
        boards,
        unitsSeen: diversityRows[0]?.units ?? 0,
        itemsSeen: itemTotals.size,
        itemSlots: diversityRows[0]?.slots ?? 0,
        avgPlace: round2(baselineAvgPlace),
        top4Rate: boards > 0 ? round2((baseline?.top4 ?? 0) / boards) : 0,
        winRate: boards > 0 ? round2((baseline?.wins ?? 0) / boards) : 0,
        minSample: MIN_SAMPLE,
        minPairSample: MIN_PAIR_SAMPLE,
      },
      units,
      unitPairs,
      items,
      popularPairings,
      pairings,
      traits,
    };
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[analysis] Postgres unavailable, no board patterns can be mined: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { kind: "unavailable" };
  }
}
