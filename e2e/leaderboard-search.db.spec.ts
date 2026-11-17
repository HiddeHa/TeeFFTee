import { expect, test, type Page } from "@playwright/test";

import { startHarness, type Harness, type SeedPlayer } from "./database";

/**
 * The leaderboard search against a real Postgres.
 *
 * The rest of the suite runs with `DATABASE_URL` blanked so it asserts the
 * degraded states; that cannot exercise a SQL predicate. Searching a Riot ID is
 * one — the query splits `Name#TAG` across two columns — so this file stands up
 * its own database through `./database` rather than borrowing the developer's:
 * fixed rows, fixed answers, no dependence on when the crawler last ran.
 */

const PG_PORT = Number(process.env.E2E_PG_PORT ?? 55439);
const APP_PORT = Number(process.env.E2E_DB_APP_PORT ?? 3199);

/**
 * Three rows, chosen so each half of a Riot ID is unique on its own:
 * one `BAD` tag, one `Safo20` name per region, and a bystander whose name and
 * tag match neither half of the ID under test.
 */
const PLAYERS: SeedPlayer[] = [
  {
    puuid: "e2e-puuid-safo-euw",
    game_name: "Safo20",
    tag_line: "BAD",
    region: "EUW",
    tier: "CHALLENGER",
    lp: 1240,
  },
  {
    puuid: "e2e-puuid-safo-kr",
    game_name: "safo20",
    tag_line: "KR1",
    region: "KR",
    tier: "GRANDMASTER",
    lp: 975,
  },
  {
    puuid: "e2e-puuid-tiny-ted",
    game_name: "TinyTed",
    tag_line: "EUW1",
    region: "EUW",
    tier: "MASTER",
    lp: 410,
  },
];

let harness: Harness;

/** The page reads `?region=&q=`; build the URL the same way a visitor would. */
async function search(page: Page, params: Record<string, string>): Promise<void> {
  const url = new URL("/leaderboards", harness.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  await page.goto(url.toString());
}

function rows(page: Page) {
  return page.locator("ol li");
}

test.describe("leaderboard search against Postgres", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(async () => {
    harness = await startHarness({
      container: "teefftee-e2e-search-db",
      pgPort: PG_PORT,
      appPort: APP_PORT,
      players: PLAYERS,
    });
  });

  test.afterAll(async () => {
    await harness?.stop();
  });

  test("a pasted Riot ID finds the player it names", async ({ page }) => {
    test.skip(!harness.ready, "Docker is unavailable, so there is no throwaway Postgres to search.");

    await search(page, { region: "EUW", q: "Safo20#BAD" });

    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Safo20#BAD");
    await expect(page.getByText(/1 matching “Safo20#BAD” in Europe/)).toBeVisible();
  });

  test("its halves still work: a bare tag, a bare name, and the PUUID", async ({ page }) => {
    test.skip(!harness.ready, "Docker is unavailable, so there is no throwaway Postgres to search.");

    // Tag alone, in the same region.
    await search(page, { region: "EUW", q: "BAD" });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Safo20#BAD");

    // Name alone, and the region chip decides which of the two namesakes it is.
    await search(page, { region: "KR", q: "Safo20" });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("safo20#KR1");

    // A PUUID is what people paste out of the client.
    await search(page, { region: "EUW", q: "e2e-puuid-tiny-ted" });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("TinyTed#EUW1");
  });

  test("a Riot ID with the wrong tag is no result, not a loose match", async ({ page }) => {
    test.skip(!harness.ready, "Docker is unavailable, so there is no throwaway Postgres to search.");

    await search(page, { region: "EUW", q: "Safo20#NOPE" });
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByText(/No tracked player in Europe matches “Safo20#NOPE”/)).toBeVisible();

    // Case does not matter; a Riot ID is not case-sensitive to the person pasting it.
    await search(page, { region: "EUW", q: "safo20#bad" });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Safo20#BAD");
  });
});
