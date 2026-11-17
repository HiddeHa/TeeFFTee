import { expect, test, type Page } from "@playwright/test";

import { startHarness, type Harness, type SeedPlayer } from "./database";

/**
 * The player page with a database attached.
 *
 * `players.spec.ts` covers the state this suite can always reach — no database,
 * so a page that says what is missing. This file covers the other half: a
 * ladder row, two crawled matches, a board with items, an active trait and an
 * inactive one that must not be listed. It uses the throwaway Postgres from
 * `./database`, so the placements and counts are fixed rather than whatever the
 * crawl last produced.
 */

const PG_PORT = Number(process.env.E2E_PG_PORT ?? 55440);
const APP_PORT = Number(process.env.E2E_DB_APP_PORT ?? 3198);

const PLAYER: SeedPlayer = {
  puuid: "e2e-puuid-profile",
  game_name: "ProfileTest",
  tag_line: "EUW",
  region: "EUW",
  tier: "CHALLENGER",
  lp: 1000,
};

/** Real Set 18 ids, so the page resolves them the way it resolves crawled rows. */
const AKALI = "DA_18_Akali_AD";
const CAMILLE = "DA_18_Camille";
const INFERNO = "DA_18_Inferno";
const COVEN = "DA_18_Coven";
const GUINSOO = "TFT_Item_GuinsoosRageblade";

let harness: Harness;

/** The match rows, scoped to the section that lists them. */
function matchRows(page: Page) {
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Recent matches" }) });
  return section.locator("li.card");
}

/** A summary card by its label, e.g. "Avg place". */
function statCard(page: Page, label: string) {
  return page.locator("div.card").filter({ has: page.getByText(label, { exact: true }) });
}

test.describe("player page against Postgres", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(async () => {
    harness = await startHarness({
      container: "teefftee-e2e-player-db",
      pgPort: PG_PORT,
      appPort: APP_PORT,
      players: [PLAYER],
      /**
       * Two matches: one board with two units, one item and one active trait
       * (plus an inactive trait that must be filtered out), and one match whose
       * board the normaliser never stored.
       */
      seed: async (sql) => {
        await sql`insert into units ${sql(
          [
            { unit_id: AKALI, set_number: 18, name: "Akali", cost: 1, traits: [INFERNO], image_url: null },
            { unit_id: CAMILLE, set_number: 18, name: "Camille", cost: 1, traits: [COVEN], image_url: null },
          ],
          "unit_id",
          "set_number",
          "name",
          "cost",
          "traits",
          "image_url",
        )}`;

        await sql`insert into items (item_id, set_number, name, kind, image_url)
                  values (${GUINSOO}, 18, ${"Guinsoo's Rageblade"}, ${"completed"}, null)`;

        await sql`insert into traits ${sql(
          [
            { trait_id: INFERNO, set_number: 18, name: "Inferno", breakpoints: [2, 4, 6], image_url: null },
            { trait_id: COVEN, set_number: 18, name: "Coven", breakpoints: [2, 3], image_url: null },
          ],
          "trait_id",
          "set_number",
          "name",
          "breakpoints",
          "image_url",
        )}`;

        await sql`insert into matches (match_id, region, patch, set_number, game_datetime)
                  values ('E2E_MATCH_1', 'EUW', '18.6', 18, '2026-11-14T10:00:00Z'),
                         ('E2E_MATCH_2', 'EUW', '18.6', 18, '2026-11-13T09:00:00Z')`;

        await sql`insert into participants (match_id, puuid, placement, level, last_round, gold_left)
                  values ('E2E_MATCH_1', ${PLAYER.puuid}, 1, 9, 38, 12),
                         ('E2E_MATCH_2', ${PLAYER.puuid}, 5, 8, 30, 3)`;

        await sql`insert into participant_units
                    (match_id, puuid, unit_id, star_level, slot, item_0, item_1, item_2)
                  values ('E2E_MATCH_1', ${PLAYER.puuid}, ${AKALI}, 2, 0, ${GUINSOO}, null, null),
                         ('E2E_MATCH_1', ${PLAYER.puuid}, ${CAMILLE}, 3, 1, null, null, null)`;

        await sql`insert into participant_traits (match_id, puuid, trait_id, num_units, tier_current)
                  values ('E2E_MATCH_1', ${PLAYER.puuid}, ${INFERNO}, 4, 2),
                         ('E2E_MATCH_1', ${PLAYER.puuid}, ${COVEN}, 1, 0)`;
      },
    });
  });

  test.afterAll(async () => {
    await harness?.stop();
  });

  test("the profile shows its ladder snapshot and its crawled summary", async ({ page }) => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const response = await page.goto(`${harness.origin}/players/${PLAYER.puuid}`);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ProfileTest#EUW");
    await expect(page.locator("header").getByText("EUW", { exact: true })).toBeVisible();
    await expect(page.locator("header").getByText("CHALLENGER", { exact: true })).toBeVisible();
    await expect(page.getByText("1000 LP")).toBeVisible();

    // 2 games: one win and one fifth, so 3.00 average, 50% top-4, best #1.
    await expect(statCard(page, "Games")).toContainText("2");
    await expect(statCard(page, "Avg place")).toContainText("3.00");
    await expect(statCard(page, "Top 4")).toContainText("50%");
    await expect(statCard(page, "Wins")).toContainText("1");
    await expect(statCard(page, "Best")).toContainText("#1");
  });

  test("matches are newest first, with the board, its items and its active traits", async ({
    page,
  }) => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    await page.goto(`${harness.origin}/players/${PLAYER.puuid}`);

    const rows = matchRows(page);
    await expect(rows).toHaveCount(2);

    // Newest first: the win is 14 November, the fifth place is 13 November.
    const win = rows.nth(0);
    await expect(win).toContainText("#1");
    await expect(win).toContainText("14 Nov 2026");
    await expect(win).toContainText("Patch 18.6");
    await expect(win).toContainText("level 9");

    // The board: both units by name (not raw ids), star levels, and the item.
    await expect(win.locator('[title="Akali"]')).toBeVisible();
    await expect(win.locator('[title="Akali"]')).toContainText("2");
    await expect(win.locator('[title="Camille"]')).toBeVisible();
    await expect(win.locator('[title="Camille"]')).toContainText("3");
    await expect(win.locator('[title="Guinsoo\'s Rageblade"]')).toBeVisible();

    // Only traits that reached a breakpoint: Inferno at tier 2 is listed, and
    // the tier-0 Coven row is not — an inactive trait is not something the board
    // achieved.
    await expect(win.locator('[title^="Inferno —"]')).toBeVisible();
    await expect(win.getByText("Coven")).toHaveCount(0);

    // The match whose payload carried no board says so instead of showing an
    // empty board as if the player had fielded nothing.
    await expect(rows.nth(1)).toContainText("#5");
    await expect(rows.nth(1)).toContainText("No board stored for this match");
  });

  test("a PUUID the ladder has never seen is a 404", async ({ page }) => {
    test.skip(!harness?.ready, "Docker is unavailable, so there is no populated database.");

    const response = await page.goto(`${harness.origin}/players/e2e-puuid-never-crawled`);
    expect(response?.status()).toBe(404);
  });
});
