import { and, eq, sql } from "drizzle-orm";

import type { RankBucket, Region } from "@/content/types";
import { getDb } from "@/db/client";
import { compAugmentStats, comps } from "@/db/schema";

/**
 * Read-side of `comp_augment_stats`.
 *
 * The crawler has written `participant_augments` since the first fetch, and the
 * comp page's augment advice was editorial because nothing read them. The
 * materialised table turns those rows into per-comp, per-scope counts; everything
 * a reader sees — the average finish, the share of boards, and the delta against
 * the comp's own average — is derived here, from integers.
 *
 * What this is not: causal. An augment is offered on a stage roll, not chosen
 * from the whole pool, and the stage it arrives on is already shaped by how the
 * game is going. A low average finish therefore means "boards that took this
 * finished better", which is what the page says — never "take this and you will
 * place higher".
 */

/**
 * The smallest sample worth quoting. Below this a comp/augment pair is noise:
 * three boards can produce a spectacular average placement by luck.
 *
 * Filtering here rather than in the miner means the threshold can change without
 * re-mining, and the page can quote the number it actually applied.
 */
export const MIN_AUGMENT_BOARDS = 10;

export type AugmentScope = {
  patch: string;
  rank: RankBucket;
  /** undefined = every region the crawler covers. */
  region?: Region;
};

/** The comp's own numbers in the same scope, from `comp_stats`. */
export type AugmentBaseline = {
  games: number;
  avgPlace: number;
  top4Rate: number;
};

export type MeasuredAugment = {
  /** Riot's augment id — resolved against the catalogue where the page renders it. */
  id: string;
  games: number;
  avgPlace: number;
  top4Rate: number;
  winRate: number;
  /** Share of this comp's boards in scope that carried the augment. */
  share: number;
  /** Average placement minus the comp's average. Negative is better. */
  deltaPlace: number;
  /** Top-4 rate minus the comp's rate. */
  deltaTop4: number;
};

export type CompAugmentReport =
  /** No database, or Postgres did not answer. The page keeps its editorial copy. */
  | { kind: "unavailable" }
  /** The database answered and no augment has reached the threshold here. */
  | { kind: "none"; minBoards: number }
  | {
      kind: "ok";
      augments: MeasuredAugment[];
      minBoards: number;
      compGames: number;
      compAvgPlace: number;
    };

let warnedAboutDatabase = false;

/**
 * Measured augments for one comp, best average finish first.
 *
 * `baseline` is the comp's `visibleStats` for the same scope, passed in rather
 * than queried again: the page already loaded it, and the delta is only
 * meaningful against the exact numbers rendered above it.
 */
export async function loadCompAugments(
  slug: string,
  baseline: AugmentBaseline | null,
  scope: AugmentScope,
): Promise<CompAugmentReport> {
  // No database first: "no sample" and "nothing attached" are different facts,
  // and only one of them is worth telling a reader to wait for.
  if (!process.env.DATABASE_URL) return { kind: "unavailable" };
  if (!baseline || baseline.games <= 0) return { kind: "none", minBoards: MIN_AUGMENT_BOARDS };

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return { kind: "unavailable" };
  }

  try {
    const rows = await db
      .select({
        augmentId: compAugmentStats.augmentId,
        games: sql<number>`sum(${compAugmentStats.games})::int`,
        placeSum: sql<number>`sum(${compAugmentStats.placeSum})::int`,
        top4: sql<number>`sum(${compAugmentStats.top4Count})::int`,
        wins: sql<number>`sum(${compAugmentStats.winCount})::int`,
      })
      .from(compAugmentStats)
      .innerJoin(comps, eq(compAugmentStats.compId, comps.compId))
      .where(
        and(
          eq(comps.slug, slug),
          eq(compAugmentStats.patch, scope.patch),
          eq(compAugmentStats.rankBucket, scope.rank),
          scope.region ? eq(compAugmentStats.region, scope.region) : undefined,
        ),
      )
      .groupBy(compAugmentStats.augmentId);

    const augments: MeasuredAugment[] = rows
      .filter((row) => row.games >= MIN_AUGMENT_BOARDS)
      .map((row) => {
        const avgPlace = row.placeSum / row.games;
        const top4Rate = row.top4 / row.games;
        return {
          id: row.augmentId,
          games: row.games,
          avgPlace,
          top4Rate,
          winRate: row.wins / row.games,
          share: row.games / baseline.games,
          deltaPlace: avgPlace - baseline.avgPlace,
          deltaTop4: top4Rate - baseline.top4Rate,
        };
      })
      .sort(
        (a, b) =>
          a.deltaPlace - b.deltaPlace ||
          b.games - a.games ||
          a.id.localeCompare(b.id),
      );

    if (augments.length === 0) return { kind: "none", minBoards: MIN_AUGMENT_BOARDS };

    return {
      kind: "ok",
      // The page shows six; a dozen is plenty of headroom without shipping the
      // whole pool to a server component that will not render it.
      augments: augments.slice(0, 12),
      minBoards: MIN_AUGMENT_BOARDS,
      compGames: baseline.games,
      compAvgPlace: baseline.avgPlace,
    };
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[augments] Postgres unavailable, keeping the editorial augment copy: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { kind: "unavailable" };
  }
}
