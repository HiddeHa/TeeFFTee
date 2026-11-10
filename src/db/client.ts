import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Lazy Postgres client.
 *
 * Deliberately NOT created at module scope: the site must build and deploy with
 * no database configured, so importing this file must never open a connection.
 *
 * Usage (server-only):
 *   const db = getDb();
 *   const rows = await db.select().from(schema.compStats);
 *
 * `prepare: false` keeps it compatible with poolers (Supabase/Neon transaction
 * mode).
 */
let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. The site renders from src/content until the crawler is online; " +
        "set DATABASE_URL to query Postgres instead.",
    );
  }

  if (!client) {
    client = postgres(url, { max: 5, prepare: false });
  }

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
