import { expect, test } from "@playwright/test";

import { seedComps, startHarness, type Harness } from "./database";

/**
 * A populated database behind the Set 19 public surface.
 *
 * The rest of the suite runs with `DATABASE_URL` blanked, so it can only prove
 * the degraded states. This spec seeds measured `comp_stats` rows for two Set 18
 * comps and then checks the two things a database makes observable:
 *
 *   1. **The set gate.** Set 18 comps stay in content as an archive, and the
 *      public surface belongs to the current set (`src/lib/data.ts`), so rows
 *      that exist in Postgres must still not appear under a Set 19 header. That
 *      is a rule a no-database run cannot distinguish from an empty database.
 *   2. **The dates.** `/api/health` dates the crawl and the aggregate separately,
 *      which is what makes a stopped crawler visible.
 *
 * The measured *pages* (a comp's numbers on the tier list, risers and fallers per
 * patch) cannot be asserted here while Set 19 has no published comps — there is
 * no page that renders a seeded row. `stats-source.db.spec.ts` covers the SQL
 * those pages read, and the tier-list version of these assertions returns with
 * the first Set 19 comps on 2 December.
 */

const PG_PORT = Number(process.env.E2E_PG_PORT ?? 55441);
const APP_PORT = Number(process.env.E2E_DB_APP_PORT ?? 3195);

const RISER = "riftbeast-brambleback";
const FALLER = "adaptor-master-yi";

let harness: Harness;

test.describe("measured rows under the Set 19 surface", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(async () => {
    harness = await startHarness({
      container: "teefftee-e2e-meta-db",
      pgPort: PG_PORT,
      appPort: APP_PORT,
      players: [],
      // These pages are static at build time, so the seeded rows are only
      // visible once their build output is discarded and they render on demand.
      invalidate: ["meta", "meta/stats", "patch/18.6"],
      seed: async (sql) => {
        await seedComps(
          sql,
          [
            {
              slug: RISER,
              name: "Riftbeast Brambleback",
              tier: "S",
              setNumber: 18,
              coreUnits: ["DA_18_Akali_AD"],
            },
            {
              slug: FALLER,
              name: "Adaptor Master Yi",
              tier: "A",
              setNumber: 18,
              coreUnits: ["DA_18_Camille"],
            },
          ],
          [
            // Two patches with a real difference, so the patch page has both
            // sides of a movement to derive.
            {
              slug: RISER,
              patch: "18.5",
              region: "EUW",
              rankBucket: "master+",
              games: 150,
              placeSum: 750,
              top4: 60,
              wins: 6,
              boards: 300,
            },
            {
              slug: RISER,
              patch: "18.6",
              region: "EUW",
              rankBucket: "master+",
              games: 200,
              placeSum: 900,
              top4: 120,
              wins: 20,
              boards: 400,
            },
            {
              slug: FALLER,
              patch: "18.5",
              region: "EUW",
              rankBucket: "master+",
              games: 100,
              placeSum: 500,
              top4: 55,
              wins: 10,
              boards: 300,
            },
            {
              slug: FALLER,
              patch: "18.6",
              region: "EUW",
              rankBucket: "master+",
              games: 120,
              placeSum: 660,
              top4: 48,
              wins: 8,
              boards: 400,
            },
          ],
        );
      },
    });
  });

  test.afterAll(async () => {
    await harness?.stop();
  });

  test("/meta does not surface a previous set's rows as the current meta", async ({ page }) => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const response = await page.goto(`${harness.origin}/meta`);
    expect(response?.status()).toBe(200);

    // The database answered and holds rows for these two comps…
    await expect(page.getByText(/not being seeded with Set 18 boards/)).toBeVisible();

    // …and neither of them is presented as part of the current set.
    expect(await page.locator(`a[href="/meta/${RISER}"]`).count()).toBe(0);
    expect(await page.locator(`a[href="/meta/${FALLER}"]`).count()).toBe(0);
  });

  test("/meta/stats stays empty rather than showing an archive set's numbers", async ({ page }) => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const response = await page.goto(`${harness.origin}/meta/stats`);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByText(/No Set 19 comps are published yet, so this table is empty/),
    ).toBeVisible();

    // No comps means no table at all: there is nowhere for an archive set's
    // numbers, or a fabricated 0.0%, to appear.
    await expect(page.locator("table")).toHaveCount(0);
    await expect(page.locator(`a[href="/meta/${RISER}"]`)).toHaveCount(0);
  });

  test("/api/health dates the aggregate and reports the absent crawl honestly", async ({
    request,
  }) => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const response = await request.get(`${harness.origin}/api/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    // This database has comp_stats but no matches: the aggregate is dated, the
    // crawl is honestly absent, and the window sample is zero rather than null.
    expect(body.corpus).toMatchObject({
      matches: 0,
      matchesInWindow: 0,
      windowHours: 72,
      lastCrawlAt: null,
      crawlAgeMinutes: null,
    });
    expect(typeof body.corpus.statsComputedAt).toBe("string");
    expect(body.corpus.statsAgeMinutes).toBeGreaterThanOrEqual(0);
  });

  test("/patch/18.6 derives risers and fallers from the two stats windows", async ({ page }) => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const response = await page.goto(`${harness.origin}/patch/18.6`);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Patch 18.6");
    await expect(page.getByText(/\+20\.0pp/)).toBeVisible();
    await expect(page.getByText(/-15\.0pp/)).toBeVisible();
    await expect(page.getByText(/Top-4 rate against patch 18\.5/)).toBeVisible();
    await expect(page.getByText(/at least 50 games in both patches/)).toBeVisible();
  });
});
