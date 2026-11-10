import { config, REGION_ROUTING, type Region } from "./config";
import { createLogger } from "./log";
import { normalizeMatch, persistMatch } from "./normalize";
import { RateLimitAborted } from "./limiter";
import { claimBatch, markDone, markFailed, releaseClaim } from "./queue";
import { RiotApiError, RiotNotFoundError, type RiotClient } from "./riot";

const log = createLogger("fetch");

export type FetchResult = {
  processed: number;
  inserted: number;
  duplicates: number;
  notFound: number;
  unparsable: number;
  failed: number;
  queueEmpty: boolean;
};

/**
 * Drain the queue.
 *
 * Each lane claims one row at a time with `SKIP LOCKED`, so concurrency is
 * enforced by the database rather than by a shared counter. A network failure
 * leaves the row pending (retried next pass, up to maxAttempts); a 404 or an
 * unparsable payload is marked done with a note, because retrying cannot change
 * the answer.
 */
export async function fetchMatches(
  client: RiotClient,
  options: {
    limit: number;
    concurrency?: number;
    /** Checked before claiming, so shutdown leaves rows pending, not orphaned. */
    shouldStop?: () => boolean;
  } = { limit: 500 },
): Promise<FetchResult> {
  const concurrency = Math.max(1, options.concurrency ?? config.concurrency);
  const result: FetchResult = {
    processed: 0,
    inserted: 0,
    duplicates: 0,
    notFound: 0,
    unparsable: 0,
    failed: 0,
    queueEmpty: false,
  };

  const lane = async (): Promise<void> => {
    for (;;) {
      if (result.processed >= options.limit) return;
      if (options.shouldStop?.()) return;

      const claimed = await claimBatch(1);
      const row = claimed[0];
      if (!row) {
        result.queueEmpty = true;
        return;
      }

      result.processed += 1;

      const region = row.region as Region;
      if (!(region in REGION_ROUTING)) {
        await markDone(row.match_id, `unknown region ${row.region}`);
        result.unparsable += 1;
        continue;
      }

      try {
        const payload = await client.match(region, row.match_id);
        const normalized = normalizeMatch(payload, row.match_id, region);

        if (!normalized) {
          await markDone(row.match_id, "unparsable payload");
          result.unparsable += 1;
          continue;
        }

        const outcome = await persistMatch(normalized);
        if (outcome === "inserted") result.inserted += 1;
        else result.duplicates += 1;

        await markDone(row.match_id);
      } catch (error) {
        if (error instanceof RateLimitAborted) {
          // No request went out, so hand the row back rather than logging a
          // failure the operator would have to explain.
          await releaseClaim(row.match_id);
          result.processed -= 1;
          return;
        }

        if (error instanceof RiotNotFoundError) {
          await markDone(row.match_id, "404: match unavailable");
          result.notFound += 1;
          continue;
        }

        result.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        await markFailed(row.match_id, row.attempts, message);

        // A rejected key or malformed request will fail identically for every
        // remaining row, so stop the run instead of burning the queue.
        if (error instanceof RiotApiError && !error.retriable) throw error;

        log.warn("match fetch failed", { matchId: row.match_id, attempts: row.attempts, message });
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => lane()));

  return result;
}
