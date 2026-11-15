import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matches, participants, participantUnits, players } from "@/db/schema";
import { loadUnitCatalogue } from "./units";

/**
 * What the crawler knows about one tracked player.
 *
 * Read-only, and deliberately separate from `data.ts`: that seam resolves
 * editorial content against measured aggregates, while a player page is raw
 * crawl output — ladder entry plus that PUUID's own placements. There is no
 * content fallback here because there is nothing to fall back *to*: a player who
 * was never crawled is not a player with placeholder numbers, and inventing one
 * would be the same mistake as inventing a champion.
 *
 * Three outcomes, all of them honest and each rendered differently:
 *  - `unavailable`: no DATABASE_URL, or Postgres did not answer. The page still
 *    renders, saying what is missing.
 *  - `missing`: a database answered and has never seen this PUUID.
 *  - `ok`: the ladder row, the aggregate over its crawled matches, and the
 *    matches themselves.
 */

export type PlayerMatchUnit = {
  id: string;
  /** Catalogue name, or null when the loaded set's catalogue does not know the id. */
  name: string | null;
  imageUrl: string | null;
  star: number;
};

export type PlayerMatch = {
  matchId: string;
  region: string;
  patch: string;
  setNumber: number;
  playedAt: string | null;
  placement: number;
  level: number | null;
  lastRound: number | null;
  goldLeft: number | null;
  units: PlayerMatchUnit[];
};

export type PlayerProfile = {
  puuid: string;
  region: string;
  tier: string;
  lp: number;
  lastSeenAt: string | null;
};

export type PlayerSummary = {
  games: number;
  avgPlace: number;
  top4: number;
  wins: number;
  top4Rate: number;
  winRate: number;
  bestPlace: number;
};

export type PlayerPage =
  | { kind: "unavailable" }
  | { kind: "missing" }
  | { kind: "ok"; player: PlayerProfile; summary: PlayerSummary; matches: PlayerMatch[] };

/** A ladder row without the per-player queries — what the index needs. */
export type TrackedPlayer = PlayerProfile;

export type PlayerList =
  | { kind: "unavailable" }
  | { kind: "ok"; players: TrackedPlayer[]; total: number; region: string | null };

export type LeaderboardQuery = {
  /** undefined = every region the crawler tracks. */
  region?: string;
  limit?: number;
  offset?: number;
};

let warnedAboutDatabase = false;

/**
 * The tracked ladder, highest LP first.
 *
 * `total` is the whole pool, not the page: a seeded ladder is capped by
 * `CRAWL_SEED_MAX_PLAYERS`, and the index should say how many players the
 * crawler is actually tracking rather than how many fit on one screen.
 *
 * LP is not a score we computed — it is what the last seed read off the ladder.
 * Nothing here pretends to be a live ranking.
 */
export async function listTrackedPlayers({
  region,
  limit = 100,
  offset = 0,
}: LeaderboardQuery = {}): Promise<PlayerList> {
  if (!process.env.DATABASE_URL) return { kind: "unavailable" };

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return { kind: "unavailable" };
  }

  try {
    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(players)
      .where(region ? eq(players.region, region) : undefined);

    const rows = await db
      .select({
        puuid: players.puuid,
        region: players.region,
        tier: players.tier,
        lp: players.lp,
        lastSeenAt: players.lastSeenAt,
      })
      .from(players)
      .where(region ? eq(players.region, region) : undefined)
      // LP alone leaves ties in whatever order the planner produced, which makes
      // the same page reshuffle between requests; the PUUID makes it stable — and
      // it is what makes an offset a stable page boundary.
      .orderBy(desc(players.lp), asc(players.puuid))
      .limit(limit)
      .offset(offset);

    return {
      kind: "ok",
      total: totalRow?.total ?? 0,
      region: region ?? null,
      players: rows.map((row) => ({ ...row, lastSeenAt: toIso(row.lastSeenAt) })),
    };
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[players] Postgres unavailable, the player index cannot render: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { kind: "unavailable" };
  }
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Recent matches for one player, newest first, with the board they finished on.
 *
 * Units are joined in one query for all the matches rather than per match: a
 * profile renders 20+ boards, and one query per board is how a page becomes
 * slow the moment the crawl has data.
 */
export async function getPlayerPage(puuid: string, limit = 20): Promise<PlayerPage> {
  if (!process.env.DATABASE_URL) return { kind: "unavailable" };

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return { kind: "unavailable" };
  }

  try {
    const [player] = await db
      .select({
        puuid: players.puuid,
        region: players.region,
        tier: players.tier,
        lp: players.lp,
        lastSeenAt: players.lastSeenAt,
      })
      .from(players)
      .where(eq(players.puuid, puuid))
      .limit(1);

    if (!player) return { kind: "missing" };

    const [summaryRow] = await db
      .select({
        games: sql<number>`count(*)::int`,
        placeSum: sql<number>`coalesce(sum(${participants.placement}), 0)::int`,
        top4: sql<number>`(count(*) filter (where ${participants.placement} <= 4))::int`,
        wins: sql<number>`(count(*) filter (where ${participants.placement} = 1))::int`,
        best: sql<number>`coalesce(min(${participants.placement}), 0)::int`,
      })
      .from(participants)
      .where(eq(participants.puuid, puuid));

    const games = summaryRow?.games ?? 0;
    const summary: PlayerSummary = {
      games,
      avgPlace: games > 0 ? (summaryRow?.placeSum ?? 0) / games : 0,
      top4: summaryRow?.top4 ?? 0,
      wins: summaryRow?.wins ?? 0,
      top4Rate: games > 0 ? (summaryRow?.top4 ?? 0) / games : 0,
      winRate: games > 0 ? (summaryRow?.wins ?? 0) / games : 0,
      bestPlace: summaryRow?.best ?? 0,
    };

    const matchRows = await db
      .select({
        matchId: matches.matchId,
        region: matches.region,
        patch: matches.patch,
        setNumber: matches.setNumber,
        playedAt: matches.gameDatetime,
        placement: participants.placement,
        level: participants.level,
        lastRound: participants.lastRound,
        goldLeft: participants.goldLeft,
      })
      .from(participants)
      .innerJoin(matches, eq(participants.matchId, matches.matchId))
      .where(eq(participants.puuid, puuid))
      .orderBy(desc(matches.gameDatetime))
      .limit(limit);

    const sets = [...new Set(matchRows.map((row) => row.setNumber))];
    const catalogues = new Map(
      await Promise.all(
        sets.map(async (setNumber) => [setNumber, await loadUnitCatalogue(setNumber)] as const),
      ),
    );

    const unitRows =
      matchRows.length === 0
        ? []
        : await db
            .select({
              matchId: participantUnits.matchId,
              unitId: participantUnits.unitId,
              star: participantUnits.starLevel,
              slot: participantUnits.slot,
            })
            .from(participantUnits)
            .where(
              and(
                eq(participantUnits.puuid, puuid),
                inArray(
                  participantUnits.matchId,
                  matchRows.map((row) => row.matchId),
                ),
              ),
            )
            .orderBy(asc(participantUnits.slot));

    const unitsByMatch = new Map<string, PlayerMatchUnit[]>();
    const setByMatch = new Map(matchRows.map((row) => [row.matchId, row.setNumber]));
    for (const row of unitRows) {
      const unit = catalogues.get(setByMatch.get(row.matchId) ?? -1)?.get(row.unitId) ?? null;
      const list = unitsByMatch.get(row.matchId) ?? [];
      list.push({
        id: row.unitId,
        name: unit?.name ?? null,
        imageUrl: unit?.imageUrl ?? null,
        star: row.star,
      });
      unitsByMatch.set(row.matchId, list);
    }

    const matchesOut: PlayerMatch[] = matchRows.map((row) => ({
      matchId: row.matchId,
      region: row.region,
      patch: row.patch,
      setNumber: row.setNumber,
      playedAt: toIso(row.playedAt),
      placement: row.placement,
      level: row.level,
      lastRound: row.lastRound,
      goldLeft: row.goldLeft,
      units: unitsByMatch.get(row.matchId) ?? [],
    }));

    return {
      kind: "ok",
      player: { ...player, lastSeenAt: toIso(player.lastSeenAt) },
      summary,
      matches: matchesOut,
    };
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[players] Postgres unavailable, player pages cannot render crawl data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { kind: "unavailable" };
  }
}
