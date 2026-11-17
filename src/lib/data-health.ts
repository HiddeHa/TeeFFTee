import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";

import { rowsOf } from "./db-rows";

/**
 * The crawler's own health, on the page whose numbers depend on it.
 *
 * The aggregate job has always logged matches, boards, classified and
 * unclassified counts; until now that was only visible in container logs. The
 * site's claim is that boards matching no comp are counted rather than hidden,
 * so the count belongs next to the stats, not in a log nobody reads.
 *
 * The unclassified split comes from the materialised `comp_stats` rows:
 * `boards` is the scope denominator, `games` is per comp, so the remainder is
 * exactly what `aggregate` reported. That means the block describes the last
 * aggregation, not the live queue — which is why it prints the timestamp and says
 * when it is stale.
 */

export const DATA_STALE_MINUTES = 120;

export type AggregationHealth = {
  /** When `aggregate` last wrote these rows, ISO. */
  at: string;
  /** Boards in the scope the aggregate covered (Master+). */
  boards: number;
  /** Boards a published comp claimed; the rest are unclassified. */
  classified: number;
  /** 0–1, derived here so the page and any test use one formula. */
  share: number;
};

export type DataHealth = {
  setNumber: number;
  patch: string;
  /** Crawled matches for this set and patch, every board in them. */
  matches: number;
  /** Master+ boards in the same scope — the aggregate's denominator. */
  boards: number;
  /** Null when the scope has never been aggregated (or has no comps). */
  aggregation: AggregationHealth | null;
};

/** Boards that matched nothing, as a share of the scope. Zero denominator → 0. */
export function unclassifiedShare(boards: number, classified: number): number {
  if (boards <= 0) return 0;
  return (boards - classified) / boards;
}

/** Whole minutes since an ISO timestamp; null for an unreadable one. */
export function aggregationAgeMinutes(at: string | null, now: Date = new Date()): number | null {
  if (!at) return null;
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 60_000));
}

export function isStaleAge(
  minutes: number | null,
  threshold = DATA_STALE_MINUTES,
): boolean {
  return minutes !== null && minutes > threshold;
}

/**
 * Aggregation totals for one (set, patch, Master+) scope.
 *
 * `max(boards)` per patch/region is the denominator (every comp row repeats it);
 * `sum(games)` is the classified board count. Both are counts, so summing across
 * regions is exact.
 */
export async function loadAggregation(
  setNumber: number,
  patch: string,
): Promise<AggregationHealth | null> {
  const db = getDb();
  const result = await db.execute(sql`
    WITH scoped AS (
      SELECT
        s.patch,
        s.region,
        max(s.boards) AS boards,
        sum(s.games) AS classified,
        max(s.computed_at) AS computed_at
      FROM comp_stats s
      JOIN comps c ON c.comp_id = s.comp_id
      WHERE c.set_number = ${setNumber}
        AND s.patch = ${patch}
        AND s.rank_bucket = 'master+'
      GROUP BY s.patch, s.region
    )
    SELECT
      COALESCE(sum(boards), 0)::int AS boards,
      COALESCE(sum(classified), 0)::int AS classified,
      max(computed_at) AS "computedAt"
    FROM scoped
  `);

  const row = rowsOf<{ boards: number; classified: number; computedAt: unknown }>(result)[0];
  if (!row || row.boards === 0) return null;

  const at =
    row.computedAt instanceof Date
      ? row.computedAt.toISOString()
      : typeof row.computedAt === "string"
        ? row.computedAt
        : null;
  if (!at) return null;

  return {
    at,
    boards: row.boards,
    classified: row.classified,
    share: unclassifiedShare(row.boards, row.classified),
  };
}

export async function loadDataHealth(
  setNumber: number,
  patch: string,
): Promise<DataHealth | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM matches m
         WHERE m.set_number = ${setNumber} AND m.patch = ${patch}) AS matches,
        (SELECT count(*)::int
         FROM participants p
         JOIN matches m ON m.match_id = p.match_id
         WHERE m.set_number = ${setNumber} AND m.patch = ${patch}
           AND EXISTS (
             SELECT 1
             FROM participants p2
             JOIN players pl ON pl.puuid = p2.puuid
             WHERE p2.match_id = m.match_id
               AND pl.tier IN ('MASTER', 'GRANDMASTER', 'CHALLENGER')
           )) AS boards
    `);

    const row = rowsOf<{ matches: number; boards: number }>(result)[0] ?? {
      matches: 0,
      boards: 0,
    };

    return {
      setNumber,
      patch,
      matches: row.matches,
      boards: row.boards,
      aggregation: await loadAggregation(setNumber, patch),
    };
  } catch (error) {
    console.warn(
      `[health] could not read crawler health: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
