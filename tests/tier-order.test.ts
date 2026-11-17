import assert from "node:assert/strict";
import test from "node:test";

import type { CompStats, Tier } from "../src/content/types";
import { sortByTierThenConfidence, TIER_ORDER, type CompListItem } from "../src/lib/data";

/**
 * The tier list's ordering. Editorially it is tier first, then the Wilson lower
 * bound — never the raw top-4 rate — then name. A change to any of those shifts
 * every list page at once, so the order is asserted with a deliberately
 * contradictory sample: the higher raw rate loses to the higher confidence.
 */

function item(name: string, tier: Tier, top4CiLow: number | null): CompListItem {
  const visibleStats =
    top4CiLow === null ? null : ({ top4CiLow } as CompStats);
  return { name, tier, visibleStats } as unknown as CompListItem;
}

const names = (items: CompListItem[]) => items.map((entry) => entry.name);

test("the editorial tier order is fixed", () => {
  assert.deepEqual(TIER_ORDER, ["S", "A", "B", "C"]);
});

test("tier beats confidence", () => {
  const sorted = [
    item("A-best", "A", 0.9),
    item("S-worst", "S", 0.01),
  ].sort(sortByTierThenConfidence);

  assert.deepEqual(names(sorted), ["S-worst", "A-best"]);
});

test("inside a tier, the Wilson bound decides", () => {
  const sorted = [
    item("lower", "A", 0.31),
    item("higher", "A", 0.52),
  ].sort(sortByTierThenConfidence);

  assert.deepEqual(names(sorted), ["higher", "lower"]);
});

test("a comp with no sample sorts behind a measured one in its tier", () => {
  const sorted = [
    item("unmeasured", "B", null),
    item("measured", "B", 0.2),
  ].sort(sortByTierThenConfidence);

  assert.deepEqual(names(sorted), ["measured", "unmeasured"]);
});

test("equal confidence breaks on name, so the order is stable", () => {
  const sorted = [
    item("Zeta", "C", 0.2),
    item("Alpha", "C", 0.2),
  ].sort(sortByTierThenConfidence);

  assert.deepEqual(names(sorted), ["Alpha", "Zeta"]);
});
