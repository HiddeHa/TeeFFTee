import { config, type Region } from "./config";
import { db } from "./db";
import { createLogger } from "./log";
import type { RiotClient } from "./riot";
import { RiotApiError, RiotNotFoundError } from "./riot";

const log = createLogger("names");

export type NameResult = {
  region: Region;
  attempted: number;
  resolved: number;
  missing: number;
  failed: number;
};

/**
 * Resolve Riot IDs for tracked players.
 *
 * The TFT match payload carries no name — only a PUUID — so the only source is
 * account-v1, at one request per player. That cost is why this is a separate
 * command with its own budget (`CRAWL_NAMES_PER_RUN`) instead of something
 * `seed` does inline: a 2,000-player pool would otherwise triple the requests a
 * seed spends before a single match is fetched.
 *
 * It only ever fills rows where `game_name IS NULL`, so re-running it is cheap
 * and a name resolved once is not re-fetched. A 404 (deleted or transferred
 * account) is counted and skipped: there is no name to store, and inventing one
 * is the failure mode this site exists to avoid.
 */
export async function resolveRiotIds(
  client: RiotClient,
  regions: Region[],
  limit = config.namesPerRun,
): Promise<NameResult[]> {
  const sql = db();
  const results: NameResult[] = [];

  for (const region of regions) {
    const pending = await sql<{ puuid: string }[]>`
      SELECT puuid
      FROM players
      WHERE region = ${region} AND game_name IS NULL
      ORDER BY lp DESC, puuid
      LIMIT ${limit}
    `;

    const result: NameResult = {
      region,
      attempted: pending.length,
      resolved: 0,
      missing: 0,
      failed: 0,
    };

    for (const row of pending) {
      try {
        const account = await client.accountByPuuid(region, row.puuid);
        const gameName = account.gameName?.trim();
        const tagLine = account.tagLine?.trim();
        if (!gameName || !tagLine) {
          result.failed += 1;
          continue;
        }

        await sql`
          UPDATE players
          SET game_name = ${gameName}, tag_line = ${tagLine}
          WHERE puuid = ${row.puuid}
        `;
        result.resolved += 1;
      } catch (error) {
        if (error instanceof RiotNotFoundError) {
          result.missing += 1;
          continue;
        }
        if (error instanceof RiotApiError && !error.retriable) {
          // A rejected key stops the whole run rather than burning the budget on
          // requests that cannot succeed.
          log.error("name resolution stopped", { region, reason: error.message });
          results.push(result);
          return results;
        }
        result.failed += 1;
      }
    }

    results.push(result);
    log.info("names resolved", { ...result });
  }

  return results;
}
