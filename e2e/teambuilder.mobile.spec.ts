import { expect, test } from "@playwright/test";

import { championTile, hex, progress, waitForBuilder } from "./builder";

/**
 * The teambuilder below `lg`, where the board stacks above the pools instead of
 * sitting beside them. A placement there is off-screen by default, so the page
 * scrolls the hex it landed on into view — that reveal is the behaviour under
 * test, not the styling.
 */

test("a champion placed from the pool is scrolled into view", async ({ page }) => {
  await page.goto("/teambuilder");
  await waitForBuilder(page);

  const tile = championTile(page, "Elise");
  await tile.scrollIntoViewIfNeeded();
  await tile.click();

  await expect(progress(page)).toContainText("1 of 28 hexes filled");
  const placed = hex(page, 0);
  await expect(placed).toHaveAttribute("aria-label", /^Elise — 1 star/);
  await expect(placed).toBeInViewport();
});

test("the board and the pools still fit one column", async ({ page }) => {
  await page.goto("/teambuilder");
  await waitForBuilder(page);

  const board = page.getByRole("heading", { name: "Your board" });
  const champions = page.getByRole("heading", { name: "Champions" });

  const boardBox = await board.boundingBox();
  const championsBox = await champions.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(championsBox).not.toBeNull();

  // Stacked, not side by side: the pool starts below the board and shares its
  // left edge.
  expect(championsBox!.y).toBeGreaterThan(boardBox!.y);
  expect(Math.abs(championsBox!.x - boardBox!.x)).toBeLessThanOrEqual(2);
});
