import assert from "node:assert/strict";
import test from "node:test";

import { latestComputedAt } from "../src/components/data-as-of";

/**
 * The "data as of" chip reads `computedAt` off rows that may come from more than
 * one aggregate run (a comp re-computed later, a region with a newer row). The
 * page must quote the newest one, and must quote nothing rather than a fake date
 * when there is no sample.
 */

const stats = (iso: string) => ({ computedAt: iso });

test("the newest computedAt wins, whatever order the rows arrive in", () => {
  const older = "2026-11-01T08:00:00.000Z";
  const newer = "2026-11-02T09:30:00.000Z";

  assert.equal(latestComputedAt([stats(older), stats(newer)]), newer);
  assert.equal(latestComputedAt([stats(newer), stats(older)]), newer);
});

test("missing and unreadable timestamps are ignored, not guessed at", () => {
  const newest = "2026-11-02T09:30:00.000Z";

  assert.equal(
    latestComputedAt([stats("not-a-date"), null, undefined, stats(newest), stats("")]),
    newest,
  );
});

test("no sample means no date at all", () => {
  assert.equal(latestComputedAt([]), null);
  assert.equal(latestComputedAt([null, undefined]), null);
});
