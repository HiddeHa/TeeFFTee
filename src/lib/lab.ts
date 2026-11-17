import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  mineCores,
  summariseUnitItems,
  type Board,
  type UnitDetailRow,
} from "../../worker/candidates";

import { rowsOf } from "./db-rows";
import { loadAggregation } from "./data-health";
import { loadItemCatalogue } from "./items";
import { comparePatch } from "./stats-source";
import { loadTraitCatalogue } from "./traits";
import { loadUnitCatalogue } from "./units";

/**
 * Read side of the comp-discovery loop.
 *
 * `crawl candidates` is the evidence half of curation: which unit sets recur on
 * crawled boards, and how those boards finished. This module runs the same pure
 * mining functions on the same board shape, scoped to the current set's latest
 * patch, and adds the two things a page needs that a CLI report does not:
 * catalogue names/icons, and the number of boards the published comps could not
 * classify.
 *
 * Deliberately not a fallback page. With no database there is nothing to mine,
 * so `null` means "unavailable" and the page says so; zero boards is a different
 * answer and is reported as zero, never as an empty candidate list with a
 * plausible-looking header.
 */

export type LabScope = {
  setNumber: number;
  /** Latest patch with crawled boards for the set, or null when there are none. */
  patch: string | null;
  bucket: "master+";
};

export type LabItem = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  share: number;
};

export type LabUnit = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  avgStar: number;
  items: LabItem[];
};

export type LabTrait = {
  id: string;
  name: string | null;
  share: number;
};

export type LabCandidate = {
  games: number;
  avgPlace: number;
  /** Baseline average minus this core's average; positive is a better finish. */
  delta: number;
  top4Rate: number;
  winRate: number;
  units: LabUnit[];
  traits: LabTrait[];
};

export type LabReport = {
  scope: LabScope;
  boards: number;
  distinctUnits: number;
  baselineAvgPlace: number;
  candidates: LabCandidate[];
  /**
   * From the latest `comp_stats` aggregation for the same scope. Null when the
   * set's comps have never been aggregated — which is not the same as zero
   * unclassified boards.
   */
  unclassified: { boards: number; classified: number; share: number } | null;
  /**
   * Set when the production corpus is too large to mine inside one request.
   * The page says so directly instead of spending a minute (or timing out) on
   * combinations the reader cannot see yet.
   */
  tooManyBoards?: boolean;
};

export const LAB_MIN_GAMES = 100;
/** Five, not the CLI's default four: a five-unit board would otherwise surface as
 * five near-identical four-unit subsets, each with the same games. */
export const LAB_MAX_CORE = 5;
export const LAB_LIMIT = 12;
/** Upper bound for mining inside a request; above this the page explains itself. */
export const LAB_MAX_BOARDS = 30_000;

let warnedAboutDatabase = false;

async function latestPatch(setNumber: number): Promise<string | null> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT DISTINCT patch FROM matches WHERE set_number = ${setNumber}`,
  );
  const patches = rowsOf<{ patch: string }>(result)
    .map((row) => row.patch)
    .sort(comparePatch);
  return patches[patches.length - 1] ?? null;
}

/**
 * Boards in scope, same shape the CLI mines: final boards only, with the traits
 * that actually reached a breakpoint.
 */
async function loadBoards(setNumber: number, patch: string): Promise<Board[]> {
  const db = getDb();
  const result = await db.execute(sql`
    WITH scoped AS (
      SELECT
        m.match_id,
        EXISTS (
          SELECT 1
          FROM participants p2
          JOIN players pl ON pl.puuid = p2.puuid
          WHERE p2.match_id = m.match_id
            AND pl.tier IN ('MASTER', 'GRANDMASTER', 'CHALLENGER')
        ) AS master_plus
      FROM matches m
      WHERE m.set_number = ${setNumber} AND m.patch = ${patch}
    )
    SELECT
      p.match_id AS "matchId",
      p.puuid,
      p.placement,
      COALESCE((
        SELECT array_agg(DISTINCT u.unit_id)
        FROM participant_units u
        WHERE u.match_id = p.match_id AND u.puuid = p.puuid
      ), '{}') AS units,
      COALESCE((
        SELECT array_agg(DISTINCT t.trait_id)
        FROM participant_traits t
        WHERE t.match_id = p.match_id AND t.puuid = p.puuid AND t.tier_current > 0
      ), '{}') AS traits
    FROM participants p
    JOIN scoped s ON s.match_id = p.match_id
    WHERE s.master_plus
  `);

  return rowsOf<Board>(result);
}

/** Star levels and items measured only on boards that contained the whole core. */
async function loadUnitDetail(
  setNumber: number,
  patch: string,
  coreUnits: string[],
): Promise<UnitDetailRow[]> {
  const db = getDb();
  const unitList = sql.join(
    coreUnits.map((id) => sql`${id}`),
    sql`, `,
  );

  const result = await db.execute(sql`
    WITH scoped AS (
      SELECT
        m.match_id,
        EXISTS (
          SELECT 1
          FROM participants p2
          JOIN players pl ON pl.puuid = p2.puuid
          WHERE p2.match_id = m.match_id
            AND pl.tier IN ('MASTER', 'GRANDMASTER', 'CHALLENGER')
        ) AS master_plus
      FROM matches m
      WHERE m.set_number = ${setNumber} AND m.patch = ${patch}
    ),
    core_boards AS (
      SELECT u.match_id, u.puuid
      FROM participant_units u
      JOIN scoped s ON s.match_id = u.match_id
      WHERE s.master_plus
        AND u.unit_id IN (${unitList})
      GROUP BY u.match_id, u.puuid
      HAVING count(DISTINCT u.unit_id) = ${coreUnits.length}
    )
    SELECT
      u.unit_id AS "unitId",
      u.star_level AS star,
      u.item_0 AS item0,
      u.item_1 AS item1,
      u.item_2 AS item2
    FROM participant_units u
    JOIN core_boards c ON c.match_id = u.match_id AND c.puuid = u.puuid
  `);

  return rowsOf<UnitDetailRow>(result);
}

function unclassifiedFor(aggregation: Awaited<ReturnType<typeof loadAggregation>>) {
  if (!aggregation) return null;
  return {
    boards: aggregation.boards,
    classified: aggregation.classified,
    share: aggregation.share,
  };
}

export async function loadLabReport(setNumber: number): Promise<LabReport | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const patch = await latestPatch(setNumber);
    if (patch === null) {
      return {
        scope: { setNumber, patch: null, bucket: "master+" },
        boards: 0,
        distinctUnits: 0,
        baselineAvgPlace: 0,
        candidates: [],
        unclassified: null,
      };
    }

    const boards = await loadBoards(setNumber, patch);
    const prepared = boards
      .map((board) => ({ ...board, units: [...new Set(board.units)].sort() }))
      .filter((board) => board.units.length >= 2);

    const baselineAvgPlace =
      prepared.length === 0
        ? 0
        : Math.round(
            (prepared.reduce((sum, board) => sum + board.placement, 0) / prepared.length) * 100,
          ) / 100;

    // Mining is combinatorial. At launch scale the corpus can reach six
    // figures of boards; doing that per request blocks the page for a minute.
    // Production answers honestly and leaves the full report to the scheduled
    // job that will own it, while local/dev and the tests still exercise the
    // miner on their smaller corpora.
    if (process.env.NODE_ENV === "production" && boards.length > LAB_MAX_BOARDS) {
      return {
        scope: { setNumber, patch, bucket: "master+" },
        boards: boards.length,
        distinctUnits: new Set(boards.flatMap((board) => board.units)).size,
        baselineAvgPlace: 0,
        candidates: [],
        unclassified: null,
        tooManyBoards: true,
      };
    }

    const cores = mineCores(boards, {
      minGames: LAB_MIN_GAMES,
      maxCore: LAB_MAX_CORE,
    })
      .sort((a, b) => a.placeSum / a.games - b.placeSum / b.games || b.games - a.games)
      .slice(0, LAB_LIMIT);

    const [unitIndex, itemIndex, traitIndex] = await Promise.all([
      loadUnitCatalogue(setNumber),
      loadItemCatalogue(setNumber),
      loadTraitCatalogue(setNumber),
    ]);

    // Each core's detail query is independent, so run them together. Sequential
    // awaits made this page take ~50 s against the hosted database (one scan per
    // candidate); the result is identical, the wall clock is one query.
    const detailsByCore = await Promise.all(
      cores.map((core) => loadUnitDetail(setNumber, patch, core.units)),
    );

    const candidates: LabCandidate[] = [];
    for (const [index, core] of cores.entries()) {
      const containing = prepared.filter((board) => {
        const units = new Set(board.units);
        return core.units.every((unitId) => units.has(unitId));
      });

      const traitCounts = new Map<string, number>();
      for (const board of containing) {
        for (const traitId of board.traits) {
          traitCounts.set(traitId, (traitCounts.get(traitId) ?? 0) + 1);
        }
      }
      const traits: LabTrait[] = [...traitCounts.entries()]
        .filter(([, count]) => containing.length > 0 && count / containing.length >= 0.5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([traitId, count]) => ({
          id: traitId,
          name: traitIndex?.get(traitId)?.name ?? null,
          share: count / containing.length,
        }));

      const details = summariseUnitItems(detailsByCore[index] ?? [], core.units);

      candidates.push({
        games: core.games,
        avgPlace: Math.round((core.placeSum / core.games) * 100) / 100,
        delta: Math.round((baselineAvgPlace - core.placeSum / core.games) * 100) / 100,
        top4Rate: Math.round((core.top4 / core.games) * 1000) / 1000,
        winRate: Math.round((core.wins / core.games) * 1000) / 1000,
        traits,
        units: details.map((detail) => {
          const unit = unitIndex?.get(detail.unitId) ?? null;
          return {
            id: detail.unitId,
            name: unit?.name ?? null,
            imageUrl: unit?.imageUrl ?? null,
            avgStar: detail.avgStar,
            items: detail.items.map((item) => ({
              id: item.itemId,
              name: itemIndex?.get(item.itemId)?.name ?? null,
              imageUrl: itemIndex?.get(item.itemId)?.imageUrl ?? null,
              share: item.share,
            })),
          };
        }),
      });
    }

    return {
      scope: { setNumber, patch, bucket: "master+" },
      boards: boards.length,
      distinctUnits: new Set(prepared.flatMap((board) => board.units)).size,
      baselineAvgPlace,
      candidates,
      unclassified: unclassifiedFor(await loadAggregation(setNumber, patch)),
    };
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[lab] could not mine candidates: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return null;
  }
}
