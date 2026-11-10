import { config, type Region } from "./config";
import { db } from "./db";
import { createLogger } from "./log";
import type { RiotClient } from "./riot";

const log = createLogger("seed");

export type SeedResult = {
  region: Region;
  tier: string;
  entries: number;
  usable: number;
  upserted: number;
};

/**
 * Seed the tracked player pool from the ranked ladders.
 *
 * Only a PUUID is storable: Riot removed the summoner-id and by-name TFT routes,
 * so an entry without a puuid is unusable and counted rather than silently
 * dropped.
 */
export async function seedLadders(
  client: RiotClient,
  regions: Region[],
): Promise<SeedResult[]> {
  const sql = db();
  const results: SeedResult[] = [];
  let budget = config.seedMaxPlayers;

  for (const region of regions) {
    for (const tier of config.seedTiers) {
      if (budget <= 0) {
        log.warn("seed player cap reached, skipping remaining ladders", {
          cap: config.seedMaxPlayers,
        });
        break;
      }

      const ladder = await client.ladder(region, tier);
      const entries = ladder.entries ?? [];
      const usable = entries
        .filter((entry) => typeof entry.puuid === "string" && entry.puuid.length > 0)
        .slice(0, budget)
        .map((entry) => ({
          puuid: entry.puuid as string,
          region,
          tier: tier.toUpperCase(),
          lp: entry.leaguePoints ?? 0,
        }));

      const skipped = entries.length - usable.length;
      if (skipped > 0) {
        log.warn("ladder entries without a puuid — not storable", { region, tier, skipped });
      }

      if (usable.length === 0) {
        results.push({ region, tier, entries: entries.length, usable: 0, upserted: 0 });
        continue;
      }

      // last_seen_at is deliberately left untouched on conflict: it is the
      // rotation key for discovery, and reseeding must not demote active players.
      const upserted = await sql`
        INSERT INTO players ${sql(usable, "puuid", "region", "tier", "lp")}
        ON CONFLICT (puuid) DO UPDATE SET
          region = excluded.region,
          tier = excluded.tier,
          lp = excluded.lp
        RETURNING puuid
      `;

      budget -= usable.length;
      results.push({
        region,
        tier,
        entries: entries.length,
        usable: usable.length,
        upserted: upserted.length,
      });

      log.info("seeded ladder", {
        region,
        tier,
        entries: entries.length,
        usable: usable.length,
      });
    }
  }

  return results;
}
