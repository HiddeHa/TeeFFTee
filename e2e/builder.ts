import { expect, type Page } from "@playwright/test";

/**
 * Locators and waits for the teambuilder, shared by the desktop and mobile specs.
 *
 * The page is server-rendered in full, so every tile exists before React has
 * taken over — a click during that window changes nothing and a test would sit
 * there blaming the app. `waitForBuilder` waits for a *visible state change*
 * instead of a timer.
 */

/** The progress line, e.g. "2 of 28 hexes filled · 3 items per champion". */
export function progress(page: Page) {
  return page.getByText(/\d+ of 28 hexes filled/);
}

/** One board hex, by index: 0 is the leftmost front-line hex. */
export function hex(page: Page, index: number) {
  return page.locator(`[data-hex="${index}"]`);
}

/** A champion tile in the pool. Exact, so hexes named after champions never match. */
export function championTile(page: Page, name: string) {
  return page.getByRole("button", { name, exact: true });
}

/** Champion tiles carry `"<name> · <cost label>"`; board hexes do not end in "cost". */
export function championTiles(page: Page) {
  return page.locator('button[title$=" cost"]');
}

/**
 * Wait until the builder answers clicks.
 *
 * Filtering by cost is the cheapest state change that is visible in the DOM, so
 * it doubles as an "is React running yet" probe. Afterwards the pool is back on
 * "All" and every champion is available to the test that follows.
 */
export async function waitForBuilder(page: Page) {
  const tiles = championTiles(page);
  const twoCost = page.getByRole("button", { name: "2c", exact: true });

  await expect(async () => {
    await twoCost.click();
    await expect(tiles.first()).toHaveAttribute("title", /· 2 cost$/);
  }).toPass({ timeout: 30_000 });

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(tiles.first()).toHaveAttribute("title", /· 1 cost$/);
}
