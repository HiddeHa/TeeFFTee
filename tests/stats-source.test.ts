import assert from "node:assert/strict";
import test from "node:test";

import { listStatsPatches, loadCompStats } from "../src/lib/stats-source";

/**
 * `loadCompStats` distinguishes two absences that must never be conflated:
 *
 *   null   — there is no database (or it did not answer), so callers fall back to
 *            the curated content snapshot;
 *   Map(0) — the database answered and nobody has a sample, so pages say
 *            "collecting data" instead of presenting content numbers as measured.
 *
 * The no-database half is pure enough to test here. The counts-half — regions
 * summing rather than averaging rates, and `boards` staying the pick-rate
 * denominator — is SQL, and is asserted against real Postgres in
 * `e2e/stats-source.db.spec.ts`.
 */

async function withoutDatabase<T>(run: () => Promise<T>): Promise<T> {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    return await run();
  } finally {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
  }
}

test("no DATABASE_URL is 'no database', not 'no sample'", async () => {
  const stats = await withoutDatabase(() => loadCompStats({ patch: "18.6", rank: "master+" }));

  assert.equal(stats, null);
});

test("with no database there are no patch windows to compare", async () => {
  assert.deepEqual(await withoutDatabase(() => listStatsPatches()), []);
});
