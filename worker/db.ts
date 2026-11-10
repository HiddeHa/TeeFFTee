import postgres from "postgres";

import { requireDatabaseUrl } from "./config";

/**
 * Raw postgres.js client for the worker.
 *
 * The worker is an ETL job: bulk inserts, set-based updates and `FOR UPDATE
 * SKIP LOCKED` claims. Going straight to SQL keeps those explicit and avoids
 * guessing how a query builder will shape bulk-write results. The *schema* is
 * still owned by src/db/schema.ts and its migrations — this file only writes to
 * the tables defined there.
 */
let client: ReturnType<typeof postgres> | undefined;

export function db() {
  if (!client) {
    client = postgres(requireDatabaseUrl(), {
      max: 8,
      // Required for poolers (Supabase/Neon transaction mode).
      prepare: false,
      onnotice: () => undefined,
    });
  }
  return client;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = undefined;
  }
}
