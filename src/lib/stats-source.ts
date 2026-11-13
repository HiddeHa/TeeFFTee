import { and, eq, sql } from "drizzle-orm";

import type { CompStats, RankBucket, Region } from "@/content/types";
import { getDb } from "@/db/client";
import { compStats, comps } from "@/db/schema";

import { wilsonLowerBound } from "./confidence";

/**
 * Read-side of the derived layer.
 *
 * `comp_stats` stores counts (games, place sum, top-4 count, win count, boards)
 * because counts add up across regions and rates do not. Everything the UI shows
 * — average placement, top-4 rate, win rate, pick rate and the Wilson bound — is
 * derived here, in one place, from integers.
 */

export type StatsScope = {
  patch: string;
  rank: RankBucket;
  /** undefined = combine every region the crawler covers. */
  region?: Region;
};

export type CompStatsMap = Map<string, CompStats>;

let warnedAboutDatabase = false;

/**
 * `max(computed_at)` comes back from the driver as a string or a Date depending
 * on type parsing, so normalise rather than trusting the declared type.
 */
function toIsoString(value: unknown): string {
  const fallback = new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }
  return fallback;
}

/**
 * Patches that actually have `comp_stats` rows, ascending. Movers need two of
 * them; a patch with a page but no rows is not a comparison window.
 *
 * Returns an empty list when Postgres is absent or unreachable — callers treat
 * that the same as "no second window yet".
 */
export async function listStatsPatches(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return [];
  }

  try {
    const rows = await db.selectDistinct({ patch: compStats.patch }).from(compStats);
    return rows.map((row) => row.patch).sort(comparePatch);
  } catch {
    return [];
  }
}

/** "18.6" < "18.10" — numeric per segment, unlike a string compare. */
export function comparePatch(a: string, b: string): number {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }

  return a.localeCompare(b);
}

/**
 * Returns null when Postgres is not configured or cannot be reached, which is
 * the signal for callers to fall back to the curated content snapshot. An empty
 * Map is a different thing: the database answered and nobody has a sample, which
 * must render as "collecting data".
 */
export async function loadCompStats(scope: StatsScope): Promise<CompStatsMap | null> {
  if (!process.env.DATABASE_URL) return null;

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return null;
  }

  try {
    const rows = await db
      .select({
        slug: comps.slug,
        games: sql<number>`sum(${compStats.games})::int`,
        placeSum: sql<number>`sum(${compStats.placeSum})::int`,
        top4: sql<number>`sum(${compStats.top4Count})::int`,
        wins: sql<number>`sum(${compStats.winCount})::int`,
        boards: sql<number>`sum(${compStats.boards})::int`,
        computedAt: sql<unknown>`max(${compStats.computedAt})`,
      })
      .from(compStats)
      .innerJoin(comps, eq(compStats.compId, comps.compId))
      .where(
        and(
          eq(compStats.patch, scope.patch),
          eq(compStats.rankBucket, scope.rank),
          scope.region ? eq(compStats.region, scope.region) : undefined,
        ),
      )
      .groupBy(comps.slug);

    const stats: CompStatsMap = new Map();

    for (const row of rows) {
      if (row.games <= 0) continue;

      stats.set(row.slug, {
        patch: scope.patch,
        region: scope.region ?? "all",
        rankBucket: scope.rank,
        games: row.games,
        avgPlace: row.placeSum / row.games,
        top4Rate: row.top4 / row.games,
        winRate: row.wins / row.games,
        pickRate: row.boards > 0 ? row.games / row.boards : 0,
        top4CiLow: wilsonLowerBound(row.top4, row.games),
        computedAt: toIsoString(row.computedAt),
      });
    }

    return stats;
  } catch (error) {
    // A statistics site that 500s because the database blinked is worse than one
    // showing the curated snapshot. Log once, degrade, carry on.
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[stats] Postgres unavailable, serving the curated content snapshot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return null;
  }
}
