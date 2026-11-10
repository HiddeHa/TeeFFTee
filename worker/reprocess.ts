import { db } from "./db";
import { createLogger } from "./log";
import { normalizeMatch, persistMatch } from "./normalize";
import type { TftMatchDto } from "./riot-types";

const log = createLogger("reprocess");

export type ReprocessResult = { scanned: number; rebuilt: number; skipped: number };

/**
 * Rebuild the derived rows from the stored raw payloads.
 *
 * This is why `matches.raw` exists: when the normalizer changes, you replay a
 * patch's worth of matches in minutes instead of re-crawling for days.
 *
 * The delete and the re-insert are separate transactions, so for a moment each
 * match has no participant rows. That is acceptable for a maintenance command
 * that runs while the site reads aggregates — never mid-crawl.
 */
export async function reprocessMatches(limit: number): Promise<ReprocessResult> {
  const sql = db();

  const rows = await sql<{ match_id: string; region: string; raw: TftMatchDto }[]>`
    SELECT match_id, region, raw
    FROM matches
    WHERE raw IS NOT NULL
    ORDER BY fetched_at DESC
    LIMIT ${limit}
  `;

  const result: ReprocessResult = { scanned: rows.length, rebuilt: 0, skipped: 0 };

  for (const row of rows) {
    const normalized = normalizeMatch(row.raw, row.match_id, row.region);
    if (!normalized) {
      result.skipped += 1;
      log.warn("payload no longer parses", { matchId: row.match_id });
      continue;
    }

    await sql.begin(async (tx) => {
      await tx`DELETE FROM participant_units WHERE match_id = ${row.match_id}`;
      await tx`DELETE FROM participant_traits WHERE match_id = ${row.match_id}`;
      await tx`DELETE FROM participant_augments WHERE match_id = ${row.match_id}`;
      await tx`DELETE FROM participants WHERE match_id = ${row.match_id}`;
      await tx`DELETE FROM matches WHERE match_id = ${row.match_id}`;
    });

    await persistMatch(normalized);
    result.rebuilt += 1;
  }

  return result;
}
