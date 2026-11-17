import assert from "node:assert/strict";
import test from "node:test";

import { mineCores, pruneRedundant, type Board, type CoreStats } from "../worker/candidates";

/**
 * The core miner is the evidence behind curated comps. Its rules — support
 * before reporting, maximal cores rather than every subset — are the part that
 * changes the output most, so they are asserted directly.
 */

function board(units: string[], placement = 1): Board {
  return { matchId: "m", puuid: "p", placement, units, traits: [] };
}

function core(units: string[], games: number): CoreStats {
  return { units, games, placeSum: games * 4, top4: games, wins: 0 };
}

function keys(cores: CoreStats[]): string[] {
  return cores.map((entry) => entry.units.join("+")).sort();
}

test("only cores at or above the support threshold are mined", () => {
  const boards = [
    board(["A", "B", "C"]),
    board(["A", "B", "C"]),
    board(["A", "B", "C"]),
    board(["A", "B"]),
    board(["A", "B"]),
    board(["A", "B", "D"]),
  ];


  const mined = mineCores(boards, { minGames: 3, maxCore: 3 });
  const byKey = new Map(mined.map((entry) => [entry.units.join("+"), entry]));

  // A+B appears on all six boards, A+B+C on three. A+C and B+C also appear on
  // the three full boards, but A+B+C covers all of them, so they are pruned as
  // redundant subsets.
  assert.deepEqual(keys(mined), ["A+B", "A+B+C"]);
  assert.equal(byKey.get("A+B")?.games, 6);
  assert.equal(byKey.get("A+B+C")?.games, 3);

  // A singleton never becomes a core; D appears once and is below support.
  assert.equal(byKey.has("A"), false);
  assert.equal(byKey.has("A+B+D"), false);
});

test("the absorb share decides whether a subset survives", () => {
  const boards = [
    ...Array.from({ length: 3 }, () => board(["A", "B", "C"])),
    ...Array.from({ length: 2 }, () => board(["A", "B"])),
  ];

  // A+B has 5 boards and A+B+C covers 3 of them (60%), so the default 90% keeps
  // it; a looser 50% absorbs it.
  assert.deepEqual(keys(mineCores(boards, { minGames: 3, maxCore: 3 })), ["A+B", "A+B+C"]);
  assert.deepEqual(keys(mineCores(boards, { minGames: 3, maxCore: 3, absorbShare: 0.5 })), [
    "A+B+C",
  ]);
});

test("a chain of supersets collapses to its largest core in one pass", () => {
  const candidates = [core(["A", "B"], 100), core(["A", "B", "C"], 95), core(["A", "B", "C", "D"], 90)];

  // {A,B} is absorbed by {A,B,C} (95%), which is itself absorbed by {A,B,C,D}
  // (90/95). An absorbed superset must still absorb.
  assert.deepEqual(keys(pruneRedundant(candidates, ["A", "B", "C", "D"])), ["A+B+C+D"]);
});

test("maxCore caps the mined size", () => {
  const boards = [
    board(["A", "B", "C"]),
    board(["A", "B", "C"]),
    board(["A", "B", "C"]),
  ];

  assert.deepEqual(keys(mineCores(boards, { minGames: 3, maxCore: 2 })), ["A+B", "A+C", "B+C"]);
});

test("unit order and duplicates do not change a core's identity", () => {
  const boards = [
    board(["B", "A", "C", "A"]),
    board(["C", "B", "A"]),
    board(["A", "C", "B"]),
  ];

  const mined = mineCores(boards, { minGames: 3, maxCore: 3 });
  assert.deepEqual(keys(mined), ["A+B+C"]);

  const trio = mined[0];
  assert.deepEqual(trio?.units, ["A", "B", "C"]);
  assert.equal(trio?.games, 3);
});

test("boards with fewer than two units contribute nothing", () => {
  const boards = [board(["A"]), board(["A"]), board(["A"]), board([])];

  assert.deepEqual(mineCores(boards, { minGames: 2, maxCore: 3 }), []);
});

test("support is counted per board, and placement sums travel with the core", () => {
  const boards = [board(["A", "B"], 1), board(["A", "B"], 5), board(["A", "B"], 8)];

  const [mined] = mineCores(boards, { minGames: 2, maxCore: 2 });
  // Placements 1, 5, 8: one top-four finish and one win.
  assert.deepEqual(mined, { units: ["A", "B"], games: 3, placeSum: 14, top4: 1, wins: 1 });
});
