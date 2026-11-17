import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { expect, test } from "@playwright/test";

import { startHarness, type Harness, type Sql } from "./database";

/**
 * The crawl pipeline, end to end, against the stub Riot API and a throwaway
 * Postgres.
 *
 * The page specs can only see what reached the database; this one runs the
 * worker's own commands — `seed`, `discover`, `fetch`, `sync-comps`,
 * `aggregate` — so a break in the crawl is named by the stage that broke
 * instead of surfacing as a page that quietly renders dashes.
 *
 * Two properties of the stub carry most of the test, and both are its documented
 * design: every player returns the same twelve match ids (so discovery's dedupe
 * is provable), and payloads are derived from the match id (so a re-fetch is
 * byte-identical and the idempotent insert can be checked). `STUB_429_EVERY`
 * gives a second stub instance that answers every other request with 429.
 *
 * The suite's own webServer still builds and starts the site; this file ignores
 * it (`app: false`) and talks to its concurrency-free database directly.
 */

const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");
const CLI = path.join("worker", "cli.ts");
const STUB = path.join("worker", "dev", "stub-riot.ts");

const PG_PORT = 55442;
const STUB_PORT = 4021;
const LIMITED_STUB_PORT = 4022;

const SET_NUMBER = 18;
const GAME_VERSION = "18.6.712.1234";
/**
 * The stub's default ladder. It cannot be smaller than this: participants are
 * derived from the player index modulo the ladder size, so a short ladder makes
 * PUUIDs repeat inside one match and `(match_id, puuid)` collapses the boards.
 */
const PLAYERS_PER_TIER = 20;
const SHARED_MATCHES = 12;
const PARTICIPANTS_PER_MATCH = 8;

type Stub = { origin: string; stop: () => void };

async function startStub(port: number, env: Record<string, string> = {}): Promise<Stub> {
  const child = spawn(process.execPath, [TSX, STUB], {
    env: {
      ...process.env,
      STUB_PORT: String(port),
      STUB_PLAYERS_PER_TIER: String(PLAYERS_PER_TIER),
      STUB_SET_NUMBER: String(SET_NUMBER),
      STUB_GAME_VERSION: GAME_VERSION,
      // Real curated boards, so `aggregate` has something to classify. The stub
      // ids would leave every board unclassified by construction.
      STUB_COMP_BOARDS: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      ...env,
    },
    stdio: "ignore",
  });

  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${origin}/__stats`);
      if (response.ok) return { origin, stop: () => child.kill() };
    } catch {
      // Not listening yet.
    }
    await sleep(200);
  }

  child.kill();
  throw new Error(`stub Riot API never answered on port ${port}`);
}

function killAfter(child: ChildProcess, ms: number): NodeJS.Timeout {
  return setTimeout(() => child.kill(), ms);
}

let harness: Harness | undefined;
let stub: Stub | undefined;
let limited: Stub | undefined;

/** Skips on a machine without Docker, then hands back the pieces a test needs. */
function ready(): { db: Sql; stub: string; limited: string } {
  test.skip(!harness?.ready, "Docker is not available");
  return { db: harness!.sql!, stub: stub!.origin, limited: limited!.origin };
}

/** Run one worker command, on the seeded database and the given stub. */
async function crawl(args: string[], baseUrl: string): Promise<string> {
  const child = spawn(process.execPath, [TSX, CLI, ...args], {
    env: {
      ...process.env,
      DATABASE_URL: harness!.databaseUrl,
      RIOT_API_KEY: "stub",
      RIOT_API_BASE_URL: baseUrl,
      // Blank the key type explicitly: a development key's published limits are
      // the ones a real run uses, so the limiter is exercised at its real shape.
      RIOT_KEY_TYPE: "development",
      RIOT_REGIONS: "EUW",
      CRAWL_SEED_TIERS: "challenger",
      CRAWL_CONCURRENCY: "2",
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

  const timeout = killAfter(child, 120_000);
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  }).finally(() => clearTimeout(timeout));

  if (code !== 0) {
    throw new Error(`crawl ${args.join(" ")} exited ${code}\n${stdout}\n${stderr}`);
  }
  return stdout;
}

/**
 * The JSON tail of one of the worker's log lines, which is how a command reports
 * what it did (inserted vs duplicated, for instance).
 */
function logged(stdout: string, message: string): Record<string, unknown> {
  const line = stdout.split(/\r?\n/).find((entry) => entry.includes(`] ${message}`));
  expect(line, `"${message}" was never logged:\n${stdout}`).toBeTruthy();
  const brace = line!.indexOf("{");
  return brace === -1 ? {} : (JSON.parse(line!.slice(brace)) as Record<string, unknown>);
}

async function stubRequests(origin: string): Promise<number> {
  const response = await fetch(`${origin}/__stats`);
  const body = (await response.json()) as { requests: number };
  return body.requests;
}

test.describe("crawl pipeline against the stub Riot API", () => {
  // One test builds on the previous one's database state, so a failure has to
  // stop the file rather than cascade into misleading ones.
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    harness = await startHarness({
      container: "teefftee-e2e-crawl-db",
      pgPort: PG_PORT,
      appPort: 3196,
      // The worker seeds the ladder itself; the harness only owns the database.
      players: [],
      app: false,
    });
    if (!harness.ready) return;

    stub = await startStub(STUB_PORT);
    limited = await startStub(LIMITED_STUB_PORT, { STUB_429_EVERY: "2" });
  });

  test.afterAll(async () => {
    stub?.stop();
    limited?.stop();
    await harness?.stop();
  });

  test("seed loads the ranked ladder into the player pool", async () => {
    const { db, stub: baseUrl } = ready();

    const stdout = await crawl(["seed"], baseUrl);
    expect(logged(stdout, "seed complete")).toMatchObject({
      ladders: 1,
      players: PLAYERS_PER_TIER,
    });

    const players = await db<{ puuid: string; region: string; tier: string; lp: number }[]>`
      select puuid, region, tier, lp from players order by lp desc
    `;
    expect(players).toHaveLength(PLAYERS_PER_TIER);
    expect(players.every((player) => player.region === "EUW")).toBe(true);
    expect(players.every((player) => player.tier === "CHALLENGER")).toBe(true);
    // The stub's ladder, unchanged: 1200 LP down in steps of 25.
    expect(players.map((player) => player.lp)).toEqual(
      Array.from({ length: PLAYERS_PER_TIER }, (_, index) => 1200 - index * 25),
    );
  });

  test("discover queues each shared match id once", async () => {
    const { db, stub: baseUrl } = ready();

    const stdout = await crawl(["discover", "--players", "50"], baseUrl);
    // Every player returns the same twelve ids: 240 seen, twelve queued.
    expect(logged(stdout, "discovery complete")).toMatchObject({
      players: PLAYERS_PER_TIER,
      idsSeen: PLAYERS_PER_TIER * SHARED_MATCHES,
      idsEnqueued: SHARED_MATCHES,
      failures: 0,
    });

    const queued = await db<{ match_id: string; region: string; status: string }[]>`
      select match_id, region, status from match_queue
    `;
    expect(queued).toHaveLength(SHARED_MATCHES);
    expect(queued.every((row) => row.region === "EUW" && row.status === "pending")).toBe(true);

    const expected = Array.from(
      { length: SHARED_MATCHES },
      (_, index) => `STUB_euw1_${SET_NUMBER}_${index + 1}`,
    );
    expect(queued.map((row) => row.match_id).sort()).toEqual(expected.sort());
  });

  test("fetch normalises matches, participants, units, traits and augments", async () => {
    const { db, stub: baseUrl } = ready();

    const stdout = await crawl(["fetch", "--limit", "50"], baseUrl);
    expect(logged(stdout, "fetch complete")).toMatchObject({
      processed: SHARED_MATCHES,
      inserted: SHARED_MATCHES,
      duplicates: 0,
      failed: 0,
      notFound: 0,
    });

    const [counts] = await db<
      {
        matches: number;
        participants: number;
        units: number;
        traits: number;
        augments: number;
        raw: number;
        done: number;
      }[]
    >`
      select
        (select count(*)::int from matches) as matches,
        (select count(*)::int from participants) as participants,
        (select count(*)::int from participant_units) as units,
        (select count(*)::int from participant_traits) as traits,
        (select count(*)::int from participant_augments) as augments,
        (select count(*)::int from matches where raw is not null) as raw,
        (select count(*)::int from match_queue where status = 'done') as done
    `;
    expect(counts).toMatchObject({
      matches: SHARED_MATCHES,
      participants: SHARED_MATCHES * PARTICIPANTS_PER_MATCH,
      raw: SHARED_MATCHES,
      done: SHARED_MATCHES,
    });
    expect(counts!.units).toBeGreaterThan(0);
    expect(counts!.traits).toBeGreaterThan(0);
    expect(counts!.augments).toBeGreaterThan(0);

    // The patch comes from game_version, not from the current date.
    const [shape] = await db<{ patches: string[]; sets: number[] }[]>`
      select array_agg(distinct patch) as patches, array_agg(distinct set_number) as sets
      from matches
    `;
    expect(shape!.patches).toEqual(["18.6"]);
    expect(shape!.sets).toEqual([SET_NUMBER]);

    // Normalisation, checked against the stored raw payload rather than against
    // a second copy of the normaliser: every unit the payload listed is a row,
    // with character_id mapped to unit_id and tier to star_level.
    const matchId = `STUB_euw1_${SET_NUMBER}_1`;
    const [mapping] = await db<{ stored: string[]; payload: string[] }[]>`
      select
        (select array_agg(unit_id || ':' || star_level order by unit_id, star_level)
           from participant_units
          where match_id = ${matchId}) as stored,
        (select array_agg((unit->>'character_id') || ':' || (unit->>'tier')
                          order by unit->>'character_id', unit->>'tier')
           from matches m
           cross join jsonb_array_elements(m.raw->'info'->'participants') as participant
           cross join jsonb_array_elements(participant->'units') as unit
          where m.match_id = ${matchId}) as payload
    `;
    expect(mapping!.stored).toEqual(mapping!.payload);
  });

  test("a second fetch of the same match inserts nothing", async () => {
    const { db, stub: baseUrl } = ready();

    const rows = async () => {
      const [row] = await db<
        {
          matches: number;
          participants: number;
          units: number;
          traits: number;
          augments: number;
        }[]
      >`
        select
          (select count(*)::int from matches) as matches,
          (select count(*)::int from participants) as participants,
          (select count(*)::int from participant_units) as units,
          (select count(*)::int from participant_traits) as traits,
          (select count(*)::int from participant_augments) as augments
      `;
      return row;
    };

    const before = await rows();

    // Re-delivery, as a reclaimed stale claim looks to the fetcher: the same
    // queue row, back in the pending state.
    const matchId = `STUB_euw1_${SET_NUMBER}_1`;
    await db`
      update match_queue
      set status = 'pending', attempts = 0, claimed_at = null
      where match_id = ${matchId}
    `;

    const stdout = await crawl(["fetch", "--limit", "5"], baseUrl);
    expect(logged(stdout, "fetch complete")).toMatchObject({
      processed: 1,
      inserted: 0,
      duplicates: 1,
      failed: 0,
    });

    // Identical counts: no second match row, and no duplicated child rows.
    expect(await rows()).toEqual(before);

    const [queue] = await db<{ status: string; fetched_at: Date | null }[]>`
      select status, fetched_at from match_queue where match_id = ${matchId}
    `;
    expect(queue!.status).toBe("done");
    expect(queue!.fetched_at).not.toBeNull();
  });

  test("a 429 is absorbed and the match still lands", async () => {
    const { db, limited: baseUrl } = ready();

    // A match the stub has not been asked for yet, through its generic
    // `/tft/match/v1/matches/:id` route (payloads are derived from the id).
    const matchId = `STUB_euw1_${SET_NUMBER}_${SHARED_MATCHES + 1}`;
    await db`insert into match_queue (match_id, region) values (${matchId}, 'EUW')`;

    // The stub answers request N with 429 when N is even. Every `/__stats` call
    // increments N, so walk it to an odd value: the fetcher's first attempt is
    // then the rejected one, and its retry is the one that succeeds.
    let before = await stubRequests(baseUrl);
    while (before % 2 === 0) before = await stubRequests(baseUrl);

    const started = Date.now();
    const stdout = await crawl(["fetch", "--limit", "5"], baseUrl);
    const elapsedMs = Date.now() - started;
    const after = await stubRequests(baseUrl);

    // Every `/__stats` call counts as a request too, so the two fetch attempts
    // — the 429, then the retry that returned the payload — are the difference
    // minus the read that measured `after`.
    expect(after - before - 1).toBe(2);
    // Retry-After is one second, and the limiter pauses globally for it.
    expect(elapsedMs).toBeGreaterThanOrEqual(950);

    // A 429 is transient: the row succeeds, it is not counted as a failure.
    expect(logged(stdout, "fetch complete")).toMatchObject({
      processed: 1,
      inserted: 1,
      duplicates: 0,
      failed: 0,
    });

    const [match] = await db<{ patch: string; set_number: number }[]>`
      select patch, set_number from matches where match_id = ${matchId}
    `;
    expect(match).toMatchObject({ patch: "18.6", set_number: SET_NUMBER });

    const [participants] = await db<{ count: number }[]>`
      select count(*)::int as count from participants where match_id = ${matchId}
    `;
    expect(participants!.count).toBe(PARTICIPANTS_PER_MATCH);

    const [queue] = await db<{ status: string }[]>`
      select status from match_queue where match_id = ${matchId}
    `;
    expect(queue!.status).toBe("done");
  });

  test("aggregate classifies the crawled boards into comp_stats", async () => {
    const { db, stub: baseUrl } = ready();

    // Curated comps are editorial content; Postgres only learns about them on
    // sync, which is also what the run loop does before its first cycle.
    await crawl(["sync-comps"], baseUrl);
    const stdout = await crawl(["aggregate", "--set", String(SET_NUMBER)], baseUrl);
    expect(stdout).toContain("18.6 EUW");

    const rows = await db<
      {
        games: number;
        place_sum: number;
        top4_count: number;
        win_count: number;
        boards: number;
        rank_bucket: string;
        patch: string;
        region: string;
      }[]
    >`
      select games, place_sum, top4_count, win_count, boards, rank_bucket, patch, region
      from comp_stats
    `;

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.patch === "18.6" && row.region === "EUW")).toBe(true);
    // Both provenance buckets are written, because every seeded player is
    // Challenger: `master+` and `all` see the same boards.
    expect(new Set(rows.map((row) => row.rank_bucket))).toEqual(new Set(["master+", "all"]));

    for (const row of rows) {
      expect(row.games).toBeGreaterThan(0);
      expect(row.top4_count).toBeLessThanOrEqual(row.games);
      expect(row.win_count).toBeLessThanOrEqual(row.top4_count);
      // Counts, not rates: the place sum has to be eight placements' worth.
      expect(row.place_sum).toBeGreaterThanOrEqual(row.games);
      expect(row.place_sum).toBeLessThanOrEqual(row.games * 8);
      expect(row.boards).toBeGreaterThanOrEqual(row.games);
    }

    // The denominator is every board in the scope, including unclassified ones.
    const [boards] = await db<{ participants: number }[]>`
      select count(*)::int as participants from participants
    `;
    const [widest] = await db<{ boards: number }[]>`
      select boards from comp_stats order by boards desc limit 1
    `;
    expect(widest!.boards).toBe(boards!.participants);

    // Augments were crawled, so the per-comp augment sample is materialised too.
    const [augments] = await db<{ count: number }[]>`
      select count(*)::int as count from comp_augment_stats
    `;
    expect(augments!.count).toBeGreaterThan(0);
  });
});
