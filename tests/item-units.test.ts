import assert from "node:assert/strict";
import test from "node:test";

import { summariseUnitItems, type UnitDetailRow } from "../worker/candidates";

/**
 * The item-unit miner: which items a unit actually held, on the boards that
 * played the core. Shares use appearances as the denominator, so a game with no
 * items lowers a share instead of being ignored.
 */

function row(unitId: string, star: number, item0: string | null, item1: string | null = null, item2: string | null = null): UnitDetailRow {
  return { unitId, star, item0, item1, item2 };
}

test("items are ranked by how often they were held, top two only", () => {
  const rows = [
    row("A", 2, "X", "Y"),
    row("A", 1, "X"),
    row("A", 3, "Y", "Z"),
  ];

  const [detail] = summariseUnitItems(rows, ["A"]);
  assert.equal(detail?.appearances, 3);
  // (2 + 1 + 3) / 3, rounded to 2dp.
  assert.equal(detail?.avgStar, 2);
  // X on 2 of 3 appearances, Y on 2 of 3; Z only once and is cut by the top two.
  assert.deepEqual(detail?.items, [
    { itemId: "X", share: 0.667 },
    { itemId: "Y", share: 0.667 },
  ]);
});

test("the denominator is appearances, including itemless boards", () => {
  const rows = [row("A", 2, "X"), row("A", 2, "X"), row("A", 2, null), row("A", 2, "Y")];

  const [detail] = summariseUnitItems(rows, ["A"]);
  assert.equal(detail?.appearances, 4);
  // Two of four appearances, not two of three item slots.
  assert.deepEqual(detail?.items, [
    { itemId: "X", share: 0.5 },
    { itemId: "Y", share: 0.25 },
  ]);
});

test("all three item slots are read, and empty slots are skipped", () => {
  const rows = [row("A", 1, "X", "Y", "Z"), row("A", 1, null, null, null)];

  const [detail] = summariseUnitItems(rows, ["A"]);
  assert.equal(detail?.appearances, 2);
  // Top two by count; the third slot is read (it ties) but cut by the limit.
  assert.deepEqual(detail?.items, [
    { itemId: "X", share: 0.5 },
    { itemId: "Y", share: 0.5 },
  ]);
});

test("a core unit with no rows keeps its place with zeros", () => {
  const rows = [row("B", 3, "X")];

  const details = summariseUnitItems(rows, ["A", "B", "C"]);
  assert.deepEqual(
    details.map((entry) => entry.unitId),
    ["A", "B", "C"],
  );
  assert.deepEqual(details[0], { unitId: "A", appearances: 0, avgStar: 0, items: [] });
  assert.equal(details[1]?.appearances, 1);
  assert.deepEqual(details[2], { unitId: "C", appearances: 0, avgStar: 0, items: [] });
});

test("star levels average over appearances, rounded to two decimals", () => {
  const rows = [row("A", 1, null), row("A", 2, null), row("A", 2, null)];

  const [detail] = summariseUnitItems(rows, ["A"]);
  assert.equal(detail?.avgStar, 1.67);
});
