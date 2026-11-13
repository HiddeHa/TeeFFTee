import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleTcp, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
 * TWO DRIVERS, ONE SCHEMA
 *  - postgres.js over TCP: local dev, the crawler, drizzle-kit — anything on Node.
 *  - Neon's HTTP driver: the deployed site. A Worker cannot open a raw Postgres
 *    socket, so the edge reads over HTTPS instead. Queries are the same drizzle
 *    builder either way; only the transport differs.
 *
 * `DATABASE_DRIVER=http|tcp` forces a choice (tests, local rehearsal of the edge
 * path); otherwise the Workers runtime is detected.
 *
 * `prepare: false` keeps the TCP client compatible with poolers (Neon/Supabase
 * transaction mode).
 */

/**
 * The query surface every call site uses. Both drivers expose the same builder
 * for the queries the site runs, so the HTTP instance is cast structurally
 * rather than threading a union through `stats-source` and `units` — a union of
 * two drizzle database types is not chainable in TypeScript.
 */
export type Database = PostgresJsDatabase<typeof schema>;

function onWorkers(): boolean {
  const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent;
  return typeof ua === "string" && ua.includes("Cloudflare-Workers");
}

/** Exposed so diagnostics can report which transport is live without connecting. */
export function useHttpDriver(): boolean {
  const forced = process.env.DATABASE_DRIVER;
  if (forced) return forced === "http";
  return onWorkers();
}

let tcp: ReturnType<typeof postgres> | undefined;
let http: NeonHttpDatabase<typeof schema> | undefined;

export function getDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. The site renders from src/content until the crawler is online; " +
        "set DATABASE_URL to query Postgres instead.",
    );
  }

  if (useHttpDriver()) {
    if (!http) http = drizzleHttp(neon(url), { schema });
    return http as unknown as Database;
  }

  if (!tcp) {
    tcp = postgres(url, { max: 5, prepare: false });
  }

  return drizzleTcp(tcp, { schema });
}
