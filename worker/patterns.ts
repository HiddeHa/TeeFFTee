import { db } from "./db";
import { createLogger } from "./log";

const log = createLogger("patterns");

/**
 * MATERIALISE THE AINALYSES STUDY
 *
 * The AInalyses page answers six questions about the crawled boards: which units
 * are played, which two units share a board, which three are a shell, which items
 * are held, which item a specific unit holds and how those boards finished. The
 * mining behind it is a self-join over `participant_units` (twice for a duo,
 * three times for a trio), and that cost grows with the crawl — a page that
 * re-mined per request would get slower every day the crawler ran.
 *
 * So the mining lives here, runs on the aggregate timer, and writes two derived
 * tables the page reads in one query:
 *
 *   board_studies    one row per set: the sample, the baseline and the thresholds
 *   board_patterns   one row per pattern: ids and counts, never a rate
 *
 * Rules this module keeps, because the page renders them:
 *
 *  1. **Counts, not rates.** `sample`, `place_sum`, `top4_count`, `win_count` and
 *     the denominators an overlap needs (`{"either":…}`, `{"anyBoards":…}`) are
 *     stored. Averages, rates and the "vs avg" delta are derived on read, in one
 *     place (`src/lib/analysis.ts`), exactly like `comp_stats`.
 *  2. **Ids, not names.** Names, costs and icons are resolved against the set
 *     catalogue on read, so a renamed unit converges instead of keeping a stale
 *     name in a derived table.
 *  3. **Replace, never append.** A set's rows are deleted and rewritten in one
 *     transaction, so a re-run cannot leave a pattern whose sample has shrunk.
 *  4. **Thresholds before statements.** Nothing below `MIN_SAMPLE` boards (or
 *     `MIN_PAIR_SAMPLE` item slots) is written at all, and both thresholds travel
 *     with the snapshot so the page never quotes a different one.
 */

export const MIN_SAMPLE = 25;
export const MIN_PAIR_SAMPLE = 15;

const UNIT_LIMIT = 15;
const ITEM_LIMIT = 15;
const UNIT_PAIR_LIMIT = 12;
const TRIO_LIMIT = 10;
const TRAIT_LIMIT = 15;

/** A character no Riot id contains, so a composite key is unambiguous. */
const SEP = "\u0001";

type Counts = { sample: number; placeSum: number; top4: number; wins: number };

type UnitRow = Counts & { unitId: string; starSum: number };
type ItemRow = Counts & { itemId: string };
type UnitItemRow = Counts & { unitId: string; itemId: string };
type UnitPairRow = Counts & { aUnitId: string; bUnitId: string };
type UnitTrioRow = Counts & { aUnitId: string; bUnitId: string; cUnitId: string };
type TraitRow = Counts & { traitId: string; tierSum: number };

type StudyRow = {
  setNumber: number;
  patches: string[];
  matches: number;
  boards: number;
  unitsSeen: number;
  itemsSeen: number;
  itemSlots: number;
  placeSum: number;
  top4Count: number;
  winCount: number;
};

type PatternRow = {
  set_number: number;
  kind: "unit" | "duo" | "core" | "item" | "item-unit" | "trait";
  key: string;
  rank: number;
  sample: number;
  place_sum: number;
  top4_count: number;
  win_count: number;
  extra: Record<string, number>;
};

export type PatternSetSummary = {
  setNumber: number;
  boards: number;
  matches: number;
  patterns: number;
  ms: number;
};

export type PatternSummary = {
  sets: PatternSetSummary[];
  rowsWritten: number;
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}${SEP}${b}` : `${b}${SEP}${a}`;
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/** Round to 2dp so stored ordering and rendered ordering agree. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Mine one set. Every number a pattern needs is counted here, including the
 * denominators for the duo and trio overlaps — the page never joins raw rows.
 */
async function mineSet(setNumber: number): Promise<{
  study: StudyRow;
  patterns: PatternRow[];
}> {
  const sql = db();

  const [baselineRows, patchRows, diversityRows, unitRows] = await Promise.all([
    sql<{ boards: number; matches: number; placeSum: number; top4: number; wins: number }[]>`
      SELECT
        count(*)::int AS boards,
        count(DISTINCT p.match_id)::int AS matches,
        coalesce(sum(p.placement), 0)::int AS "placeSum",
        (count(*) FILTER (WHERE p.placement <= 4))::int AS top4,
        (count(*) FILTER (WHERE p.placement = 1))::int AS wins
      FROM participants p
      JOIN matches m ON m.match_id = p.match_id
      WHERE m.set_number = ${setNumber}
    `,
    sql<{ patch: string }[]>`
      SELECT DISTINCT patch FROM matches WHERE set_number = ${setNumber}
    `,
    sql<{ units: number; slots: number }[]>`
      SELECT
        count(DISTINCT u.unit_id)::int AS units,
        count(*)::int AS slots
      FROM participant_units u
      JOIN matches m ON m.match_id = u.match_id
      WHERE m.set_number = ${setNumber}
    `,
    sql<UnitRow[]>`
      SELECT
        u.unit_id AS "unitId",
        count(*)::int AS sample,
        coalesce(sum(p.placement), 0)::int AS "placeSum",
        (count(*) FILTER (WHERE p.placement <= 4))::int AS top4,
        (count(*) FILTER (WHERE p.placement = 1))::int AS wins,
        coalesce(sum(u.star_level), 0)::int AS "starSum"
      FROM participant_units u
      JOIN matches m ON m.match_id = u.match_id
      JOIN participants p ON p.match_id = u.match_id AND p.puuid = u.puuid
      WHERE m.set_number = ${setNumber}
      GROUP BY u.unit_id
      HAVING count(*) >= ${MIN_SAMPLE}
      ORDER BY count(*) DESC, u.unit_id ASC
      LIMIT ${UNIT_LIMIT}
    `,
  ]);

  const baseline = baselineRows[0];
  const boards = baseline?.boards ?? 0;
  const unitIds = unitRows.map((row) => row.unitId);

  const study: StudyRow = {
    setNumber,
    patches: patchRows.map((row) => row.patch).sort(),
    matches: baseline?.matches ?? 0,
    boards,
    unitsSeen: diversityRows[0]?.units ?? 0,
    itemsSeen: 0,
    itemSlots: diversityRows[0]?.slots ?? 0,
    placeSum: baseline?.placeSum ?? 0,
    top4Count: baseline?.top4 ?? 0,
    winCount: baseline?.wins ?? 0,
  };

  if (boards === 0 || unitIds.length === 0) return { study, patterns: [] };

  const [
    itemDiversityRows,
    itemRows,
    unitItemRows,
    pairRows,
    trioRows,
    traitRows,
  ] = await Promise.all([
    sql<{ items: number }[]>`
      SELECT count(DISTINCT item_id)::int AS items
      FROM (
        SELECT u.item_0 AS item_id
        FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        WHERE m.set_number = ${setNumber} AND u.item_0 IS NOT NULL
        UNION ALL
        SELECT u.item_1 FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        WHERE m.set_number = ${setNumber} AND u.item_1 IS NOT NULL
        UNION ALL
        SELECT u.item_2 FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        WHERE m.set_number = ${setNumber} AND u.item_2 IS NOT NULL
      ) slots
    `,
    // A slot holds at most three items, so these three branches are the whole
    // story; UNION ALL rather than a lateral join keeps it a plain aggregate.
    sql<ItemRow[]>`
      SELECT
        item_id AS "itemId",
        count(*)::int AS sample,
        coalesce(sum(placement), 0)::int AS "placeSum",
        (count(*) FILTER (WHERE placement <= 4))::int AS top4,
        (count(*) FILTER (WHERE placement = 1))::int AS wins
      FROM (
        SELECT u.item_0 AS item_id, p.placement
        FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        JOIN participants p ON p.match_id = u.match_id AND p.puuid = u.puuid
        WHERE m.set_number = ${setNumber} AND u.item_0 IS NOT NULL
        UNION ALL
        SELECT u.item_1, p.placement
        FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        JOIN participants p ON p.match_id = u.match_id AND p.puuid = u.puuid
        WHERE m.set_number = ${setNumber} AND u.item_1 IS NOT NULL
        UNION ALL
        SELECT u.item_2, p.placement
        FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        JOIN participants p ON p.match_id = u.match_id AND p.puuid = u.puuid
        WHERE m.set_number = ${setNumber} AND u.item_2 IS NOT NULL
      ) slots
      GROUP BY item_id
      HAVING count(*) >= ${MIN_SAMPLE}
      ORDER BY count(*) DESC, item_id ASC
      LIMIT ${ITEM_LIMIT}
    `,
    // Every item-on-a-unit pair above the pair threshold: the page needs all of
    // them for each unit's two common items and for the best-finishing list, not
    // just the dozen it shows as "popular".
    sql<UnitItemRow[]>`
      SELECT
        unit_id AS "unitId",
        item_id AS "itemId",
        count(*)::int AS sample,
        coalesce(sum(placement), 0)::int AS "placeSum",
        (count(*) FILTER (WHERE placement <= 4))::int AS top4,
        (count(*) FILTER (WHERE placement = 1))::int AS wins
      FROM (
        SELECT u.unit_id, u.item_0 AS item_id, p.placement
        FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        JOIN participants p ON p.match_id = u.match_id AND p.puuid = u.puuid
        WHERE m.set_number = ${setNumber} AND u.item_0 IS NOT NULL
        UNION ALL
        SELECT u.unit_id, u.item_1, p.placement
        FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        JOIN participants p ON p.match_id = u.match_id AND p.puuid = u.puuid
        WHERE m.set_number = ${setNumber} AND u.item_1 IS NOT NULL
        UNION ALL
        SELECT u.unit_id, u.item_2, p.placement
        FROM participant_units u
        JOIN matches m ON m.match_id = u.match_id
        JOIN participants p ON p.match_id = u.match_id AND p.puuid = u.puuid
        WHERE m.set_number = ${setNumber} AND u.item_2 IS NOT NULL
      ) slots
      WHERE unit_id = ANY(${unitIds}::text[])
      GROUP BY unit_id, item_id
      HAVING count(*) >= ${MIN_PAIR_SAMPLE}
      ORDER BY count(*) DESC, unit_id ASC, item_id ASC
    `,
    // All pairs among the mined units, including ones below the reporting
    // threshold: a trio's union needs all three, and a pair on 12 boards still
    // overlaps real boards.
    sql<UnitPairRow[]>`
      SELECT
        a.unit_id AS "aUnitId",
        b.unit_id AS "bUnitId",
        count(*)::int AS sample,
        coalesce(sum(p.placement), 0)::int AS "placeSum",
        (count(*) FILTER (WHERE p.placement <= 4))::int AS top4,
        (count(*) FILTER (WHERE p.placement = 1))::int AS wins
      FROM participant_units a
      JOIN participant_units b
        ON b.match_id = a.match_id AND b.puuid = a.puuid AND a.unit_id < b.unit_id
      JOIN matches m ON m.match_id = a.match_id
      JOIN participants p ON p.match_id = a.match_id AND p.puuid = a.puuid
      WHERE m.set_number = ${setNumber}
        AND a.unit_id = ANY(${unitIds}::text[])
        AND b.unit_id = ANY(${unitIds}::text[])
      GROUP BY a.unit_id, b.unit_id
    `,
    sql<UnitTrioRow[]>`
      SELECT
        a.unit_id AS "aUnitId",
        b.unit_id AS "bUnitId",
        c.unit_id AS "cUnitId",
        count(*)::int AS sample,
        coalesce(sum(p.placement), 0)::int AS "placeSum",
        (count(*) FILTER (WHERE p.placement <= 4))::int AS top4,
        (count(*) FILTER (WHERE p.placement = 1))::int AS wins
      FROM participant_units a
      JOIN participant_units b
        ON b.match_id = a.match_id AND b.puuid = a.puuid AND a.unit_id < b.unit_id
      JOIN participant_units c
        ON c.match_id = a.match_id AND c.puuid = a.puuid AND b.unit_id < c.unit_id
      JOIN matches m ON m.match_id = a.match_id
      JOIN participants p ON p.match_id = a.match_id AND p.puuid = a.puuid
      WHERE m.set_number = ${setNumber}
        AND a.unit_id = ANY(${unitIds}::text[])
        AND b.unit_id = ANY(${unitIds}::text[])
        AND c.unit_id = ANY(${unitIds}::text[])
      GROUP BY a.unit_id, b.unit_id, c.unit_id
      HAVING count(*) >= ${MIN_SAMPLE}
    `,
    sql<TraitRow[]>`
      SELECT
        t.trait_id AS "traitId",
        count(*)::int AS sample,
        coalesce(sum(p.placement), 0)::int AS "placeSum",
        (count(*) FILTER (WHERE p.placement <= 4))::int AS top4,
        (count(*) FILTER (WHERE p.placement = 1))::int AS wins,
        coalesce(sum(t.tier_current), 0)::int AS "tierSum"
      FROM participant_traits t
      JOIN matches m ON m.match_id = t.match_id
      JOIN participants p ON p.match_id = t.match_id AND p.puuid = t.puuid
      WHERE m.set_number = ${setNumber} AND t.tier_current > 0
      GROUP BY t.trait_id
      HAVING count(*) >= ${MIN_SAMPLE}
      ORDER BY count(*) DESC, t.trait_id ASC
      LIMIT ${TRAIT_LIMIT}
    `,
  ]);

  study.itemsSeen = itemDiversityRows[0]?.items ?? 0;

  const unitBoards = new Map(unitRows.map((row) => [row.unitId, row.sample]));
  const baselineAvgPlace = rate(study.placeSum, boards);

  /** Pair counts keyed both ways, for the trio union's inclusion–exclusion. */
  const pairBoards = new Map(
    pairRows.map((row) => [pairKey(row.aUnitId, row.bUnitId), row.sample]),
  );
  const boardsOfBoth = (a: string, b: string) => pairBoards.get(pairKey(a, b)) ?? 0;

  const patterns: PatternRow[] = [];

  const push = (
    kind: PatternRow["kind"],
    key: string,
    rank: number,
    counts: Counts,
    extra: Record<string, number> = {},
  ) => {
    patterns.push({
      set_number: setNumber,
      kind,
      key,
      rank,
      sample: counts.sample,
      place_sum: counts.placeSum,
      top4_count: counts.top4,
      win_count: counts.wins,
      extra,
    });
  };

  // Units: most-played first. The two items each one held most often are derived
  // on read from the item-unit rows, so there is one source for them.
  unitRows.forEach((row, index) => {
    push("unit", row.unitId, index + 1, row, { starSum: row.starSum });
  });

  itemRows.forEach((row, index) => {
    push("item", row.itemId, index + 1, row);
  });

  // Item on a unit: ordered by how often it happens. The page takes the top of
  // this list for "popular" and re-sorts it by finish for "best".
  unitItemRows.forEach((row, index) => {
    push("item-unit", `${row.unitId}${SEP}${row.itemId}`, index + 1, row);
  });

  const duos = pairRows
    .filter((row) => row.sample >= MIN_SAMPLE)
    .map((row) => {
      const either =
        (unitBoards.get(row.aUnitId) ?? 0) + (unitBoards.get(row.bUnitId) ?? 0) - row.sample;
      return { row, either, overlap: rate(row.sample, either) };
    })
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        b.row.sample - a.row.sample ||
        a.row.aUnitId.localeCompare(b.row.aUnitId),
    )
    .slice(0, UNIT_PAIR_LIMIT);

  duos.forEach((entry, index) => {
    push("duo", `${entry.row.aUnitId}${SEP}${entry.row.bUnitId}`, index + 1, entry.row, {
      either: entry.either,
    });
  });

  const trios = trioRows
    .map((row) => {
      // Inclusion–exclusion: boards holding any of the three. The pair counts are
      // the unions of each pair, so they are added back once.
      const any =
        (unitBoards.get(row.aUnitId) ?? 0) +
        (unitBoards.get(row.bUnitId) ?? 0) +
        (unitBoards.get(row.cUnitId) ?? 0) -
        boardsOfBoth(row.aUnitId, row.bUnitId) -
        boardsOfBoth(row.aUnitId, row.cUnitId) -
        boardsOfBoth(row.bUnitId, row.cUnitId) +
        row.sample;
      return { row, any, overlap: rate(row.sample, any) };
    })
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        b.row.sample - a.row.sample ||
        a.row.aUnitId.localeCompare(b.row.aUnitId),
    )
    .slice(0, TRIO_LIMIT);

  trios.forEach((entry, index) => {
    push(
      "core",
      `${entry.row.aUnitId}${SEP}${entry.row.bUnitId}${SEP}${entry.row.cUnitId}`,
      index + 1,
      entry.row,
      { anyBoards: entry.any },
    );
  });

  traitRows.forEach((row, index) => {
    push("trait", row.traitId, index + 1, row, { tierSum: row.tierSum });
  });

  log.info("set mined", {
    setNumber,
    boards,
    baselineAvgPlace: round2(baselineAvgPlace),
    units: unitRows.length,
    itemPairs: unitItemRows.length,
    duos: duos.length,
    trios: trios.length,
    patterns: patterns.length,
  });

  return { study, patterns };
}

/** Replace one set's study and patterns in a single transaction. */
async function writeStudy(study: StudyRow, patterns: PatternRow[]): Promise<void> {
  const sql = db();

  await sql.begin(async (tx) => {
    // Children first: the study row is the parent, and the cascade would cover
    // it, but deleting explicitly keeps the order obvious.
    await tx`DELETE FROM board_patterns WHERE set_number = ${study.setNumber}`;

    await tx`
      INSERT INTO board_studies (
        set_number, patches, matches, boards, units_seen, items_seen, item_slots,
        place_sum, top4_count, win_count, min_sample, min_pair_sample, computed_at
      ) VALUES (
        ${study.setNumber}, ${study.patches}::text[], ${study.matches}, ${study.boards},
        ${study.unitsSeen}, ${study.itemsSeen}, ${study.itemSlots}, ${study.placeSum},
        ${study.top4Count}, ${study.winCount}, ${MIN_SAMPLE}, ${MIN_PAIR_SAMPLE}, now()
      )
      ON CONFLICT (set_number) DO UPDATE SET
        patches = excluded.patches,
        matches = excluded.matches,
        boards = excluded.boards,
        units_seen = excluded.units_seen,
        items_seen = excluded.items_seen,
        item_slots = excluded.item_slots,
        place_sum = excluded.place_sum,
        top4_count = excluded.top4_count,
        win_count = excluded.win_count,
        min_sample = excluded.min_sample,
        min_pair_sample = excluded.min_pair_sample,
        computed_at = now()
    `;

    if (patterns.length > 0) {
      await tx`
        INSERT INTO board_patterns ${tx(
          patterns,
          "set_number",
          "kind",
          "key",
          "rank",
          "sample",
          "place_sum",
          "top4_count",
          "win_count",
          "extra",
        )}
      `;
    }
  });
}

/**
 * Refresh the materialised study for one set, or every set with crawled boards.
 *
 * Idempotent and replace-only: running it twice writes the same rows twice. A set
 * with no boards still gets a study row, so the page can say "no boards" rather
 * than "never materialised" — those are different facts.
 */
export async function refreshPatterns(options: { set?: number } = {}): Promise<PatternSummary> {
  const sql = db();
  const sets =
    options.set !== undefined
      ? [options.set]
      : (
          await sql<{ set_number: number }[]>`
            SELECT DISTINCT set_number FROM matches ORDER BY set_number
          `
        ).map((row) => row.set_number);

  const summary: PatternSummary = { sets: [], rowsWritten: 0 };

  for (const setNumber of sets) {
    const startedAt = Date.now();
    const { study, patterns } = await mineSet(setNumber);
    await writeStudy(study, patterns);

    const entry: PatternSetSummary = {
      setNumber,
      boards: study.boards,
      matches: study.matches,
      patterns: patterns.length,
      ms: Date.now() - startedAt,
    };
    summary.sets.push(entry);
    summary.rowsWritten += patterns.length;

    log.info("patterns materialised", entry);
  }

  return summary;
}

export function formatPatternReport(summary: PatternSummary): string {
  const lines: string[] = [""];

  if (summary.sets.length === 0) {
    lines.push("no sets have crawled boards, so there is nothing to mine.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`sets      ${summary.sets.length}  ·  ${summary.rowsWritten} pattern rows written`);
  lines.push("");

  for (const entry of summary.sets) {
    lines.push(
      `  set ${String(entry.setNumber).padEnd(2)} boards ${String(entry.boards).padEnd(7)}` +
        ` matches ${String(entry.matches).padEnd(7)} patterns ${String(entry.patterns).padEnd(5)}` +
        ` ${(entry.ms / 1000).toFixed(1)}s`,
    );
  }

  lines.push("");
  return lines.join("\n");
}
