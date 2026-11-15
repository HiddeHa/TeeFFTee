import { expect, test } from "@playwright/test";

import { championTile, hex, progress, waitForBuilder } from "./builder";

/**
 * The teambuilder, driven the way a player drives it.
 *
 * These cover the two defects the page actually shipped with: a champion that
 * was placed off-screen (so the click looked like it did nothing), and summons
 * posing as 1-cost champions. Both are asserted as behaviour — a hex in the
 * viewport, a pool of real champions — rather than as markup.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/teambuilder");
  await waitForBuilder(page);
  await expect(progress(page)).toContainText("0 of 28 hexes filled");
});

test("a champion dropped from the pool fills a hex you can see", async ({ page }) => {
  await championTile(page, "Akali").click();

  await expect(progress(page)).toContainText("1 of 28 hexes filled");
  await expect(hex(page, 0)).toHaveAttribute("aria-label", "Akali — 1 star — 0 of 3 items");
  // The regression: the unit used to land on a board that had scrolled away.
  await expect(hex(page, 0)).toBeInViewport();
});

test("champions fill the front line in order", async ({ page }) => {
  await championTile(page, "Akali").click();
  await championTile(page, "Leona").click();

  await expect(progress(page)).toContainText("2 of 28 hexes filled");
  await expect(hex(page, 0)).toHaveAttribute("aria-label", /^Akali — 1 star/);
  await expect(hex(page, 1)).toHaveAttribute("aria-label", /^Leona — 1 star/);
  await expect(hex(page, 2)).toHaveAttribute("aria-label", "Empty hex");
});

test("a selected hex is where the next champion lands", async ({ page }) => {
  await hex(page, 10).click();
  await expect(hex(page, 10)).toHaveAttribute("aria-pressed", "true");

  await championTile(page, "Camille").click();

  await expect(hex(page, 10)).toHaveAttribute("aria-label", /^Camille — 1 star/);
  await expect(hex(page, 0)).toHaveAttribute("aria-label", "Empty hex");
});

test("the board survives a reload through the URL", async ({ page }) => {
  await championTile(page, "Akali").click();
  await championTile(page, "Leona").click();
  await expect(page).toHaveURL(/\/teambuilder\?b=0:DA_18_Akali_AD:1:;1:DA_18_Leona:1:/);

  await page.reload();

  await expect(progress(page)).toContainText("2 of 28 hexes filled");
  await expect(hex(page, 0)).toHaveAttribute("aria-label", /^Akali — 1 star/);
  await expect(hex(page, 1)).toHaveAttribute("aria-label", /^Leona — 1 star/);
});

test("the 1-cost filter offers champions, not summons", async ({ page }) => {
  await page.getByRole("button", { name: "1c", exact: true }).click();

  // Set 18 ships fourteen champions at 1 cost.
  await expect(page.locator('button[title$="· 1 cost"]')).toHaveCount(14);

  // Summons, PvE monsters and the loot anvils arrive from Community Dragon with
  // cost 1 and no traits; none of them is for sale in the shop.
  for (const notAChampion of [
    "Golem",
    "Krug",
    "Murk Wolf",
    "Murkwolf",
    "Razorbeak",
    "Rift Herald",
    "Rift Scuttler",
    "Training Dummy",
    "Voidspawn",
    "Elder Dragon",
  ]) {
    await expect(page.locator(`button[title="${notAChampion} · 1 cost"]`)).toHaveCount(0);
  }

  await expect(page.locator('button[title="Akali · 1 cost"]')).toBeVisible();
});

test("items: three per champion, and never the same one twice", async ({ page }) => {
  await championTile(page, "Akali").click();
  const akali = hex(page, 0);

  // An equipped item is also a button — on the champion, to take it off again —
  // so the palette has to be addressed by its own card.
  const palette = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Items", exact: true }) });

  const equip = async (item: string) => {
    await palette.getByRole("button", { name: item, exact: true }).click();
    await expect(page.getByText(`Put ${item} on a champion`)).toBeVisible();
    await akali.click();
    // Drop the brush, so the next pick is a new choice rather than a toggle-off.
    await page.getByRole("button", { name: "Done", exact: true }).click();
  };

  await equip("Infinity Edge");
  await expect(akali).toHaveAttribute("aria-label", "Akali — 1 star — 1 of 3 items");

  // The same item cannot be stacked on one champion.
  await equip("Infinity Edge");
  await expect(akali).toHaveAttribute("aria-label", "Akali — 1 star — 1 of 3 items");

  await equip("Blue Buff");
  await equip("Rabadon's Deathcap");
  await expect(akali).toHaveAttribute("aria-label", "Akali — 1 star — 3 of 3 items");

  // A fourth item is refused.
  await palette.getByRole("button", { name: "Bloodthirster", exact: true }).click();
  await akali.click();
  await expect(akali).toHaveAttribute("aria-label", "Akali — 1 star — 3 of 3 items");
});

test("a champion can be taken off, and the board cleared", async ({ page }) => {
  await championTile(page, "Akali").click();
  await championTile(page, "Leona").click();
  await expect(progress(page)).toContainText("2 of 28 hexes filled");

  await hex(page, 0).click();
  await page.getByRole("button", { name: "Remove champion" }).click();
  await expect(progress(page)).toContainText("1 of 28 hexes filled");
  await expect(hex(page, 0)).toHaveAttribute("aria-label", "Empty hex");

  await page.getByRole("button", { name: "Clear board" }).click();
  await expect(progress(page)).toContainText("0 of 28 hexes filled");
});

test("star levels travel with the champion", async ({ page }) => {
  await championTile(page, "Leona").click();
  await hex(page, 0).click();
  await page.getByRole("button", { name: "Set 3 star" }).click();

  await expect(hex(page, 0)).toHaveAttribute("aria-label", "Leona — 3 star — 0 of 3 items");
  await expect(page).toHaveURL(/b=0:DA_18_Leona:3:/);
});

test("a broken share link renders what it can parse", async ({ page }) => {
  // Out-of-range hex, an id with spaces: both are dropped, not repaired.
  await page.goto("/teambuilder?b=99:DA_18_Akali_AD:1:;2:not%20a%20unit!:1:");
  await expect(progress(page)).toContainText("0 of 28 hexes filled");

  // Duplicate items collapse and the list is capped at three.
  await page.goto(
    "/teambuilder?b=3:DA_18_Kobuko:2:TFT_Item_BlueBuff,TFT_Item_BlueBuff,TFT_Item_InfinityEdge,TFT_Item_RabadonsDeathcap",
  );
  await expect(progress(page)).toContainText("1 of 28 hexes filled");
  await expect(hex(page, 3)).toHaveAttribute("aria-label", "Kobuko — 2 star — 3 of 3 items");
});

test("the board is the game's four rows of seven", async ({ page }) => {
  await expect(page.locator("[data-hex]")).toHaveCount(28);

  const perRow = await page.evaluate(() => {
    const counts = new Map<number, number>();
    for (const node of document.querySelectorAll("[data-hex]")) {
      const top = Math.round(node.getBoundingClientRect().top);
      counts.set(top, (counts.get(top) ?? 0) + 1);
    }
    return [...counts.values()];
  });

  expect(perRow).toEqual([7, 7, 7, 7]);
  // Captioned the way it is played: front line nearest the enemy, at the top.
  await expect(page.getByText("Front line", { exact: true })).toBeVisible();
  await expect(page.getByText("28 hexes", { exact: true })).toBeVisible();
});

test("a champion can be dragged from the pool onto a chosen hex", async ({ page }) => {
  await championTile(page, "Akali").dragTo(hex(page, 9));

  await expect(hex(page, 9)).toHaveAttribute("aria-label", "Akali — 1 star — 0 of 3 items");
  await expect(hex(page, 0)).toHaveAttribute("aria-label", "Empty hex");
  await expect(progress(page)).toContainText("1 of 28 hexes filled");
});

test("a placed champion drags to another hex, star level and all", async ({ page }) => {
  await championTile(page, "Akali").click();
  await hex(page, 0).click();
  await page.getByRole("button", { name: "Set 2 star" }).click();

  await hex(page, 0).dragTo(hex(page, 12));

  await expect(hex(page, 12)).toHaveAttribute("aria-label", "Akali — 2 star — 0 of 3 items");
  await expect(hex(page, 0)).toHaveAttribute("aria-label", "Empty hex");
  await expect(progress(page)).toContainText("1 of 28 hexes filled");
});

test("dragging one champion onto another swaps them", async ({ page }) => {
  await championTile(page, "Akali").click();
  await championTile(page, "Leona").click();

  await hex(page, 0).dragTo(hex(page, 1));

  await expect(hex(page, 0)).toHaveAttribute("aria-label", /^Leona — 1 star/);
  await expect(hex(page, 1)).toHaveAttribute("aria-label", /^Akali — 1 star/);
  await expect(progress(page)).toContainText("2 of 28 hexes filled");
});

test("a pool champion dropped on an occupied hex leaves it alone", async ({ page }) => {
  await championTile(page, "Akali").click();

  await championTile(page, "Leona").dragTo(hex(page, 0));

  // Replacing a champion would throw away its star level and items without a word.
  await expect(hex(page, 0)).toHaveAttribute("aria-label", /^Akali — 1 star/);
  await expect(progress(page)).toContainText("1 of 28 hexes filled");
});

test("a click from a scrolled pool leaves the unit visible and the page still", async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 600));

  const tile = championTile(page, "Yorick");
  await tile.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => Math.round(window.scrollY));

  await tile.click();

  await expect(progress(page)).toContainText("1 of 28 hexes filled");
  await expect(hex(page, 0)).toHaveAttribute("aria-label", /^Yorick — 1 star/);
  // The board is pinned beside the pool, so the drop is visible without the page
  // jumping to it — the failure mode that made placements look ignored.
  await expect(hex(page, 0)).toBeInViewport();
  const after = await page.evaluate(() => Math.round(window.scrollY));
  expect(Math.abs(after - before)).toBeLessThanOrEqual(5);
});
