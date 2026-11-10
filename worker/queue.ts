import { config } from "./config";
import { db } from "./db";

/**
 * The match queue lives in Postgres, not in memory.
 *
 * That is the whole point: a crawler that loses its place on restart is a
 * crawler you restart constantly. Rows are claimed with `FOR UPDATE SKIP LOCKED`
 * so several fetchers can run in parallel, and stale claims are reclaimed after
 * a crash instead of being lost.
 */

export type QueueRow = {
  match_id: string;
  region: string;
  attempts: number;
};

export type QueueStats = {
  pending: number;
  fetching: number;
  done: number;
  failed: number;
  oldestPendingMinutes: number | null;
};

/**
 * Insert discovered match ids, ignoring ones already known. Returns how many
 * were genuinely new — the dedupe signal that stops the same match being
 * fetched eight times (once per participant).
 */
export async function enqueueMatches(
  region: string,
  matchIds: string[],
): Promise<number> {
  if (matchIds.length === 0) return 0;

  const sql = db();
  const rows = matchIds.map((matchId) => ({ match_id: matchId, region }));

  // No result generic here: postgres.js resolves the tagged-template overload
  // differently once a helper (`sql(rows, ...)`) is embedded, which makes an
  // explicit array type fail. The result is a readonly row list; length is all
  // this function needs.
  const inserted = await sql`
    INSERT INTO match_queue ${sql(rows, "match_id", "region")}
    ON CONFLICT (match_id) DO NOTHING
    RETURNING match_id
  `;

  return inserted.length;
}

/**
 * Claim up to `limit` due rows for this worker. `pending` rows are due
 * immediately; `fetching` rows are due again once their claim is older than the
 * timeout, which is how a crashed worker's work gets picked back up.
 */
export async function claimBatch(limit: number): Promise<QueueRow[]> {
  const sql = db();

  return sql<QueueRow[]>`
    UPDATE match_queue AS q
    SET status = 'fetching',
        claimed_at = now(),
        attempts = q.attempts + 1
    WHERE q.match_id IN (
      SELECT match_id
      FROM match_queue
      WHERE status = 'pending'
         OR (
           status = 'fetching'
           AND claimed_at < now() - make_interval(mins => ${config.claimTimeoutMinutes})
         )
      ORDER BY enqueued_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING q.match_id, q.region, q.attempts
  `;
}

/**
 * Give a claimed row back untouched — used when the crawler stops before it got
 * to send the request. The attempt counter is restored, because a shutdown is
 * not a failed fetch and must not eat into the retry budget.
 */
export async function releaseClaim(matchId: string): Promise<void> {
  const sql = db();
  await sql`
    UPDATE match_queue
    SET status = 'pending',
        claimed_at = NULL,
        attempts = GREATEST(0, attempts - 1)
    WHERE match_id = ${matchId} AND status = 'fetching'
  `;
}

export async function markDone(matchId: string, note?: string): Promise<void> {
  const sql = db();
  await sql`
    UPDATE match_queue
    SET status = 'done', fetched_at = now(), last_error = ${note ?? null}
    WHERE match_id = ${matchId}
  `;
}

/**
 * Terminal failure: stop retrying after `maxAttempts`, otherwise leave it
 * pending so the next pass picks it up.
 */
export async function markFailed(
  matchId: string,
  attempts: number,
  error: string,
): Promise<void> {
  const sql = db();
  const terminal = attempts >= config.maxAttempts;
  await sql`
    UPDATE match_queue
    SET status = ${terminal ? "failed" : "pending"},
        last_error = ${error.slice(0, 500)}
    WHERE match_id = ${matchId}
  `;
}

export async function queueStats(): Promise<QueueStats> {
  const sql = db();
  const rows = await sql<{ status: string; count: string }[]>`
    SELECT status, count(*)::text AS count
    FROM match_queue
    GROUP BY status
  `;

  const byStatus = new Map(rows.map((row) => [row.status, Number(row.count)]));
  const oldest = await sql<{ minutes: number | null }[]>`
    SELECT EXTRACT(EPOCH FROM (now() - min(enqueued_at))) / 60 AS minutes
    FROM match_queue
    WHERE status = 'pending'
  `;

  const minutes = oldest[0]?.minutes;

  return {
    pending: byStatus.get("pending") ?? 0,
    fetching: byStatus.get("fetching") ?? 0,
    done: byStatus.get("done") ?? 0,
    failed: byStatus.get("failed") ?? 0,
    oldestPendingMinutes: minutes === null || minutes === undefined ? null : Math.round(minutes),
  };
}
