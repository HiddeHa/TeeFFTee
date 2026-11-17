import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  matches,
  participants,
  participantTraits,
  participantUnits,
  players,
} from "@/db/schema";
import { loadItemCatalogue } from "./items";
import { loadTraitCatalogue } from "./traits";
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

export type PlayerMatchItem = {
  id: string;
  /** Catalogue name, or null when the set catalogue does not know the id. */
  name: string | null;
  imageUrl: string | null;
};

export type PlayerMatchUnit = {
  id: string;
  /** Catalogue name, or null when the loaded set's catalogue does not know the id. */
  name: string | null;
  imageUrl: string | null;
  star: number;
  /**
   * That unit's items, in payload order. Empty is a real answer: the normaliser
   * wrote no item ids for this slot, which is not the same as a catalogue miss.
   */
  items: PlayerMatchItem[];
};

export type PlayerMatchTrait = {
  id: string;
  /** Catalogue name, or null when the set catalogue does not know the id. */
  name: string | null;
  imageUrl: string | null;
  /** Units on the board with this trait, as the payload counted them. */
  units: number;
  /** Activation tier: 1 is the first breakpoint, 2 the second. Only active traits are kept. */
  tier: number;
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
  /** Only traits that were active when the game ended — an inactive trait is not a result. */
  traits: PlayerMatchTrait[];
};

export type PlayerProfile = {
  puuid: string;
  /** Riot ID, resolved by `crawl -- names`. Null means the crawler has not asked yet. */
  gameName: string | null;
  tagLine: string | null;
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

/** A PUUID shortened for display. Only shown when no Riot ID is known. */
export function shortPuuid(puuid: string): string {
  return puuid.length > 16 ? `${puuid.slice(0, 10)}…${puuid.slice(-4)}` : puuid;
}

/**
 * What to call a tracked player: the Riot ID once it has been resolved, and a
 * shortened PUUID until then. Never a guessed handle — an unresolved player is
 * shown as unresolved.
 */
export function playerLabel(
  player: Pick<PlayerProfile, "puuid" | "gameName" | "tagLine">,
): string {
  if (player.gameName && player.tagLine) return `${player.gameName}#${player.tagLine}`;
  return player.gameName ?? shortPuuid(player.puuid);
}

export type LeaderboardQuery = {
  /** undefined = every region the crawler tracks. */
  region?: string;
  /** Riot ID or PUUID fragment. Case-insensitive, matched against both name parts. */
  query?: string;
  limit?: number;
  offset?: number;
};

/** ILIKE pattern with the wildcards escaped, so a typed `%` stays a literal. */
function searchPattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

/**
 * What a typed query matches.
 *
 * A Riot ID is `Name#TAG`, and that is exactly how the leaderboard prints a
 * player — so a pasted one has to work. Matching the whole string against either
 * half finds nothing (neither field contains the `#`), so the hash splits it and
 * both halves must match. A bare fragment still searches names, tags and the
 * PUUID, and a trailing `#` narrows by the name typed before it.
 */
function searchCondition(query: string) {
  const hash = query.indexOf("#");
  if (hash >= 0) {
    const name = query.slice(0, hash).trim();
    const tag = query.slice(hash + 1).trim();

    if (name && tag) {
      return and(
        ilike(players.gameName, searchPattern(name)),
        ilike(players.tagLine, searchPattern(tag)),
      );
    }
    if (name) return ilike(players.gameName, searchPattern(name));
  }

  const pattern = searchPattern(query);
  return or(
    ilike(players.gameName, pattern),
    ilike(players.tagLine, pattern),
    eq(players.puuid, query),
  );
}

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
  query,
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

  // A search matches a Riot ID, one of its halves, or the PUUID itself — a PUUID
  // is what people paste out of the client. `and()` drops undefined parts.
  const trimmed = query?.trim() ?? "";
  const search = trimmed ? searchCondition(trimmed) : undefined;
  const where = and(region ? eq(players.region, region) : undefined, search);

  try {
    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(players)
      .where(where);

    const rows = await db
      .select({
        puuid: players.puuid,
        gameName: players.gameName,
        tagLine: players.tagLine,
        region: players.region,
        tier: players.tier,
        lp: players.lp,
        lastSeenAt: players.lastSeenAt,
      })
      .from(players)
      .where(where)
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
        gameName: players.gameName,
        tagLine: players.tagLine,
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

    // One load per set, for all three catalogues, rather than a load per row.
    const sets = [...new Set(matchRows.map((row) => row.setNumber))];
    const loaded = await Promise.all(
      sets.map(
        async (setNumber) =>
          [
            setNumber,
            await Promise.all([
              loadUnitCatalogue(setNumber),
              loadItemCatalogue(setNumber),
              loadTraitCatalogue(setNumber),
            ]),
          ] as const,
      ),
    );
    const catalogues = new Map(loaded.map(([setNumber, [unitsForSet]]) => [setNumber, unitsForSet]));
    const itemCatalogues = new Map(loaded.map(([setNumber, [, itemsForSet]]) => [setNumber, itemsForSet]));
    const traitCatalogues = new Map(
      loaded.map(([setNumber, [, , traitsForSet]]) => [setNumber, traitsForSet]),
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
              item0: participantUnits.item0,
              item1: participantUnits.item1,
              item2: participantUnits.item2,
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
      const setNumber = setByMatch.get(row.matchId) ?? -1;
      const unit = catalogues.get(setNumber)?.get(row.unitId) ?? null;
      const itemIndex = itemCatalogues.get(setNumber) ?? null;
      const list = unitsByMatch.get(row.matchId) ?? [];
      list.push({
        id: row.unitId,
        name: unit?.name ?? null,
        imageUrl: unit?.imageUrl ?? null,
        star: row.star,
        // A slot holds at most three items (TFT's own cap), so the three columns
        // are the whole story — no fourth is silently dropped.
        items: [row.item0, row.item1, row.item2]
          .filter((itemId): itemId is string => Boolean(itemId))
          .map((itemId) => {
            const item = itemIndex?.get(itemId) ?? null;
            return { id: itemId, name: item?.name ?? null, imageUrl: item?.imageUrl ?? null };
          }),
      });
      unitsByMatch.set(row.matchId, list);
    }

    const traitRows =
      matchRows.length === 0
        ? []
        : await db
            .select({
              matchId: participantTraits.matchId,
              traitId: participantTraits.traitId,
              units: participantTraits.numUnits,
              tier: participantTraits.tierCurrent,
            })
            .from(participantTraits)
            .where(
              and(
                eq(participantTraits.puuid, puuid),
                // Tier 0 means the trait never reached its first breakpoint, which
                // is not something that board achieved.
                gt(participantTraits.tierCurrent, 0),
                inArray(
                  participantTraits.matchId,
                  matchRows.map((row) => row.matchId),
                ),
              ),
            );

    const traitsByMatch = new Map<string, PlayerMatchTrait[]>();
    for (const row of traitRows) {
      const setNumber = setByMatch.get(row.matchId) ?? -1;
      const trait = traitCatalogues.get(setNumber)?.get(row.traitId) ?? null;
      const list = traitsByMatch.get(row.matchId) ?? [];
      list.push({
        id: row.traitId,
        name: trait?.name ?? null,
        imageUrl: trait?.imageUrl ?? null,
        units: row.units,
        tier: row.tier,
      });
      traitsByMatch.set(row.matchId, list);
    }

    // A gold trait says more about the board than a bronze one, so the strongest
    // activation leads rather than whichever one Riot happened to list first.
    for (const [matchId, list] of traitsByMatch) {
      traitsByMatch.set(
        matchId,
        list.sort((a, b) => b.tier - a.tier || b.units - a.units || a.id.localeCompare(b.id)),
      );
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
      traits: traitsByMatch.get(row.matchId) ?? [],
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
