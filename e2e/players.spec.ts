import { expect, test } from "@playwright/test";

/**
 * The player page reads the crawler's database, which the suite deliberately
 * blanks (`DATABASE_URL: ""`). That makes the degraded state the one the suite
 * can assert on every run: a page that says it has nothing, rather than a 500 or
 * an empty table pretending to be a measurement.
 *
 * The populated path is exercised against a real Postgres in `src/lib/players.ts`
 * (rehearsal: stub crawl -> page render), because it needs crawl output the
 * committed fixtures do not contain.
 */
test.describe("player page", () => {
  test("the leaderboard says so when no crawl database is attached", async ({ page }) => {
    const response = await page.goto("/leaderboards");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/1,000 in Europe/i);
    await expect(page.getByText(/No crawl data is attached here/)).toBeVisible();
    // No ladder rows: the site header has its own list, so scope to the page body.
    await expect(page.locator("ol li")).toHaveCount(0);
  });

  test("the old tracked-player index redirects to the leaderboard", async ({ page }) => {
    const response = await page.goto("/players");

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/leaderboards");
  });

  test("says plainly that no crawl database is attached", async ({ page }) => {
    const response = await page.goto("/players/puuid-that-was-never-crawled");

    expect(response?.status()).toBe(200);
    await expect(page.getByText(/No crawl data is attached here/)).toBeVisible();
    await expect(page.getByText("puuid-that-was-never-crawled", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Recent matches" })).toHaveCount(0);
  });
});
