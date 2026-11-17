import assert from "node:assert/strict";
import test from "node:test";

import { comparePatch } from "../src/lib/stats-source";

/**
 * Patch ordering decides which window movers compare against, and `18.10` is the
 * patch after `18.6` — a plain string sort puts it before, which is the bug this
 * comparator exists to prevent.
 */

test("18.10 sorts after 18.6, unlike a string compare", () => {
  assert.ok("18.10" < "18.6", "the lexicographic trap this function avoids");

  assert.ok(comparePatch("18.10", "18.6") > 0);
  assert.ok(comparePatch("18.6", "18.10") < 0);
});

test("each segment is compared as a number", () => {
  assert.ok(comparePatch("18.9", "18.10") < 0);
  assert.ok(comparePatch("19.1", "18.99") > 0);
  assert.ok(comparePatch("18.6.1", "18.6.0") > 0);
  assert.ok(comparePatch("18.6B", "18.6") > 0);
});

test("sorting a patch list puts the newest last, the order movers rely on", () => {
  const sorted = ["19.1", "18.10", "18.6", "18.9"].sort(comparePatch);

  assert.deepEqual(sorted, ["18.6", "18.9", "18.10", "19.1"]);
});

test("equal patches compare equal, so a sort is stable", () => {
  assert.equal(comparePatch("18.6", "18.6"), 0);
  assert.equal(comparePatch("18.10", "18.10"), 0);
});
