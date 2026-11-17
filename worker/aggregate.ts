import { assignBoard, type CompSignature } from "./assign";
import { config } from "./config";
import { db } from "./db";
import { createLogger } from "./log";

const log = createLogger("aggregate");

/**
 * Stage 2: turn normalized boards into `comp_stats`.
 *
 * Scope is one (patch, region) at a time, and the write is a replace — rows for
 * that scope are deleted and re-inserted in one transaction, so a re-run can
 * never leave a comp's stale numbers behind.
 *
 * Rank buckets are about provenance, not about each player's rank: Riot does not
 * expose rank-at-time-of-match, so a match counts toward `master+` when at least
 * one of its participants is a tracked Master+ player — i.e. when the high-elo
 * ladder is how we found it. `all` is every crawled board. While only Master+
 * ladders are crawled the two samples are identical; they diverge the moment a
 * lower ladder is seeded, which is why both are written.
 */

export const RANK_BUCKETS = ["master+", "all"] as const;
export type RankBucketName = (typeof RANK_BUCKETS)[number];

type BoardRow = {
  match_id: string;
  puuid: string;
  placement: number;
  master_plus: boolean;
  set_number: number;
  units: string[];
  traits: string[];
  augments: string[];
};

type Accumulator = { games: number; placeSum: number; top4: number; wins: number };

export type ScopeSummary = {
  patch: string;
  region: string;
  boards: number;
  classified: number;
  unclassified: number;
  rows: number;
  /** Rows written to `comp_augment_stats` for this scope. */
  augmentRows: number;
};

export type SetSummary = {
  setNumber: number;
  patch: string;
  matches: number;
  /** Published comps declared for this set. Zero means nothing can be classified. */
  comps: number;
};

export type AggregateSummary = {
  scopes: ScopeSummary[];
  rowsWritten: number;
  augmentRowsWritten: number;
  compsLoaded: number;
  sets: SetSummary[];
};

/**
 * Per-set freshness: which sets have crawled games, and whether any comps exist
 * to classify them. A set with matches but no comps is the Set-rollover case.
 */
export async function getSetSummary(filter: { set?: number } = {}): Promise<SetSummary[]> {
  const sql = db();
  const setFilter = filter.set ?? null;

  return sql<SetSummary[]>`
    SELECT
      m.set_number AS "setNumber",
      m.patch,
      count(*)::int AS matches,
      (SELECT count(*)::int FROM comps c WHERE c.set_number = m.set_number AND c.published) AS comps
    FROM matches m
    WHERE (${setFilter}::int IS NULL OR m.set_number = ${setFilter})
    GROUP BY m.set_number, m.patch
    ORDER BY m.set_number DESC, m.patch DESC
  `;
}

export async function aggregate(
  options: { patch?: string; region?: string; set?: number } = {},
): Promise<AggregateSummary> {
  const sql = db();
  const patchFilter = options.patch ?? null;
  const regionFilter = options.region ?? null;
  const setFilter = options.set ?? null;

  const compRows = await sql<
    {
      comp_id: string;
      slug: string;
      set_number: number;
      core_units: string[];
      defining_trait: string | null;
    }[]
  >`
    SELECT comp_id, slug, set_number, core_units, defining_trait
    FROM comps
    WHERE published = true
  `;

  if (compRows.length === 0) {
    throw new Error(
      "No published comps in the database. Run `npm run crawl -- sync-comps` first — " +
        "without curated comps every board is unclassified by definition.",
    );
  }

  // Comps are per set, and a patch belongs to one set; grouping by set keeps a
  // Set 19 comp from ever claiming a Set 18 board.
  const compsBySet = new Map<number, CompSignature[]>();
  for (const row of compRows) {
    const signature: CompSignature = {
      compId: row.comp_id,
      slug: row.slug,
      setName: row.set_number,
      coreUnits: row.core_units,
      definingTrait: row.defining_trait,
    };
    const existing = compsBySet.get(row.set_number);
    if (existing) existing.push(signature);
    else compsBySet.set(row.set_number, [signature]);
  }

  const scopes = await sql<{ patch: string; region: string }[]>`
    SELECT patch, region
    FROM matches
    WHERE (${patchFilter}::text IS NULL OR patch = ${patchFilter})
      AND (${regionFilter}::text IS NULL OR region = ${regionFilter})
      AND (${setFilter}::int IS NULL OR set_number = ${setFilter})
    GROUP BY patch, region
    ORDER BY patch, region
  `;

  const sets = await getSetSummary({ set: options.set });
  const summary: AggregateSummary = {
    scopes: [],
    rowsWritten: 0,
    augmentRowsWritten: 0,
    compsLoaded: compRows.length,
    sets,
  };

  for (const scope of scopes) {
    const boards = await sql<BoardRow[]>`
      WITH scoped AS (
        SELECT
          m.match_id,
          m.set_number,
          EXISTS (
            SELECT 1
            FROM participants p2
            JOIN players pl ON pl.puuid = p2.puuid
            WHERE p2.match_id = m.match_id
              AND pl.tier IN ('MASTER', 'GRANDMASTER', 'CHALLENGER')
          ) AS master_plus
        FROM matches m
        WHERE m.patch = ${scope.patch} AND m.region = ${scope.region}
      )
      SELECT
        p.match_id,
        p.puuid,
        p.placement,
        s.master_plus,
        s.set_number,
        COALESCE((
          SELECT array_agg(u.unit_id)
          FROM participant_units u
          WHERE u.match_id = p.match_id AND u.puuid = p.puuid
        ), '{}') AS units,
        COALESCE((
          SELECT array_agg(t.trait_id)
          FROM participant_traits t
          WHERE t.match_id = p.match_id AND t.puuid = p.puuid AND t.tier_current > 0
        ), '{}') AS traits,
        -- Augments are read in the same pass rather than by a second scan: the
        -- per-comp aggregate needs them only for boards it already classifies.
        COALESCE((
          SELECT array_agg(a.augment_id)
          FROM participant_augments a
          WHERE a.match_id = p.match_id AND a.puuid = p.puuid
        ), '{}') AS augments
      FROM participants p
      JOIN scoped s ON s.match_id = p.match_id
    `;

    const bucketTotals = new Map<string, number>();
    const perBucketComp = new Map<string, Map<string, Accumulator>>();
    /** bucket → comp → augment → counts. Augments are a subset of the comp's boards. */
    const perBucketAugment = new Map<string, Map<string, Map<string, Accumulator>>>();
    const unclassifiedReasons = new Map<string, number>();
    let classifiedBoards = 0;

    for (const board of boards) {
      const comps = compsBySet.get(board.set_number) ?? [];
      const assignment = assignBoard(
        { units: board.units, traits: board.traits, placement: board.placement },
        comps,
        config.assignThreshold,
      );

      const buckets: RankBucketName[] = board.master_plus ? ["master+", "all"] : ["all"];

      if (assignment.compId === null) {
        unclassifiedReasons.set(
          assignment.reason,
          (unclassifiedReasons.get(assignment.reason) ?? 0) + 1,
        );
      } else {
        classifiedBoards += 1;
      }

      for (const bucket of buckets) {
        bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + 1);
        if (assignment.compId === null) continue;

        let byComp = perBucketComp.get(bucket);
        if (!byComp) {
          byComp = new Map<string, Accumulator>();
          perBucketComp.set(bucket, byComp);
        }

        const accumulator = byComp.get(assignment.compId) ?? {
          games: 0,
          placeSum: 0,
          top4: 0,
          wins: 0,
        };
        accumulator.games += 1;
        accumulator.placeSum += board.placement;
        if (board.placement <= 4) accumulator.top4 += 1;
        if (board.placement === 1) accumulator.wins += 1;
        byComp.set(assignment.compId, accumulator);

        // One row per augment this board took. A Set dedupes ids from a payload
        // that listed the same augment twice; a board counts once per augment, so
        // the augment sample can never exceed the comp's game count.
        if (board.augments.length > 0) {
          let byCompAugment = perBucketAugment.get(bucket);
          if (!byCompAugment) {
            byCompAugment = new Map<string, Map<string, Accumulator>>();
            perBucketAugment.set(bucket, byCompAugment);
          }

          let byAugment = byCompAugment.get(assignment.compId);
          if (!byAugment) {
            byAugment = new Map<string, Accumulator>();
            byCompAugment.set(assignment.compId, byAugment);
          }

          for (const augmentId of new Set(board.augments)) {
            const augmentAcc = byAugment.get(augmentId) ?? {
              games: 0,
              placeSum: 0,
              top4: 0,
              wins: 0,
            };
            augmentAcc.games += 1;
            augmentAcc.placeSum += board.placement;
            if (board.placement <= 4) augmentAcc.top4 += 1;
            if (board.placement === 1) augmentAcc.wins += 1;
            byAugment.set(augmentId, augmentAcc);
          }
        }
      }
    }

    let rowsForScope = 0;
    let augmentRowsForScope = 0;

    for (const [bucket, total] of bucketTotals) {
      const byComp = perBucketComp.get(bucket) ?? new Map<string, Accumulator>();

      // Counts, not rates: sums stay exact when the site combines regions, and
      // `boards` is the denominator pick rate needs. Rates and the Wilson bound
      // are derived on read.
      const rows = [...byComp.entries()].map(([compId, acc]) => ({
        comp_id: compId,
        patch: scope.patch,
        region: scope.region,
        rank_bucket: bucket,
        games: acc.games,
        place_sum: acc.placeSum,
        top4_count: acc.top4,
        win_count: acc.wins,
        // Includes unclassified boards on purpose: pick rate answers "how often
        // did the lobby play this", not "how often when we could name it".
        boards: total,
      }));

      // Every augment/comp pair that occurred. The read side decides what sample
      // is worth quoting, so a threshold change does not need a re-mining pass.
      const augmentRows = [
        ...(perBucketAugment.get(bucket) ?? new Map<string, Map<string, Accumulator>>()),
      ].flatMap(([compId, byAugment]) =>
        [...byAugment].map(([augmentId, acc]) => ({
          comp_id: compId,
          patch: scope.patch,
          region: scope.region,
          rank_bucket: bucket,
          augment_id: augmentId,
          games: acc.games,
          place_sum: acc.placeSum,
          top4_count: acc.top4,
          win_count: acc.wins,
        })),
      );

      await sql.begin(async (tx) => {
        await tx`
          DELETE FROM comp_stats
          WHERE patch = ${scope.patch} AND region = ${scope.region} AND rank_bucket = ${bucket}
        `;
        if (rows.length > 0) {
          await tx`
            INSERT INTO comp_stats ${tx(
              rows,
              "comp_id",
              "patch",
              "region",
              "rank_bucket",
              "games",
              "place_sum",
              "top4_count",
              "win_count",
              "boards",
            )}
          `;
        }

        // Same transaction as comp_stats, so an augment row can never claim a
        // scope whose comp row was not replaced with it.
        await tx`
          DELETE FROM comp_augment_stats
          WHERE patch = ${scope.patch} AND region = ${scope.region} AND rank_bucket = ${bucket}
        `;
        if (augmentRows.length > 0) {
          await tx`
            INSERT INTO comp_augment_stats ${tx(
              augmentRows,
              "comp_id",
              "patch",
              "region",
              "rank_bucket",
              "augment_id",
              "games",
              "place_sum",
              "top4_count",
              "win_count",
            )}
          `;
        }
      });

      rowsForScope += rows.length;
      augmentRowsForScope += augmentRows.length;
    }

    const boardsInScope = bucketTotals.get("all") ?? 0;
    const unclassified = boardsInScope - classifiedBoards;

    summary.scopes.push({
      patch: scope.patch,
      region: scope.region,
      boards: boardsInScope,
      classified: classifiedBoards,
      unclassified,
      rows: rowsForScope,
      augmentRows: augmentRowsForScope,
    });
    summary.rowsWritten += rowsForScope;
    summary.augmentRowsWritten += augmentRowsForScope;

    log.info("scope aggregated", {
      patch: scope.patch,
      region: scope.region,
      boards: boardsInScope,
      classified: classifiedBoards,
      unclassified,
      unclassifiedPct:
        boardsInScope === 0 ? 0 : Math.round((unclassified / boardsInScope) * 1000) / 10,
      rows: rowsForScope,
      augmentRows: augmentRowsForScope,
      reasons: Object.fromEntries(unclassifiedReasons),
    });
  }

  // Set rollover: new boards but no comps for that set means everything is
  // unclassified by construction. Say what to do about it, loudly, once per run.
  for (const entry of sets) {
    if (entry.comps === 0 && entry.matches > 0) {
      log.warn("set has crawled boards but no published comps — all of them are unclassified", {
        setNumber: entry.setNumber,
        patch: entry.patch,
        matches: entry.matches,
        action:
          `add set ${entry.setNumber} comps to src/content/comps.ts, then run ` +
          "`npm run crawl -- sync-comps` and aggregate again",
      });
    }
  }

  return summary;
}

/* -------------------------------------------------------------------------- */
/* Bootstrap: seed a patch window as soon as its first games land             */
/* -------------------------------------------------------------------------- */

/**
 * A (patch, region) pair that exists in `matches`, with what aggregate needs to
 * know about it: whether it already has stats, and whether its set has comps.
 */
export type ScopeSeed = {
  patch: string;
  region: string;
  setNumber: number;
  seeded: boolean;
  /** Published comps for the set. Zero means aggregation would classify nothing. */
  comps: number;
};

export type BootstrapPlan = {
  ready: ScopeSeed[];
  waitingForComps: ScopeSeed[];
};

/**
 * A patch window is worth seeding when it has games and its set has comps, but
 * no `comp_stats` rows yet. A set with no comps is reported separately: seeding
 * it would write zero rows and warn, so it waits for content instead.
 *
 * Pure, so the decision can be checked without a database.
 */
export function selectBootstrapScopes(scopes: ScopeSeed[]): BootstrapPlan {
  const pending = scopes.filter((scope) => !scope.seeded);
  return {
    ready: pending.filter((scope) => scope.comps > 0),
    waitingForComps: pending.filter((scope) => scope.comps === 0),
  };
}

async function readScopeSeeds(): Promise<ScopeSeed[]> {
  const sql = db();
  return sql<ScopeSeed[]>`
    SELECT
      scopes.patch,
      scopes.region,
      scopes.set_number AS "setNumber",
      EXISTS (
        SELECT 1 FROM comp_stats s
        WHERE s.patch = scopes.patch AND s.region = scopes.region
      ) AS seeded,
      (
        SELECT count(*)::int FROM comps c
        WHERE c.set_number = scopes.set_number AND c.published
      ) AS comps
    FROM (SELECT DISTINCT patch, region, set_number FROM matches) AS scopes
    ORDER BY scopes.patch, scopes.region
  `;
}

export type BootstrapSummary = AggregateSummary & {
  bootstrapped: { patch: string; region: string }[];
  waitingForComps: { patch: string; region: string; setNumber: number }[];
};

/** Logged once per scope per process, so a set waiting on content does not spam
 * the loop log every five minutes. */
const warnedWaitingScopes = new Set<string>();

/**
 * Seed every patch window that has games but no `comp_stats` rows yet.
 *
 * The periodic `aggregate()` refreshes existing scopes; this fills in a brand new
 * one — the patch-day case. Doing it from the run loop means the site's movers
 * can compare two windows as soon as the new patch has games, instead of waiting
 * up to `CRAWL_AGGREGATE_MINUTES` for the timer.
 *
 * Idempotent: once a scope has rows it is skipped, and a set without comps is
 * reported rather than seeded. `aggregate` still replaces rows per scope, so a
 * re-run can never leave partial numbers behind.
 */
export async function bootstrapNewPatches(): Promise<BootstrapSummary> {
  const plan = selectBootstrapScopes(await readScopeSeeds());

  const summary: BootstrapSummary = {
    scopes: [],
    rowsWritten: 0,
    augmentRowsWritten: 0,
    compsLoaded: 0,
    sets: [],
    bootstrapped: plan.ready.map(({ patch, region }) => ({ patch, region })),
    waitingForComps: plan.waitingForComps.map(({ patch, region, setNumber }) => ({
      patch,
      region,
      setNumber,
    })),
  };

  const fresh = plan.waitingForComps.filter((scope) => {
    const key = `${scope.patch}/${scope.region}`;
    if (warnedWaitingScopes.has(key)) return false;
    warnedWaitingScopes.add(key);
    return true;
  });

  if (fresh.length > 0) {
    log.warn("new patch window has games but its set has no published comps", {
      scopes: fresh.map(({ patch, region, setNumber }) => ({ patch, region, setNumber })),
      action:
        "add comps for the set to src/content/comps.ts, then run sync-comps — bootstrap seeds on the next cycle",
    });
  }

  for (const scope of plan.ready) {
    const result = await aggregate({ patch: scope.patch, region: scope.region });
    summary.scopes.push(...result.scopes);
    summary.rowsWritten += result.rowsWritten;
    summary.augmentRowsWritten += result.augmentRowsWritten;
    summary.compsLoaded = result.compsLoaded;
    summary.sets = result.sets;
  }

  if (plan.ready.length > 0) {
    log.info("new patch window seeded", {
      scopes: summary.bootstrapped,
      rows: summary.rowsWritten,
    });
  }

  return summary;
}
