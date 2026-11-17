import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { boardPatterns, boardStudies } from "@/db/schema";

import { loadItemCatalogue } from "./items";
import { loadTraitCatalogue } from "./traits";
import { loadUnitCatalogue } from "./units";

/**
 * READ SIDE of the AInalyses study.
 *
 * The mining happens once, in the crawler (`worker/patterns.ts`), because it is a
 * self-join over `participant_units` — twice for a duo, three times for a trio —
 * and that cost grows with the crawl. A page that re-mined per request would get
 * slower every day the crawler ran, so it reads a materialised snapshot instead:
 *
 *   board_studies    one row per set: the sample, the baseline, the thresholds
 *   board_patterns   one row per mined pattern: ids and counts
 *
 * Everything a reader sees is derived here, in one place: averages, rates, the
 * "vs avg" delta, the overlap a duo or trio reads, and every name, cost and icon
 * resolved against the set catalogue. The tables store counts and ids only, so a
 * renamed unit converges on the next read instead of keeping a stale name.
 *
 * Two rules keep this honest:
 *
 *  1. **Support comes first.** The job writes nothing below its thresholds, and
 *     the thresholds travel in the study row — the page quotes what was mined,
 *     not a constant that drifted.
 *  2. **It is evidence, not advice.** Average placement next to the sample
 *     baseline is correlation: an item on winning boards may be a consequence of
 *     winning, not a cause. Every number carries its sample so the reader can
 *     judge it, and the page says so in prose.
 *
 * Three states, and the page distinguishes all three: no database (`unavailable`),
 * a database that has never mined this set (`not-materialised`), and a study that
 * exists but covers no boards yet. Zeroes would read as measurements, so none of
 * them is rendered as one.
 */

/** Display caps. The job stores at most this many of each, ranked. */
const PAIR_LIMIT = 10;
const POPULAR_PAIR_LIMIT = 12;
const UNIT_ITEM_LIMIT = 2;

/** The job's composite key separator — one character no Riot id contains. */
const SEP = "\u0001";

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

export type UnitPattern = PatternSample &
  ResolvedUnit & {
    avgStar: number;
    /** The two items this unit held most often on those boards. */
    items: ResolvedItem[];
  };

export type ItemPattern = PatternSample &
  ResolvedItem & {
    /** The unit that held it most often in the mined sample; null when unseen. */
    holder: (ResolvedUnit & { share: number }) | null;
  };

export type PairingPattern = PatternSample & {
  unit: ResolvedUnit;
  item: ResolvedItem;
};

/**
 * The same shape, ranked by how often it happens rather than how well it
 * finished — the "what does this champion build" question.
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

export type UnitTrioPattern = PatternSample & {
  /** Three units, alphabetically by id. */
  units: [ResolvedUnit, ResolvedUnit, ResolvedUnit];
  /**
   * 0..1 — boards holding all three ÷ boards holding any of the three. The
   * rarest member sets the ceiling: a trio cannot cover more boards than its
   * least-played unit appears on, so a high number means the shell is real
   * rather than three champions that are each everywhere.
   */
  overlap: number;
  /** Trio average against the mean of the three units' own averages. */
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
  /** When the crawler last materialised this study, ISO-8601. */
  computedAt: string;
};

export type BoardAnalysis =
  | { kind: "unavailable" }
  | { kind: "not-materialised" }
  | {
      kind: "ok";
      summary: AnalysisSummary;
      units: UnitPattern[];
      unitPairs: UnitPairPattern[];
      unitTrios: UnitTrioPattern[];
      items: ItemPattern[];
      popularPairings: PopularPairingPattern[];
      pairings: PairingPattern[];
      traits: TraitPattern[];
    };

type Counts = { sample: number; placeSum: number; top4: number; wins: number };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/** Counts → the rate shape the UI renders, against one baseline. */
function sampleOf(counts: Counts, baselineAvgPlace: number): PatternSample {
  const avgPlace = rate(counts.placeSum, counts.sample);
  return {
    sample: counts.sample,
    avgPlace: round2(avgPlace),
    top4Rate: round2(rate(counts.top4, counts.sample)),
    winRate: round2(rate(counts.wins, counts.sample)),
    placeGain: round2(baselineAvgPlace - avgPlace),
  };
}

let warnedAboutDatabase = false;

type StoredPattern = {
  kind: string;
  key: string;
  rank: number;
  sample: number;
  placeSum: number;
  top4Count: number;
  winCount: number;
  extra: Record<string, number>;
};

function countsOf(row: StoredPattern): Counts {
  return {
    sample: row.sample,
    placeSum: row.placeSum,
    top4: row.top4Count,
    wins: row.winCount,
  };
}

/**
 * Read and shape one set's materialised study.
 *
 * `unavailable` means no DATABASE_URL or Postgres did not answer — an analytics
 * page with no database has nothing to analyse and must say that rather than show
 * zeros as measurements.
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
    const studyRows = await db
      .select()
      .from(boardStudies)
      .where(eq(boardStudies.setNumber, setNumber))
      .limit(1);

    const study = studyRows[0];
    if (!study) return { kind: "not-materialised" };

    const stored = await db
      .select({
        kind: boardPatterns.kind,
        key: boardPatterns.key,
        rank: boardPatterns.rank,
        sample: boardPatterns.sample,
        placeSum: boardPatterns.placeSum,
        top4Count: boardPatterns.top4Count,
        winCount: boardPatterns.winCount,
        extra: boardPatterns.extra,
      })
      .from(boardPatterns)
      .where(eq(boardPatterns.setNumber, setNumber));

    const byKind = new Map<string, StoredPattern[]>();
    for (const row of stored) {
      const bucket = byKind.get(row.kind) ?? [];
      bucket.push(row);
      byKind.set(row.kind, bucket);
    }
    // Stored rank is the mining order; sorting here keeps the page independent of
    // whatever order the rows come back in.
    const rowsOf = (kind: string): StoredPattern[] =>
      [...(byKind.get(kind) ?? [])].sort((a, b) => a.rank - b.rank);

    const baselineAvgPlace = rate(study.placeSum, study.boards);

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

    const unitRows = rowsOf("unit");
    const unitItemRows = rowsOf("item-unit");

    // Per-unit totals and averages, from the unit rows the job ranked. Duo and
    // trio members are drawn from those same units, so the "vs solo" comparison
    // always has both sides.
    const unitBoards = new Map(unitRows.map((row) => [row.key, row.sample]));
    const unitAvgPlace = new Map(
      unitRows.map((row) => [row.key, rate(row.placeSum, row.sample)]),
    );

    const soloAverage = (unitId: string): number =>
      unitAvgPlace.get(unitId) ?? baselineAvgPlace;

    /** unit ÷ its item slots, for the "share of that unit's items" column. */
    const unitSlotTotals = new Map<string, number>();
    const unitItems = new Map<string, StoredPattern[]>();
    const itemHolders = new Map<string, StoredPattern[]>();

    for (const row of unitItemRows) {
      const [unitId, itemId] = row.key.split(SEP);
      if (!unitId || !itemId) continue;

      unitSlotTotals.set(unitId, (unitSlotTotals.get(unitId) ?? 0) + row.sample);

      const forUnit = unitItems.get(unitId) ?? [];
      forUnit.push(row);
      unitItems.set(unitId, forUnit);

      const forItem = itemHolders.get(itemId) ?? [];
      forItem.push(row);
      itemHolders.set(itemId, forItem);
    }

    const units: UnitPattern[] = unitRows.map((row) => ({
      ...resolveUnit(row.key),
      ...sampleOf(countsOf(row), baselineAvgPlace),
      avgStar: round2(rate(row.extra.starSum ?? 0, row.sample)),
      items: [...(unitItems.get(row.key) ?? [])]
        .sort((a, b) => b.sample - a.sample || a.key.localeCompare(b.key))
        .slice(0, UNIT_ITEM_LIMIT)
        .map((entry) => resolveItem(entry.key.split(SEP)[1] ?? entry.key)),
    }));

    const items: ItemPattern[] = rowsOf("item").map((row) => {
      const holder = [...(itemHolders.get(row.key) ?? [])].sort(
        (a, b) => b.sample - a.sample || a.key.localeCompare(b.key),
      )[0];
      const holderUnit = holder ? holder.key.split(SEP)[0] : undefined;

      return {
        ...resolveItem(row.key),
        ...sampleOf(countsOf(row), baselineAvgPlace),
        holder:
          holder && holderUnit && row.sample > 0
            ? { ...resolveUnit(holderUnit), share: round2(rate(holder.sample, row.sample)) }
            : null,
      };
    });

    const resolvePairing = (row: StoredPattern): PairingPattern | null => {
      const [unitId, itemId] = row.key.split(SEP);
      if (!unitId || !itemId) return null;
      return {
        unit: resolveUnit(unitId),
        item: resolveItem(itemId),
        ...sampleOf(countsOf(row), baselineAvgPlace),
      };
    };

    const popularPairings: PopularPairingPattern[] = [];
    for (const row of unitItemRows.slice(0, POPULAR_PAIR_LIMIT)) {
      const pairing = resolvePairing(row);
      if (!pairing) continue;
      popularPairings.push({
        ...pairing,
        share: round2(rate(row.sample, unitSlotTotals.get(pairing.unit.id) ?? 0)),
      });
    }

    const pairings: PairingPattern[] = unitItemRows
      .map((row) => resolvePairing(row))
      .filter((entry): entry is PairingPattern => entry !== null)
      .filter((entry) => entry.placeGain > 0)
      .sort(
        (a, b) =>
          b.placeGain - a.placeGain || b.sample - a.sample || a.unit.id.localeCompare(b.unit.id),
      )
      .slice(0, PAIR_LIMIT);

    const unitPairs: UnitPairPattern[] = rowsOf("duo").flatMap((row) => {
      const [aId, bId] = row.key.split(SEP);
      if (!aId || !bId) return [];
      const either = row.extra.either ?? 0;
      return [
        {
          a: resolveUnit(aId),
          b: resolveUnit(bId),
          ...sampleOf(countsOf(row), baselineAvgPlace),
          overlap: round2(rate(row.sample, either)),
          togetherGain: round2(
            (soloAverage(aId) + soloAverage(bId)) / 2 - rate(row.placeSum, row.sample),
          ),
        },
      ];
    });

    const unitTrios: UnitTrioPattern[] = rowsOf("core").flatMap((row) => {
      const [aId, bId, cId] = row.key.split(SEP);
      if (!aId || !bId || !cId) return [];
      return [
        {
          units: [resolveUnit(aId), resolveUnit(bId), resolveUnit(cId)],
          ...sampleOf(countsOf(row), baselineAvgPlace),
          overlap: round2(rate(row.sample, row.extra.anyBoards ?? 0)),
          togetherGain: round2(
            (soloAverage(aId) + soloAverage(bId) + soloAverage(cId)) / 3 -
              rate(row.placeSum, row.sample),
          ),
        },
      ];
    });

    const traits: TraitPattern[] = rowsOf("trait").map((row) => {
      const trait = traitIndex?.get(row.key) ?? null;
      return {
        id: row.key,
        name: trait?.name ?? null,
        imageUrl: trait?.imageUrl ?? null,
        ...sampleOf(countsOf(row), baselineAvgPlace),
        avgTier: round2(rate(row.extra.tierSum ?? 0, row.sample)),
      };
    });

    return {
      kind: "ok",
      summary: {
        setNumber,
        patches: study.patches,
        matches: study.matches,
        boards: study.boards,
        unitsSeen: study.unitsSeen,
        itemsSeen: study.itemsSeen,
        itemSlots: study.itemSlots,
        avgPlace: round2(baselineAvgPlace),
        top4Rate: round2(rate(study.top4Count, study.boards)),
        winRate: round2(rate(study.winCount, study.boards)),
        minSample: study.minSample,
        minPairSample: study.minPairSample,
        computedAt: study.computedAt.toISOString(),
      },
      units,
      unitPairs,
      unitTrios,
      items,
      popularPairings,
      pairings,
      traits,
    };
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[analysis] Postgres unavailable, no board patterns can be read: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { kind: "unavailable" };
  }
}
