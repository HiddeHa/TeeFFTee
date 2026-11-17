import { expect, test } from "@playwright/test";

import { seedComps, startHarness, type Harness } from "./database";
import { loadCompStats } from "../src/lib/stats-source";

/**
 * `loadCompStats` against real Postgres.
 *
 * Counts are stored per region, so combining regions has to *sum the counts* and
 * derive rates from the sums — averaging per-region rates would give every region
 * equal weight regardless of sample size. `boards` has to be summed too, because
 * it is the pick-rate denominator, not a per-region average.
 *
 * This asserts the read side directly rather than through `/meta`: the public
 * surface is gated to the current set ([src/lib/data.ts](../../src/lib/data.ts)),
 * and Set 19 has no published comps until it launches, so no page can render a
 * seeded row. The SQL is the part that would silently regress, so that is what is
 * asserted. When Set 19 comps publish, the page-level version of this belongs on
 * the tier list again.
 *
 * The seeded numbers are chosen so the wrong answers are visibly different:
 * EUW 50/100 (50.0%) and KR 18/60 (30.0%) give 42.5% when summed, 40.0% when the
 * rates are averaged. Boards 300 + 150 give a 35.6% pick rate from 160 games;
 * averaging the two board counts would claim 71.1%.
 */

const COMP = "riftbeast-brambleback";

let harness: Harness | undefined;
let previousUrl: string | undefined;
let previousDriver: string | undefined;

test.describe("comp stats read side", () => {
  test.beforeAll(async () => {
    harness = await startHarness({
      container: "teefftee-e2e-stats-db",
      pgPort: 55444,
      appPort: 3194,
      // No pages: the read side below is the same function the pages call, so a
      // second `next start` would only make the spec slower.
      app: false,
      players: [],
      seed: async (sql) => {
        await seedComps(
          sql,
          [
            {
              slug: COMP,
              name: "Riftbeast Brambleback",
              tier: "S",
              setNumber: 18,
              coreUnits: ["DA_18_Akali_AD"],
            },
          ],
          [
            {
              slug: COMP,
              patch: "18.6",
              region: "EUW",
              rankBucket: "master+",
              games: 100,
              placeSum: 400,
              top4: 50,
              wins: 10,
              boards: 300,
            },
            {
              slug: COMP,
              patch: "18.6",
              region: "KR",
              rankBucket: "master+",
              games: 60,
              placeSum: 300,
              top4: 18,
              wins: 3,
              boards: 150,
            },
          ],
        );
      },
    });

    if (!harness.ready) return;

    // `getDb()` reads these at call time, and this worker's only in-process
    // database is the harness one. Restored in `afterAll` so a later spec in the
    // same worker cannot inherit it.
    previousUrl = process.env.DATABASE_URL;
    previousDriver = process.env.DATABASE_DRIVER;
    process.env.DATABASE_URL = harness.databaseUrl;
    process.env.DATABASE_DRIVER = "tcp";
  });

  test.afterAll(async () => {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    if (previousDriver === undefined) delete process.env.DATABASE_DRIVER;
    else process.env.DATABASE_DRIVER = previousDriver;

    await harness?.stop();
  });

  test("regions are combined by summing counts, not by averaging rates", async () => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const stats = await loadCompStats({ patch: "18.6", rank: "master+" });
    expect(stats).not.toBeNull();

    const row = stats!.get(COMP);
    expect(row).toBeDefined();

    // 160 games, 700 placement points, 68 top-four finishes, 13 wins.
    expect(row!.games).toBe(160);
    expect(row!.avgPlace).toBeCloseTo(700 / 160, 5);
    expect(row!.top4Rate).toBeCloseTo(68 / 160, 5);
    expect(row!.winRate).toBeCloseTo(13 / 160, 5);

    // 40.0% is the average of the two regions' rates — the wrong answer.
    expect(row!.top4Rate).not.toBeCloseTo(0.4, 3);
  });

  test("pick rate keeps boards as the summed denominator", async () => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const stats = await loadCompStats({ patch: "18.6", rank: "master+" });
    const row = stats!.get(COMP)!;

    // 160 games ÷ (300 + 150 boards). Averaging the buckets would claim 71.1%.
    expect(row.pickRate).toBeCloseTo(160 / 450, 5);
    expect(row.pickRate).not.toBeCloseTo(0.711, 3);

    // A Wilson bound, not the raw rate: with 68 of 160 the floor sits below 42.5%.
    expect(row.top4CiLow).toBeGreaterThan(0);
    expect(row.top4CiLow).toBeLessThan(row.top4Rate);
  });
});
