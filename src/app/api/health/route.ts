import { count, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb, useHttpDriver } from "@/db/client";
import { compStats, comps, matches, participants, patches } from "@/db/schema";

/**
 * GET /api/health — the deployment smoke signal.
 *
 * Answers the only two questions that have actually broken this site:
 *   1. Can the running Worker reach Postgres? (a rotated password, a paused Neon
 *      branch or a bad secret all look identical from the outside: pages quietly
 *      fall back to the curated snapshot.)
 *   2. Does the database hold a sample? A reachable but empty corpus renders
 *      "collecting data" everywhere, which is a failure before a set launches.
 *
 * Why 503 for "empty" as well as "down": an uptime monitor only understands
 * status codes. Serving 200 while every comp says "collecting data" is exactly
 * the silent state this endpoint exists to make loud.
 *
 * Deliberately no credentials, headers or connection details in the body: the
 * payload is public, so errors are sanitised and only the Postgres error code is
 * passed through (e.g. 28P01 = bad password, which is diagnostic without being
 * sensitive).
 */

export const dynamic = "force-dynamic";

type HealthPayload = {
  status: "ok" | "empty" | "down";
  checkedAt: string;
  database: {
    configured: boolean;
    reachable: boolean;
    /** Which transport the runtime selected: HTTP on Workers, TCP on Node. */
    driver: "http" | "tcp";
    latencyMs: number | null;
    error: { message: string; code?: string } | null;
  };
  corpus: {
    matches: number;
    boards: number;
    publishedComps: number;
    statRows: number;
    /** Boards assigned to a comp — the number the tier list actually shows. */
    classifiedGames: number;
    latestPatch: string | null;
    statsComputedAt: string | null;
    statsAgeMinutes: number | null;
  } | null;
};

const NO_STORE = { "cache-control": "no-store" } as const;

/** Strip anything that could carry a credential into a public response. */
function sanitize(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]")
    .replace(/npg_[A-Za-z0-9]+/g, "npg_[redacted]")
    .slice(0, 200);
}

/**
 * Drizzle wraps driver failures in its own "Failed query: …" error, with the real
 * cause (ECONNREFUSED, 28P01, ENOTFOUND) one or two levels down. Walk the chain so
 * a monitor is told *why* the connection failed, not just that a query failed.
 */
function describeError(error: unknown): { message: string; code?: string } {
  let message = "";
  let code: string | undefined;
  let current: unknown = error;

  for (let depth = 0; current instanceof Error && depth < 5; depth += 1) {
    // Keep the deepest message: the root cause is the useful one.
    if (current.message) message = current.message;
    const currentCode = (current as Error & { code?: string }).code;
    if (currentCode && !code) code = currentCode;
    current = (current as Error & { cause?: unknown }).cause;
  }

  if (!message) message = String(error);
  const sanitized = sanitize(message);
  return code ? { message: sanitized, code } : { message: sanitized };
}

/** `max(computed_at)` arrives as Date or string depending on the driver. */
function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const configured = Boolean(process.env.DATABASE_URL);
  const driver: "http" | "tcp" = useHttpDriver() ? "http" : "tcp";

  if (!configured) {
    const payload: HealthPayload = {
      status: "down",
      checkedAt,
      database: {
        configured: false,
        reachable: false,
        driver,
        latencyMs: null,
        error: { message: "DATABASE_URL is not set" },
      },
      corpus: null,
    };
    return NextResponse.json(payload, { status: 503, headers: NO_STORE });
  }

  const startedAt = performance.now();

  try {
    const db = getDb();

    // One round trip: counts are cheap but each separate query costs a request.
    const [matchRows, boardRows, compRows, statsRows, statPatchRows, patchRows] = await Promise.all([
      db.select({ n: count() }).from(matches),
      db.select({ n: count() }).from(participants),
      db.select({ n: count() }).from(comps).where(eq(comps.published, true)),
      db
        .select({
          n: count(),
          games: sql<number>`coalesce(sum(${compStats.games}), 0)::int`,
          computedAt: sql<unknown>`max(${compStats.computedAt})`,
        })
        .from(compStats),
      // The patch the numbers actually belong to beats a catalogue row: `patches`
      // is populated by the asset loader, which may lag or be empty.
      db
        .select({ patch: compStats.patch })
        .from(compStats)
        .orderBy(desc(compStats.computedAt))
        .limit(1),
      db
        .select({ patch: patches.patch })
        .from(patches)
        .orderBy(desc(patches.setNumber), desc(patches.patch))
        .limit(1),
    ]);

    const latencyMs = Math.round(performance.now() - startedAt);
    const computedAt = toIso(statsRows[0]?.computedAt ?? null);

    const corpus: NonNullable<HealthPayload["corpus"]> = {
      matches: matchRows[0]?.n ?? 0,
      boards: boardRows[0]?.n ?? 0,
      publishedComps: compRows[0]?.n ?? 0,
      statRows: statsRows[0]?.n ?? 0,
      classifiedGames: statsRows[0]?.games ?? 0,
      latestPatch: statPatchRows[0]?.patch ?? patchRows[0]?.patch ?? null,
      statsComputedAt: computedAt,
      statsAgeMinutes: computedAt
        ? Math.max(0, Math.round((Date.now() - new Date(computedAt).getTime()) / 60_000))
        : null,
    };

    // Reachable but no sample is its own failure mode: every comp would render
    // "collecting data", so it must not report 200.
    const status = corpus.classifiedGames > 0 ? "ok" : "empty";
    const payload: HealthPayload = {
      status,
      checkedAt,
      database: { configured: true, reachable: true, driver, latencyMs, error: null },
      corpus,
    };

    return NextResponse.json(payload, { status: status === "ok" ? 200 : 503, headers: NO_STORE });
  } catch (error) {
    const payload: HealthPayload = {
      status: "down",
      checkedAt,
      database: {
        configured: true,
        reachable: false,
        driver,
        latencyMs: Math.round(performance.now() - startedAt),
        error: describeError(error),
      },
      corpus: null,
    };
    return NextResponse.json(payload, { status: 503, headers: NO_STORE });
  }
}
