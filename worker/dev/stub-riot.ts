import { createServer } from "node:http";

import { comps } from "../../src/content/comps";
import type { TftMatchDto, TftTraitDto, TftUnitDto } from "../riot-types";

/**
 * Local Riot API stub — a rehearsal target, not a test fixture.
 *
 * Dev keys expire every 24 hours, so without this the crawler can only be
 * exercised on days you remember to regenerate a key. Point the worker here:
 *
 *   npm run crawl:stub          # terminal 1
 *   RIOT_API_BASE_URL=http://127.0.0.1:4010 RIOT_API_KEY=stub DATABASE_URL=... \
 *     npm run crawl -- once
 *
 * Two deliberate properties:
 *  - Every player returns the SAME twelve match ids, so the run proves the queue
 *    dedupes (60 players × 12 ids must still fetch only 12 matches).
 *  - Payloads are derived from the match id, so re-fetching a match yields
 *    identical data and the idempotent insert can be verified.
 *
 * Set STUB_429_EVERY=7 to make every 7th request a 429 with Retry-After: 1,
 * which exercises the limiter's global pause. Set STUB_PLAYERS_PER_TIER to grow
 * the ladders past the default twenty per tier.
 */

const PORT = Number(process.env.STUB_PORT ?? 4010);
/** Bind 0.0.0.0 to let a container reach the stub via host.docker.internal. */
const HOST = process.env.STUB_HOST ?? "127.0.0.1";
const FAIL_EVERY = Number(process.env.STUB_429_EVERY ?? 0);
/** Run the stub as a different set to rehearse a set rollover. */
const SET_NUMBER = Number(process.env.STUB_SET_NUMBER ?? 18);
const GAME_VERSION = process.env.STUB_GAME_VERSION ?? "18.5.712.1234";

const TIERS = ["challenger", "grandmaster", "master"] as const;
/**
 * Stub ladder size per tier. The default is small enough to read; raise it
 * (`STUB_PLAYERS_PER_TIER=500`) to rehearse a real-size ladder — 500 per tier in
 * one region is the thousand-row leaderboard page, which is the case worth
 * checking before pointing the crawler at Riot.
 */
const PLAYERS_PER_TIER = Math.max(1, Number(process.env.STUB_PLAYERS_PER_TIER ?? 20));
const SHARED_MATCH_COUNT = 12;

const UNITS = [
  "TFT18_STUB_01",
  "TFT18_STUB_02",
  "TFT18_STUB_03",
  "TFT18_STUB_04",
  "TFT18_STUB_05",
  "TFT18_STUB_06",
  "TFT18_STUB_07",
  "TFT18_STUB_08",
  "TFT18_STUB_09",
  "TFT18_STUB_10",
];

const ITEMS = [
  "TFT_Item_InfinityEdge",
  "TFT_Item_GiantSlayer",
  "TFT_Item_Bloodthirster",
  "TFT_Item_WarmogsArmor",
  "TFT_Item_BrambleVest",
  "TFT_Item_DragonsClaw",
  "TFT_Item_BlueBuff",
  "TFT_Item_JeweledGauntlet",
];

const TRAITS = [
  "TFT18_STUB_Trait_A",
  "TFT18_STUB_Trait_B",
  "TFT18_STUB_Trait_C",
  "TFT18_STUB_Trait_D",
];

const AUGMENTS = ["TFT18_STUB_Augment_A", "TFT18_STUB_Augment_B", "TFT18_STUB_Augment_C"];

/**
 * Emit real curated boards instead of the stub ids.
 *
 * Off by default: the stub ids are what prove the queue dedupes and what make an
 * unresolved-catalogue case reproducible. Switched on, every participant gets a
 * board from src/content/comps.ts — units, stars and the comp's defining trait —
 * so `aggregate` actually classifies something and a rehearsal run produces
 * `comp_stats` rows the site can render. Pair it with STUB_GAME_VERSION so the
 * match lands on the patch the site is currently showing.
 */
const COMP_BOARDS = process.env.STUB_COMP_BOARDS === "1";
const CURATED_BOARDS = comps.filter((comp) => comp.published);

let requestCount = 0;

function pick<T>(items: readonly T[], seed: number): T {
  const item = items[Math.abs(seed) % items.length];
  if (item === undefined) throw new Error("pick() called with an empty pool");
  return item;
}

/** FNV-1a: stable across runs, so the same match id always yields the same board. */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/** Regional host -> platform host, mirroring how Riot routes the same region. */
const REGIONAL_PLATFORM: Record<string, string> = { europe: "euw1", asia: "kr" };

/**
 * The same twelve ids for every player in a region (so dedupe is provable), but
 * region-specific — real match ids are globally unique, so EUW and KR must not
 * collide on `match_id`.
 */
function sharedMatchIds(platform: string): string[] {
  // The set number is part of the id so a rollover produces new matches instead
  // of being deduped against the previous set's queue.
  return Array.from(
    { length: SHARED_MATCH_COUNT },
    (_, index) => `STUB_${platform}_${SET_NUMBER}_${index + 1}`,
  );
}

function ladderEntries(host: string, tier: string) {
  // The host is part of the puuid on purpose: a real PUUID belongs to one
  // region, so the two regional ladders must not share players.
  return Array.from({ length: PLAYERS_PER_TIER }, (_, index) => ({
    puuid: `stub-${host}-${tier}-${index + 1}`,
    leaguePoints: 1_200 - index * 25,
    rank: "I",
    wins: 100 + index,
    losses: 80 + index,
  }));
}

function buildMatch(matchId: string): TftMatchDto {
  const seed = hash(matchId);
  // Ids carry their platform, so participants can be real members of the seeded
  // ladder. That is what makes the `master+` rank bucket exercisable.
  const platform = matchId.split("_")[1] ?? "euw1";

  const participants = Array.from({ length: 8 }, (_, playerIndex) => {
    const playerSeed = seed + playerIndex * 7919;
    const unitCount = 5 + (playerSeed % 4);
    const comp = COMP_BOARDS ? pick(CURATED_BOARDS, playerSeed) : null;

    const units: TftUnitDto[] = comp
      ? comp.board.map((slot) => ({
          character_id: slot.id,
          tier: slot.star,
          rarity: 5,
          itemNames: [],
        }))
      : Array.from({ length: unitCount }, (_, unitIndex) => {
          const unitSeed = playerSeed + unitIndex * 131;
          const itemCount = unitSeed % 4;
          return {
            character_id: pick(UNITS, unitSeed),
            tier: 1 + (unitSeed % 3),
            rarity: 1 + (unitSeed % 5),
            itemNames: Array.from({ length: itemCount }, (_, itemIndex) =>
              pick(ITEMS, unitSeed + itemIndex * 17),
            ),
          };
        });

    // Only the comp's gate trait is needed for assignment to classify the board.
    const traits: TftTraitDto[] = comp
      ? comp.definingTrait
        ? [{ name: comp.definingTrait, num_units: comp.coreUnits.length, tier_current: 1 }]
        : []
      : TRAITS.map((trait, traitIndex) => ({
          name: trait,
          num_units: 2 + ((playerSeed + traitIndex) % 3),
          tier_current: 1 + ((playerSeed + traitIndex) % 3),
        }));

    return {
      puuid: `stub-${platform}-challenger-${((seed + playerIndex * 3) % PLAYERS_PER_TIER) + 1}`,
      placement: playerIndex + 1,
      level: 8 + (playerSeed % 2),
      last_round: 30 + (playerSeed % 8),
      gold_left: playerSeed % 40,
      augments: AUGMENTS.map((augment) => augment),
      traits,
      units,
    };
  });

  return {
    metadata: {
      match_id: matchId,
      data_version: "3",
      participants: participants.map((participant) => participant.puuid),
    },
    info: {
      // Fixed base timestamp keeps the payload deterministic.
      game_datetime: 1_793_000_000_000 + (seed % 86_400_000),
      game_length: 2_100 + (seed % 600),
      game_version: GAME_VERSION,
      queue_id: 1100,
      tft_set_number: SET_NUMBER,
      tft_game_type: "standard",
      participants,
    },
  };
}

function json(status: number, body: unknown): { status: number; body: string } {
  return { status, body: JSON.stringify(body) };
}

const server = createServer((request, response) => {
  requestCount += 1;
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  const send = (payload: { status: number; body: string }) => {
    response.writeHead(payload.status, { "content-type": "application/json" });
    response.end(payload.body);
  };

  if (path === "/__stats") {
    send(json(200, { requests: requestCount }));
    return;
  }

  // The worker prefixes requests with the routing host (euw1, kr, europe, asia)
  // to mirror production. Strip it so routes below stay simple.
  const segments = path.split("/").filter(Boolean);
  const host = segments[0] ?? "";
  const routePath = "/" + segments.slice(1).join("/");

  if (FAIL_EVERY > 0 && requestCount % FAIL_EVERY === 0) {
    response.writeHead(429, { "content-type": "application/json", "retry-after": "1" });
    response.end(JSON.stringify({ status: { status_code: 429, message: "Rate limit exceeded" } }));
    return;
  }

  const tierMatch = /^\/tft\/league\/v1\/([a-z]+)$/.exec(routePath);
  if (tierMatch) {
    const tier = tierMatch[1] ?? "";
    if (!TIERS.includes(tier as (typeof TIERS)[number])) {
      send(json(400, { status: { status_code: 400, message: "bad tier" } }));
      return;
    }
    send(
      json(200, {
        tier: tier.toUpperCase(),
        queue: "RANKED_TFT",
        entries: ladderEntries(host, tier),
      }),
    );
    return;
  }

  if (/^\/tft\/match\/v1\/matches\/by-puuid\/[^/]+\/ids$/.test(routePath)) {
    send(json(200, sharedMatchIds(REGIONAL_PLATFORM[host] ?? host)));
    return;
  }

  const matchMatch = /^\/tft\/match\/v1\/matches\/([^/]+)$/.exec(routePath);
  if (matchMatch) {
    const matchId = decodeURIComponent(matchMatch[1] ?? "");
    send(json(200, buildMatch(matchId)));
    return;
  }

  send(json(404, { status: { status_code: 404, message: `no stub route for ${routePath}` } }));
});

server.listen(PORT, HOST, () => {
  console.log(`stub Riot API on http://${HOST}:${PORT} (set ${SET_NUMBER}, ${GAME_VERSION})`);
  console.log(
    `try: RIOT_API_BASE_URL=http://127.0.0.1:${PORT} RIOT_API_KEY=stub DATABASE_URL=... npm run crawl -- once`,
  );
  if (FAIL_EVERY > 0) {
    console.log(`chaos: every ${FAIL_EVERY}. request answers 429 (retry-after: 1)`);
  }
  if (COMP_BOARDS) {
    console.log(`boards: ${CURATED_BOARDS.length} curated comps (real unit ids)`);
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
