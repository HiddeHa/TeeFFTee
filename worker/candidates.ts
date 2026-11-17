import { db } from "./db";

/**
 * CANDIDATE COMP FINDER
 *
 * The curated comps are written by hand, but which units actually go together
 * should not be a guess. This module mines the crawled boards for the unit sets
 * that recur, then ranks them by how they actually placed.
 *
 * It is the evidence half of the curation loop:
 *
 *   crawl → candidates → a human writes the comp (name, items, why now) → sync-comps
 *
 * Two properties matter more than the ranking itself:
 *
 *  1. **Maximal cores, not every subset.** `{A,B,C}` with 5,000 boards and
 *     `{A,B,C,D}` with 4,950 boards describe one board, not two. A subset is
 *     dropped when a superset explains ≥90% of its boards
 *     (`ABSORB_SHARE`), so the output is a list of distinct shapes.
 *  2. **Support before placement.** A core is only reported once it has
 *     `minGames` boards, and the printout shows the scope's baseline average
 *     placement next to it — a "core" that places worse than an average board
 *     is a fact about the ladder, not a comp worth publishing.
 *
 * Nothing here writes to the database or decides what a comp is.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Board = {
  matchId: string;
  puuid: string;
  placement: number;
  /** Distinct unit ids on the final board. */
  units: string[];
  /** Traits with at least one active unit (`tier_current > 0`). */
  traits: string[];
};

export type CoreStats = {
  units: string[];
  games: number;
  placeSum: number;
  top4: number;
  wins: number;
};

export type MineOptions = {
  /** Boards a core must appear on to be reported at all. */
  minGames: number;
  /** Largest core to consider. 4 is the practical ceiling: bigger sets fragment. */
  maxCore: number;
  /** A subset is dropped when a superset explains this share of its boards. */
  absorbShare?: number;
};

export type UnitDetail = {
  unitId: string;
  /** Times this unit appeared on a board that contained the whole core. */
  appearances: number;
  avgStar: number;
  /** Most common completed items, by share of appearances. */
  items: { itemId: string; share: number }[];
};

export type Candidate = CoreStats & {
  avgPlace: number;
  top4Rate: number;
  winRate: number;
  /** Scope baseline minus this core's average placement. Positive is better. */
  delta: number;
  traits: { traitId: string; share: number }[];
  perUnit: UnitDetail[];
};

export type Scope = {
  setNumber?: number;
  patch?: string;
  region?: string;
  /** `master+` restricts to matches where a tracked Master+ player was present. */
  bucket?: "master+" | "all";
};

export type CandidateReport = {
  scope: Scope;
  boards: number;
  distinctUnits: number;
  baselineAvgPlace: number;
  candidates: Candidate[];
};

/** A subset survives only if a superset does *not* explain this share of it. */
export const ABSORB_SHARE = 0.9;

/* -------------------------------------------------------------------------- */
/* Mining (pure)                                                              */
/* -------------------------------------------------------------------------- */

const SEPARATOR = "\u0001";

function keyOf(units: string[]): string {
  return units.join(SEPARATOR);
}

/** Sorted and deduplicated: the key must not depend on payload ordering. */
function normaliseUnits(units: string[]): string[] {
  return [...new Set(units)].sort();
}

function* combinations(items: string[], size: number): Generator<string[]> {
  if (size > items.length) return;
  if (size === 1) {
    for (const item of items) yield [item];
    return;
  }

  for (let index = 0; index <= items.length - size; index += 1) {
    const head = items[index] as string;
    for (const tail of combinations(items.slice(index + 1), size - 1)) {
      yield [head, ...tail];
    }
  }
}

function allSubsetsFrequent(combo: string[], frequent: Set<string>): boolean {
  // Downward closure: a set can only be frequent if every immediate subset is.
  // Without this the candidate maps blow up on the long tail of one-off boards.
  for (let skip = 0; skip < combo.length; skip += 1) {
    const subset = [...combo.slice(0, skip), ...combo.slice(skip + 1)];
    if (!frequent.has(keyOf(subset))) return false;
  }
  return true;
}

function countLevel(
  boards: Board[],
  size: number,
  minGames: number,
  frequentBelow: Set<string> | null,
): CoreStats[] {
  const counts = new Map<string, CoreStats>();

  for (const board of boards) {
    if (board.units.length < size) continue;

    for (const combo of combinations(board.units, size)) {
      if (frequentBelow && !allSubsetsFrequent(combo, frequentBelow)) continue;

      const key = keyOf(combo);
      let entry = counts.get(key);
      if (!entry) {
        entry = { units: combo, games: 0, placeSum: 0, top4: 0, wins: 0 };
        counts.set(key, entry);
      }
      entry.games += 1;
      entry.placeSum += board.placement;
      if (board.placement <= 4) entry.top4 += 1;
      if (board.placement === 1) entry.wins += 1;
    }
  }

  return [...counts.values()].filter((entry) => entry.games >= minGames);
}

/**
 * Drop every core that a slightly larger core already explains.
 *
 * Runs largest-first so a chain (`{A,B}` → `{A,B,C}` → `{A,B,C,D}`) collapses
 * to the largest set in one pass, and only looks one size up per candidate —
 * that is enough to catch the chain, and keeps the pass O(cores × units)
 * instead of quadratic in the number of cores.
 */
export function pruneRedundant(
  candidates: CoreStats[],
  unitPool: string[],
  absorbShare = ABSORB_SHARE,
): CoreStats[] {
  const gamesByKey = new Map<string, number>();
  const bySize = new Map<number, CoreStats[]>();

  for (const candidate of candidates) {
    gamesByKey.set(keyOf(candidate.units), candidate.games);
    const bucket = bySize.get(candidate.units.length) ?? [];
    bucket.push(candidate);
    bySize.set(candidate.units.length, bucket);
  }

  const absorbed = new Set<string>();
  const sizes = [...bySize.keys()].sort((a, b) => b - a);

  for (const size of sizes) {
    for (const candidate of bySize.get(size) ?? []) {
      const key = keyOf(candidate.units);

      for (const extra of unitPool) {
        if (candidate.units.includes(extra)) continue;

        const supersetKey = keyOf([...candidate.units, extra].sort());
        const supersetGames = gamesByKey.get(supersetKey);
        if (supersetGames === undefined) continue;

        // An absorbed superset still absorbs: `{X,Y}` is redundant if
        // `{X,Y,Z}` covers the same boards, whether or not `{X,Y,Z}` is itself
        // covered by `{X,Y,Z,W}`. Skipping absorbed supersets would leave those
        // pairs in the list.
        if (supersetGames / candidate.games >= absorbShare) {
          absorbed.add(key);
          break;
        }
      }
    }
  }

  return candidates.filter((candidate) => !absorbed.has(keyOf(candidate.units)));
}

/**
 * Frequent unit sets across the given boards, redundant subsets removed.
 *
 * Exported on its own so the algorithm can be tested without a database.
 */
export function mineCores(boards: Board[], options: MineOptions): CoreStats[] {
  const prepared = boards
    .map((board) => ({ ...board, units: normaliseUnits(board.units) }))
    .filter((board) => board.units.length >= 2);

  const minGames = Math.max(2, Math.floor(options.minGames));
  const maxCore = Math.max(2, Math.floor(options.maxCore));

  let frequent = countLevel(prepared, 1, minGames, null);
  const mined: CoreStats[] = [];

  for (let size = 2; size <= maxCore; size += 1) {
    const frequentBelow = new Set(frequent.map((entry) => keyOf(entry.units)));
    const level = countLevel(prepared, size, minGames, frequentBelow);
    if (level.length === 0) break;

    mined.push(...level);
    frequent = level;
  }

  const unitPool = [...new Set(prepared.flatMap((board) => board.units))].sort();
  return pruneRedundant(mined, unitPool, options.absorbShare ?? ABSORB_SHARE);
}

/* -------------------------------------------------------------------------- */
/* Read side                                                                  */
/* -------------------------------------------------------------------------- */

/** Boards in scope, with their units and active traits. */
export async function loadBoards(scope: Scope): Promise<Board[]> {
  const sql = db();
  const setNumber = scope.setNumber ?? null;
  const patch = scope.patch ?? null;
  const region = scope.region ?? null;
  const masterOnly = scope.bucket === "master+" ? "master+" : null;

  return sql<Board[]>`
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
      WHERE (${setNumber}::int IS NULL OR m.set_number = ${setNumber})
        AND (${patch}::text IS NULL OR m.patch = ${patch})
        AND (${region}::text IS NULL OR m.region = ${region})
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
    WHERE (${masterOnly}::text IS NULL OR s.master_plus)
  `;
}

export type UnitDetailRow = {
  unitId: string;
  star: number;
  item0: string | null;
  item1: string | null;
  item2: string | null;
};

/**
 * Item-unit miner: one row per core unit per board → per-unit appearances, star
 * average and the items it held most often.
 *
 * The share denominator is appearances, not item slots: a unit played with no
 * items still counts, so shares stay comparable across units that itemise
 * differently. Only the top two items are kept — that is what the page shows —
 * and a tie keeps the payload's slot order (`item0`, `item1`, `item2`).
 *
 * Pure and exported so the rule can be tested without a database.
 */
export function summariseUnitItems(
  rows: UnitDetailRow[],
  coreUnits: string[],
): UnitDetail[] {
  const byUnit = new Map<
    string,
    { appearances: number; starSum: number; items: Map<string, number> }
  >();

  for (const row of rows) {
    const entry = byUnit.get(row.unitId) ?? {
      appearances: 0,
      starSum: 0,
      items: new Map<string, number>(),
    };
    entry.appearances += 1;
    entry.starSum += row.star;
    for (const itemId of [row.item0, row.item1, row.item2]) {
      if (!itemId) continue;
      entry.items.set(itemId, (entry.items.get(itemId) ?? 0) + 1);
    }
    byUnit.set(row.unitId, entry);
  }

  return coreUnits.map((unitId) => {
    const entry = byUnit.get(unitId);
    if (!entry || entry.appearances === 0) {
      return { unitId, appearances: 0, avgStar: 0, items: [] };
    }

    return {
      unitId,
      appearances: entry.appearances,
      avgStar: Math.round((entry.starSum / entry.appearances) * 100) / 100,
      items: [...entry.items.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([itemId, count]) => ({
          itemId,
          share: Math.round((count / entry.appearances) * 1000) / 1000,
        })),
    };
  });
}

/**
 * Star levels and items for the units of one core, measured only on boards that
 * contained the whole core — an item's share is meaningless if it is averaged
 * over boards playing a different comp.
 */
export async function loadUnitDetail(scope: Scope, coreUnits: string[]): Promise<UnitDetail[]> {
  const sql = db();
  const setNumber = scope.setNumber ?? null;
  const patch = scope.patch ?? null;
  const region = scope.region ?? null;
  const masterOnly = scope.bucket === "master+" ? "master+" : null;

  const rows = await sql<UnitDetailRow[]>`
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
      WHERE (${setNumber}::int IS NULL OR m.set_number = ${setNumber})
        AND (${patch}::text IS NULL OR m.patch = ${patch})
        AND (${region}::text IS NULL OR m.region = ${region})
    ),
    core_boards AS (
      SELECT u.match_id, u.puuid
      FROM participant_units u
      JOIN scoped s ON s.match_id = u.match_id
      WHERE (${masterOnly}::text IS NULL OR s.master_plus)
        AND u.unit_id = ANY(${coreUnits}::text[])
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
  `;

  return summariseUnitItems(rows, coreUnits);
}

function traitShares(
  boards: Board[],
  coreUnits: string[],
): { traitId: string; share: number }[] {
  const counts = new Map<string, number>();
  let containing = 0;

  for (const board of boards) {
    const units = new Set(board.units);
    if (!coreUnits.every((unitId) => units.has(unitId))) continue;

    containing += 1;
    for (const traitId of board.traits) {
      counts.set(traitId, (counts.get(traitId) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => containing > 0 && count / containing >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([traitId, count]) => ({
      traitId,
      share: Math.round((count / containing) * 1000) / 1000,
    }));
}

export async function findCandidates(
  scope: Scope,
  options: MineOptions & { limit?: number },
): Promise<CandidateReport> {
  const boards = await loadBoards(scope);
  const prepared = boards
    .map((board) => ({ ...board, units: normaliseUnits(board.units) }))
    .filter((board) => board.units.length >= 2);

  const baselineAvgPlace =
    prepared.length === 0
      ? 0
      : Math.round(
          (prepared.reduce((sum, board) => sum + board.placement, 0) / prepared.length) * 100,
        ) / 100;

  const cores = mineCores(boards, options).sort(
    (a, b) => a.placeSum / a.games - b.placeSum / b.games || b.games - a.games,
  );

  const limit = Math.max(1, options.limit ?? 12);
  const top = cores.slice(0, limit);

  const candidates: Candidate[] = [];
  for (const core of top) {
    candidates.push({
      ...core,
      avgPlace: Math.round((core.placeSum / core.games) * 100) / 100,
      top4Rate: Math.round((core.top4 / core.games) * 1000) / 1000,
      winRate: Math.round((core.wins / core.games) * 1000) / 1000,
      delta: Math.round((baselineAvgPlace - core.placeSum / core.games) * 100) / 100,
      traits: traitShares(prepared, core.units),
      perUnit: await loadUnitDetail(scope, core.units),
    });
  }

  return {
    scope,
    boards: boards.length,
    distinctUnits: new Set(prepared.flatMap((board) => board.units)).size,
    baselineAvgPlace,
    candidates,
  };
}

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function scopeLine(scope: Scope): string {
  const parts: string[] = [];
  parts.push(scope.setNumber === undefined ? "all sets" : `set ${scope.setNumber}`);
  parts.push(scope.patch ? `patch ${scope.patch}` : "all patches");
  parts.push(scope.region ?? "all regions");
  parts.push(`bucket ${scope.bucket ?? "all"}`);
  return parts.join(" · ");
}

export function formatReport(report: CandidateReport): string {
  const lines: string[] = [""];
  lines.push(`scope     ${scopeLine(report.scope)}`);
  lines.push(
    `sample    ${report.boards} boards · ${report.distinctUnits} units · ` +
      `baseline avg place ${report.baselineAvgPlace}`,
  );

  if (report.candidates.length === 0) {
    lines.push("");
    lines.push("no core clears the thresholds in this scope.");
    lines.push(
      "either there is not enough crawled data yet (see `npm run crawl -- stats`), " +
        "or `--min-games` is above what one shape has.",
    );
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`cores     ${report.candidates.length} distinct shapes, best placement first`);
  lines.push("");

  report.candidates.forEach((candidate, index) => {
    const rank = String(index + 1).padStart(2);
    lines.push(
      `  ${rank}. ${candidate.games} boards · avg ${candidate.avgPlace} ` +
        `(${candidate.delta >= 0 ? "-" : "+"}${Math.abs(candidate.delta)} vs baseline) · ` +
        `top4 ${percent(candidate.top4Rate)} · win ${percent(candidate.winRate)}`,
    );
    lines.push(`      core    ${candidate.units.join(" + ")}`);

    const items = candidate.perUnit
      .map((unit) => {
        const detail = unit.items
          .map((item) => `${item.itemId} ${percent(item.share)}`)
          .join(", ");
        return `${unit.unitId} ${unit.avgStar}★${detail ? `: ${detail}` : ""}`;
      })
      .join(" · ");
    lines.push(`      units   ${items}`);

    if (candidate.traits.length > 0) {
      lines.push(
        `      traits  ${candidate.traits
          .map((trait) => `${trait.traitId} ${percent(trait.share)}`)
          .join(", ")}`,
      );
    }

    lines.push("");
  });

  return lines.join("\n");
}
