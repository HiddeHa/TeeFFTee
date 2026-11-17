import assert from "node:assert/strict";
import test from "node:test";

import type { CompStats } from "../src/content/types";
import { buildMovers, MOVER_MIN_GAMES, type CompMover } from "../src/lib/movers";

/**
 * Movers compare two measured windows. The rules that keep a patch page honest —
 * minimum sample in *both* patches, top-4 rate rather than average placement, no
 * entry when one side is missing — are pure and cheap to pin here.
 */

function stats(top4Rate: number, games: number): CompStats {
  return {
    patch: "18.6",
    region: "all",
    rankBucket: "master+",
    games,
    avgPlace: 4.5,
    top4Rate,
    winRate: 0.1,
    pickRate: 0.2,
    top4CiLow: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  };
}

const NAMES = new Map([
  ["riser", "Riser"],
  ["faller", "Faller"],
  ["flat", "Flat"],
  ["small", "Small Sample"],
]);

function deltas(movers: CompMover[]): [string, number][] {
  return movers.map((entry) => [entry.compSlug, entry.delta]);
}

test("risers and fallers are ranked on top-4 rate", () => {
  const result = buildMovers({
    patch: "18.6",
    previousPatch: "18.5",
    current: new Map([
      ["riser", stats(0.65, 300)],
      ["faller", stats(0.44, 300)],
      ["flat", stats(0.5, 300)],
    ]),
    previous: new Map([
      ["riser", stats(0.45, 300)],
      ["faller", stats(0.5, 300)],
      ["flat", stats(0.5, 300)],
    ]),
    names: NAMES,
  });

  assert.deepEqual(deltas(result.risers).map(([slug]) => slug), ["riser"]);
  assert.deepEqual(deltas(result.fallers).map(([slug]) => slug), ["faller"]);
  // Floating point: 0.65 - 0.45 is the point, to within representation error.
  assert.ok(Math.abs((result.risers[0]?.delta ?? 0) - 0.2) < 1e-9);
  assert.ok(Math.abs((result.fallers[0]?.delta ?? 0) + 0.06) < 1e-9);
  // An unchanged comp is not a mover, even though it has plenty of games.
  assert.equal(result.risers.length + result.fallers.length, 2);
  assert.deepEqual(
    [result.patch, result.previousPatch, result.rankBucket, result.region, result.minGames],
    ["18.6", "18.5", "master+", "all", MOVER_MIN_GAMES],
  );
});

test("a comp must clear the minimum in both windows", () => {
  const result = buildMovers({
    patch: "18.6",
    previousPatch: "18.5",
    current: new Map([
      ["small", stats(0.8, MOVER_MIN_GAMES)],
      ["riser", stats(0.7, MOVER_MIN_GAMES - 1)],
    ]),
    previous: new Map([
      ["small", stats(0.1, MOVER_MIN_GAMES - 1)],
      ["riser", stats(0.1, 500)],
    ]),
    names: NAMES,
  });

  assert.deepEqual(result.risers, []);
  assert.deepEqual(result.fallers, []);
});

test("entries missing on either side, or without a label, are skipped", () => {
  const result = buildMovers({
    patch: "18.6",
    previousPatch: "18.5",
    current: new Map([["unlabelled", stats(0.9, 500)]]),
    previous: new Map([["unlabelled", stats(0.1, 500)]]),
    names: NAMES,
  });
  assert.deepEqual(result.risers, []);
  // The name map is the editorial join: a slug it does not know cannot be labelled.
  assert.equal(NAMES.has("unlabelled"), false);

  const noCurrent = buildMovers({
    patch: "18.6",
    previousPatch: "18.5",
    current: new Map(),
    previous: new Map([["riser", stats(0.1, 500)]]),
    names: NAMES,
  });
  assert.deepEqual(noCurrent.fallers, []);
});

test("each side is capped, with the biggest moves first", () => {
  const names = new Map(
    Array.from({ length: 5 }, (_, index) => [`comp${index}`, `Comp ${index}`] as [string, string]),
  );
  const current = new Map(
    Array.from({ length: 5 }, (_, index) => [`comp${index}`, stats(0.5 + index * 0.05, 200)] as [string, CompStats]),
  );
  const previous = new Map(
    Array.from({ length: 5 }, (_, index) => [`comp${index}`, stats(0.5, 200)] as [string, CompStats]),
  );

  const result = buildMovers({ patch: "18.6", previousPatch: "18.5", current, previous, names, limit: 2 });
  assert.deepEqual(
    result.risers.map((entry) => entry.compSlug),
    ["comp4", "comp3"],
  );

  const all = buildMovers({ patch: "18.6", previousPatch: "18.5", current, previous, names });
  assert.equal(all.risers.length, 3);
});

test("fallers are ordered from the largest drop", () => {
  const result = buildMovers({
    patch: "18.6",
    previousPatch: "18.5",
    current: new Map([
      ["a", stats(0.4, 200)],
      ["b", stats(0.2, 200)],
    ]),
    previous: new Map([
      ["a", stats(0.5, 200)],
      ["b", stats(0.5, 200)],
    ]),
    names: new Map([
      ["a", "A"],
      ["b", "B"],
    ]),
  });

  assert.deepEqual(
    result.fallers.map((entry) => entry.compSlug),
    ["b", "a"],
  );
});
