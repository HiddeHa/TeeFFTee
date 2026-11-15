import { expect, test } from "@playwright/test";

/**
 * The pages that do not need a database.
 *
 * Editorial content (comps, patches, site copy) lives in `src/content`, and the
 * catalogue snapshot covers units, items and traits, so every page below renders
 * the same thing on a laptop, in CI and on the deployed Worker. Numbers are
 * deliberately not asserted: they move whenever the crawler runs.
 */

test("the home page leads into the tier list", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("High-elo TFT stats");
  await expect(page.getByRole("link", { name: "See the tier list" })).toHaveAttribute(
    "href",
    "/comps",
  );
});

test("the header moves between the main pages", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("navigation")
    .first()
    .getByRole("link", { name: "Teambuilder" })
    .click();

  await expect(page).toHaveURL(/\/teambuilder$/);
  await expect(page.getByRole("heading", { level: 1, name: "Teambuilder" })).toBeVisible();
});

test("the tier list links every published comp", async ({ page }) => {
  await page.goto("/comps");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tier list");
  expect(await page.locator('a[href^="/comps/"]').count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator('a[href="/comps/riftbeast-brambleback"]').first()).toBeVisible();
});

test("a comp page renders its board and opens in the teambuilder", async ({ page }) => {
  await page.goto("/comps/riftbeast-brambleback");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Riftbeast Brambleback");

  const open = page.getByRole("link", { name: /Open in the teambuilder/i });
  await expect(open).toBeVisible();
  await expect(open).toHaveAttribute("href", /^\/teambuilder\?b=/);

  await open.click();

  await expect(page).toHaveURL(/\/teambuilder\?b=/);
  // The link is meant to arrive with the comp's board already laid out.
  await expect(page.getByText(/\d+ of 28 hexes filled/)).not.toContainText("0 of 28 hexes filled");
});

test("the patch read and the tier list maker load", async ({ page }) => {
  await page.goto("/patch/18.6");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/tier-lists");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tier list maker");
});

test("health answers with its documented shape", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());

  const body = await response.json();
  expect(["ok", "empty", "down"]).toContain(body.status);
  expect(typeof body.checkedAt).toBe("string");
  expect(body.database).toMatchObject({
    configured: expect.any(Boolean),
    reachable: expect.any(Boolean),
    driver: expect.stringMatching(/^(http|tcp)$/),
  });

  // This suite runs the server without a database on purpose, so the honest
  // answer is 503 "down" with no corpus — not a 200 claiming data.
  if (!body.database.configured) {
    expect(body.status).toBe("down");
    expect(response.status()).toBe(503);
    expect(body.corpus).toBeNull();
  }

  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("an unknown comp is a 404", async ({ page }) => {
  const response = await page.goto("/comps/this-comp-does-not-exist");
  expect(response?.status()).toBe(404);
});
