import assert from "node:assert/strict";
import test from "node:test";

import {
  DATA_STALE_MINUTES,
  aggregationAgeMinutes,
  isStaleAge,
  unclassifiedShare,
} from "../src/lib/data-health";

test("the unclassified share is the remainder after classified boards", () => {
  assert.equal(unclassifiedShare(120, 90), 0.25);
  assert.equal(unclassifiedShare(500, 500), 0);
  assert.equal(unclassifiedShare(0, 0), 0);
});

test("aggregation age is whole minutes since the timestamp", () => {
  const now = new Date("2026-11-16T12:30:00Z");

  assert.equal(aggregationAgeMinutes("2026-11-16T10:00:00Z", now), 150);
  assert.equal(aggregationAgeMinutes("2026-11-16T12:30:00Z", now), 0);
  assert.equal(aggregationAgeMinutes(null, now), null);
  assert.equal(aggregationAgeMinutes("not a date", now), null);
});

test("a snapshot is stale only past the aggregation interval", () => {
  assert.equal(DATA_STALE_MINUTES, 120);
  assert.equal(isStaleAge(30), false);
  assert.equal(isStaleAge(120), false);
  assert.equal(isStaleAge(121), true);
  assert.equal(isStaleAge(null), false);
});
