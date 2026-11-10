import { config, REGION_ROUTING, type Region } from "./config";
import { db } from "./db";
import { createLogger } from "./log";
import { enqueueMatches } from "./queue";
import { RateLimitAborted } from "./limiter";
import { RiotApiError, type RiotClient } from "./riot";

const log = createLogger("discover");

export type DiscoverResult = {
  players: number;
  idsSeen: number;
  idsEnqueued: number;
  failures: number;
};

type PlayerRow = {
  puuid: string;
  region: string;
  last_cursor: Date | null;
};

/**
 * Turn tracked players into queued match ids.
 *
 * Rotation is by `last_seen_at ASC NULLS FIRST`, so a run always works on the
 * players we have looked at least recently — freshly seeded players come first,
 * and no player starves.
 *
 * The cursor is rewound by a small overlap on purpose. Match ids are opaque, so
 * we cannot know their timestamps; without the overlap a match played in the
 * last minute of one run could fall between two windows. Re-discovering an id is
 * free (the queue dedupes), missing one is not.
 */
export async function discoverMatches(
  client: RiotClient,
  regions: Region[],
  playerLimit: number,
  /** Checked between players, so a shutdown does not wait out a whole pass. */
  options: { shouldStop?: () => boolean } = {},
): Promise<DiscoverResult> {
  const sql = db();

  const players = await sql<PlayerRow[]>`
    SELECT puuid, region, last_cursor
    FROM players
    WHERE region = ANY(${regions}::text[])
    ORDER BY last_seen_at ASC NULLS FIRST
    LIMIT ${playerLimit}
  `;

  const overlapMs = config.discoveryOverlapMinutes * 60_000;
  const windowMs = config.discoveryWindowHours * 3_600_000;

  const result: DiscoverResult = {
    players: 0,
    idsSeen: 0,
    idsEnqueued: 0,
    failures: 0,
  };

  for (const player of players) {
    if (options.shouldStop?.()) {
      log.info("stopping discovery early; cursors are committed per player", {
        processed: result.players,
      });
      break;
    }

    const region = player.region as Region;
    if (!(region in REGION_ROUTING)) {
      log.warn("skipping player with unknown region", { region, puuid: player.puuid });
      continue;
    }

    const startMs = player.last_cursor
      ? new Date(player.last_cursor).getTime() - overlapMs
      : Date.now() - windowMs;

    try {
      const ids = await client.matchIdsByPuuid(
        region,
        player.puuid,
        Math.floor(startMs / 1000),
        config.matchIdsPerRequest,
      );

      result.players += 1;
      result.idsSeen += ids.length;

      if (ids.length > 0) {
        result.idsEnqueued += await enqueueMatches(region, ids);
      }

      await sql`
        UPDATE players
        SET last_cursor = ${new Date(Date.now() - overlapMs)},
            last_seen_at = now()
        WHERE puuid = ${player.puuid}
      `;
    } catch (error) {
      // Stopped while waiting for a slot: not this player's fault, leave the
      // cursor untouched so the next start resumes here.
      if (error instanceof RateLimitAborted) {
        log.info("stopping discovery early; cursors are committed per player", {
          processed: result.players,
        });
        break;
      }

      result.failures += 1;

      if (error instanceof RiotApiError && !error.retriable) {
        // Bad/expired key: every remaining request would fail the same way.
        throw error;
      }

      log.warn("discovery failed for player", {
        puuid: player.puuid,
        error: error instanceof Error ? error.message : String(error),
      });

      // Advance the rotation marker so one broken player cannot block the queue
      // of players behind it, but leave the cursor untouched.
      await sql`
        UPDATE players SET last_seen_at = now() WHERE puuid = ${player.puuid}
      `;
    }
  }

  return result;
}
