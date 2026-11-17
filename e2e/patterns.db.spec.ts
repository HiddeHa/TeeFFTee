import { spawn } from "node:child_process";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { seedComps, startHarness, type Harness, type Sql } from "./database";

/**
 * The SQL miners in `worker/patterns.ts`, against a seeded corpus.
 *
 * These queries are the only statistical code the unit suite cannot reach — the
 * page renders their output as measured, so an error here is a wrong number on a
 * page that claims to count. The corpus is built to exercise the rules rather
 * than a realistic meta:
 *
 *   - every threshold has a row exactly on it and a row one below it
 *     (`MIN_SAMPLE` 25 for units/items/duos/trios, `MIN_PAIR_SAMPLE` 15 for
 *     item-on-unit pairs, which are derived independently);
 *   - the trio overlap uses inclusion–exclusion, so the seeded counts make
 *     `A∪B∪C` differ from every pair's union;
 *   - one augment appears twice in a board's payload (two slots), which
 *     `aggregate` must count once.
 *
 * The board shape, which the assertions below refer to by id:
 *
 *   units   A×32  B×29  C×27  D×26  E×24        (E is below MIN_SAMPLE)
 *   pairs   AB×29 AC×27 BC×25                   (BC is exactly on the threshold)
 *   trio    ABC×25                              (anyBoards = 32)
 *   items   X×53  Z×29  Y×26  W×9               (W is below MIN_SAMPLE)
 *   pairs   A+X×20 B+X×18 C+X×15 C+Z×15 A+Z×14 B+Y×14
 */

const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");
const CLI = path.join("worker", "cli.ts");
const PG_PORT = 55443;

const SEP = "\u0001";

let harness: Harness | undefined;
let sql: Sql | undefined;

type CorpusBoard = { units: string[]; items: Record<string, string[]> };

function schedule(entries: Array<[item: string, count: number]>): string[] {
  return entries.flatMap(([item, count]) => Array.from({ length: count }, () => item));
}

/** Up to three items fit on one unit, so the schedule is handed out in threes. */
function chunk(items: string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < items.length; index += 3) {
    chunks.push(items.slice(index, index + 3));
  }
  return chunks;
}

function buildCorpus(): CorpusBoard[] {
  const boards: CorpusBoard[] = [];
  const add = (units: string[]) => boards.push({ units, items: {} });

  for (let index = 0; index < 25; index += 1) add(["A", "B", "C"]);
  for (let index = 0; index < 4; index += 1) add(["A", "B"]);
  for (let index = 0; index < 2; index += 1) add(["A", "C"]);
  add(["A"]);
  for (let index = 0; index < 26; index += 1) add(["D"]);
  for (let index = 0; index < 24; index += 1) add(["E"]);

  const queues: Record<string, string[][]> = {
    A: chunk(schedule([["X", 20], ["Y", 12], ["Z", 14], ["W", 9]])),
    B: chunk(schedule([["X", 18], ["Y", 14]])),
    C: chunk(schedule([["X", 15], ["Z", 15]])),
  };
  const cursor: Record<string, number> = { A: 0, B: 0, C: 0 };

  for (const board of boards) {
    for (const unit of board.units) {
      const queue = queues[unit];
      if (!queue) continue;
      const items = queue[cursor[unit] ?? 0] ?? [];
      cursor[unit] = (cursor[unit] ?? 0) + 1;
      board.items[unit] = items;
    }
  }

  return boards;
}

async function seedCorpus(db: Sql): Promise<void> {
  const boards = buildCorpus();

  await db`insert into matches ${db(
    boards.map((_, index) => ({
      match_id: `PATTERN_${index}`,
      region: "EUW",
      patch: "18.6",
      set_number: 18,
      queue_id: 1100,
      game_datetime: new Date(Date.UTC(2026, 10, 10, 12, index % 60)),
    })),
    "match_id",
    "region",
    "patch",
    "set_number",
    "queue_id",
    "game_datetime",
  )}`;

  await db`insert into participants ${db(
    boards.map((_, index) => ({
      match_id: `PATTERN_${index}`,
      puuid: `player-${index}`,
      placement: (index % 8) + 1,
    })),
    "match_id",
    "puuid",
    "placement",
  )}`;

  const unitRows = boards.flatMap((board, index) =>
    board.units.flatMap((unitId, slot) => {
      const items = board.items[unitId] ?? [];
      return [
        {
          match_id: `PATTERN_${index}`,
          puuid: `player-${index}`,
          unit_id: unitId,
          star_level: 1 + (index % 3),
          item_0: items[0] ?? null,
          item_1: items[1] ?? null,
          item_2: items[2] ?? null,
          slot,
        },
      ];
    }),
  );

  await db`insert into participant_units ${db(
    unitRows,
    "match_id",
    "puuid",
    "unit_id",
    "star_level",
    "item_0",
    "item_1",
    "item_2",
    "slot",
  )}`;

  // The same augment in two slots: a payload can list it twice, a board can only
  // have taken it once. AUG_B rides along on the first five A boards.
  const augmentRows = boards.flatMap((board, index) => {
    if (!board.units.includes("A")) return [];
    const rows = [
      { match_id: `PATTERN_${index}`, puuid: `player-${index}`, augment_id: "AUG_DUP", slot_index: 0 },
      { match_id: `PATTERN_${index}`, puuid: `player-${index}`, augment_id: "AUG_DUP", slot_index: 1 },
    ];
    if (index < 5) {
      rows.push({
        match_id: `PATTERN_${index}`,
        puuid: `player-${index}`,
        augment_id: "AUG_B",
        slot_index: 2,
      });
    }
    return rows;
  });

  await db`insert into participant_augments ${db(
    augmentRows,
    "match_id",
    "puuid",
    "augment_id",
    "slot_index",
  )}`;
}

/** Run one worker command against this database; no Riot client is involved. */
async function crawl(args: string[]): Promise<string> {
  const child = spawn(process.execPath, [TSX, CLI, ...args], {
    env: {
      ...process.env,
      DATABASE_URL: harness!.databaseUrl,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const timeout = setTimeout(() => child.kill(), 120_000);
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  }).finally(() => clearTimeout(timeout));

  if (code !== 0) throw new Error(`crawl ${args.join(" ")} exited ${code}\n${stdout}\n${stderr}`);
  return stdout;
}

type PatternRow = {
  kind: string;
  key: string;
  rank: number;
  sample: number;
  place_sum: number;
  top4_count: number;
  win_count: number;
  extra: Record<string, number>;
};

async function patternsOf(kind: string): Promise<PatternRow[]> {
  return sql!<PatternRow[]>`
    select kind, key, rank, sample, place_sum, top4_count, win_count, extra
    from board_patterns
    where set_number = 18 and kind = ${kind}
    order by rank
  `;
}

const byKey = (rows: PatternRow[], key: string) => rows.find((row) => row.key === key);

test.describe("SQL miners on a seeded corpus", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    harness = await startHarness({
      container: "teefftee-e2e-patterns-db",
      pgPort: PG_PORT,
      appPort: 3197,
      players: [],
      app: false,
      seed: async (db) => {
        await seedCorpus(db);
        // One comp so the augment half can classify anything at all. `A` is a
        // subset of every classified board, so the assignment is unambiguous.
        await seedComps(db, [
          {
            slug: "pattern-probe",
            name: "Pattern Probe",
            tier: "S",
            setNumber: 18,
            coreUnits: ["A"],
          },
        ]);
      },
    });
    if (!harness.ready) return;
    sql = harness.sql;
  });

  test.afterAll(async () => {
    await harness?.stop();
  });

  test("board_studies counts the sample and carries the thresholds", async () => {
    test.skip(!harness?.ready, "Docker is not available");

    await crawl(["patterns", "--set", "18"]);

    const [study] = await sql!<
      {
        boards: number;
        matches: number;
        units_seen: number;
        items_seen: number;
        item_slots: number;
        min_sample: number;
        min_pair_sample: number;
      }[]
    >`
      select boards, matches, units_seen, items_seen, item_slots, min_sample, min_pair_sample
      from board_studies where set_number = 18
    `;

    expect(study).toMatchObject({ boards: 82, matches: 82, units_seen: 5, items_seen: 4 });
    // 32 A + 29 B + 27 C + 26 D + 24 E unit rows.
    expect(study?.item_slots).toBe(138);
    // The thresholds travel with the snapshot so the page cannot quote another.
    expect(study).toMatchObject({ min_sample: 25, min_pair_sample: 15 });
  });

  test("unit and item rows stop exactly at the 25-board threshold", async () => {
    test.skip(!harness?.ready, "Docker is not available");

    const units = await patternsOf("unit");
    expect(units.map((row) => [row.key, row.sample])).toEqual([
      ["A", 32],
      ["B", 29],
      ["C", 27],
      ["D", 26],
    ]);
    // E has 24 boards: below MIN_SAMPLE, so it is not a unit row at all.
    expect(byKey(units, "E")).toBeUndefined();

    const items = await patternsOf("item");
    expect(items.map((row) => [row.key, row.sample])).toEqual([
      ["X", 53],
      ["Z", 29],
      ["Y", 26],
    ]);
    // W is on 9 item slots: below MIN_SAMPLE.
    expect(byKey(items, "W")).toBeUndefined();
  });

  test("item-unit pairs stop at the independent 15-slot threshold", async () => {
    test.skip(!harness?.ready, "Docker is not available");

    const pairs = await patternsOf("item-unit");
    const observed = pairs.map((row) => ({
      key: row.key,
      sample: row.sample,
      rank: row.rank,
    }));

    expect(observed).toEqual([
      { key: `A${SEP}X`, sample: 20, rank: 1 },
      { key: `B${SEP}X`, sample: 18, rank: 2 },
      // Exactly on MIN_PAIR_SAMPLE, and below the unit-item's item threshold —
      // the two thresholds are independent.
      { key: `C${SEP}X`, sample: 15, rank: 3 },
      { key: `C${SEP}Z`, sample: 15, rank: 4 },
    ]);

    // 14 slots is below the pair threshold even though both rows are mined units.
    expect(byKey(pairs, `A${SEP}Z`)).toBeUndefined();
    expect(byKey(pairs, `B${SEP}Y`)).toBeUndefined();
    // E is not a mined unit, so its item pairs cannot appear at all.
    expect(pairs.some((row) => row.key.startsWith(`E${SEP}`))).toBe(false);
  });

  test("duo overlaps use the union of the two units' boards", async () => {
    test.skip(!harness?.ready, "Docker is not available");

    const duos = await patternsOf("duo");
    const observed = duos.map((row) => ({
      key: row.key,
      sample: row.sample,
      either: row.extra.either,
    }));

    // Ranked by overlap: 29/32, 27/32, 25/31. BC is exactly on the threshold.
    expect(observed).toEqual([
      { key: `A${SEP}B`, sample: 29, either: 32 },
      { key: `A${SEP}C`, sample: 27, either: 32 },
      { key: `B${SEP}C`, sample: 25, either: 31 },
    ]);

    // D shares no board with anything, so there is no pair to report for it.
    expect(duos.some((row) => row.key.includes(`D${SEP}`) || row.key.startsWith(`D${SEP}`))).toBe(
      false,
    );
  });

  test("the trio's union is inclusion–exclusion, not the sum of pairs", async () => {
    test.skip(!harness?.ready, "Docker is not available");

    const trios = await patternsOf("core");
    expect(trios).toHaveLength(1);

    const [trio] = trios;
    expect(trio).toMatchObject({ key: `A${SEP}B${SEP}C`, sample: 25, rank: 1 });
    // 32 + 29 + 27 − 29 − 27 − 25 + 25 = 32; the sum of the three solo counts
    // would be 88, and summing the pairs would not land here either.
    expect(trio?.extra.anyBoards).toBe(32);
  });

  test("aggregate counts a duplicated augment once per board", async () => {
    test.skip(!harness?.ready, "Docker is not available");

    await crawl(["aggregate", "--set", "18"]);

    const [comp] = await sql!<{ games: number; boards: number; rank_bucket: string }[]>`
      select games, boards, rank_bucket from comp_stats
    `;
    // Every A board classifies against the probe comp; the other 50 do not.
    expect(comp).toMatchObject({ games: 32, boards: 82, rank_bucket: "all" });

    const augments = await sql!<{ augment_id: string; games: number }[]>`
      select augment_id, games from comp_augment_stats order by augment_id
    `;

    // AUG_DUP is listed in two slots on every A board: 32 games, not 64.
    expect(augments).toEqual([
      { augment_id: "AUG_B", games: 5 },
      { augment_id: "AUG_DUP", games: 32 },
    ]);
  });
});
