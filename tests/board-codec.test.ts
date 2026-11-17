import assert from "node:assert/strict";
import test from "node:test";

import {
  BOARD_HEXES,
  decodeBoard,
  encodeBoard,
  encodeCompBoard,
  type CodedSlot,
} from "../src/lib/board-codec";
import type { BoardPosition, UnitSlot } from "../src/content/types";

/**
 * The codec is the shareable-board format: every link someone has already saved
 * is parsed by this file, so malformed input is dropped rather than repaired and
 * the encoding stays byte-stable.
 */

test("encode sorts by hex, caps items and drops unsafe ids", () => {
  const slots: CodedSlot[] = [
    { index: 8, unitId: "U_B", star: 2, items: ["I1", "I2", "I3", "I4"] },
    { index: 0, unitId: "U_A", star: 1, items: ["TFT Item", "I1", "I2", "Bad:Item"] },
  ];

  assert.equal(encodeBoard(slots), "0:U_A:1:I1,I2;8:U_B:2:I1,I2,I3");
});

test("decode reads a link, deduping items and coercing stars", () => {
  const decoded = decodeBoard("0:U_A:3:I1,I1,I2;8:U_B:7:");

  assert.deepEqual(decoded, [
    { index: 0, unitId: "U_A", star: 3, items: ["I1", "I2"] },
    // Unknown star levels fall back to 1 rather than being invented.
    { index: 8, unitId: "U_B", star: 1, items: [] },
  ]);
});

test("decode drops malformed entries and never throws", () => {
  const decoded = decodeBoard(
    [
      "", // empty entry
      "not-an-index:U_A:1:", // bad hex
      "99:U_A:1:", // out of range
      "-1:U_A:1:", // negative
      "2::1:", // no unit id
      "3:Bad Unit:1:", // unsafe id
    ].join(";"),
  );

  assert.deepEqual(decoded, []);
  // An unsafe item is dropped while its unit survives: a bad item id is not a
  // reason to lose the champion holding it.
  assert.deepEqual(decodeBoard("4:U_A:1:+"), [{ index: 4, unitId: "U_A", star: 1, items: [] }]);
  assert.deepEqual(decodeBoard(undefined), []);
  assert.deepEqual(decodeBoard(""), []);
  // A repeated query parameter is still one board: the first value wins.
  assert.deepEqual(decodeBoard(["5:U_A:1:", "6:U_B:1:"]), [
    { index: 5, unitId: "U_A", star: 1, items: [] },
  ]);
});

test("a later entry for the same hex replaces the earlier one", () => {
  const decoded = decodeBoard("2:U_A:1;2:U_B:2:I1");

  assert.deepEqual(decoded, [{ index: 2, unitId: "U_B", star: 2, items: ["I1"] }]);
});

test("hex bounds are enforced against the board, not a magic number", () => {
  assert.equal(BOARD_HEXES, 28);
  assert.deepEqual(decodeBoard("27:U_A:1:", 28), [{ index: 27, unitId: "U_A", star: 1, items: [] }]);
  assert.deepEqual(decodeBoard("28:U_A:1:", 28), []);
  assert.deepEqual(decodeBoard("2:U_A:1:", 2), []);
});

test("encode and decode round-trip", () => {
  const slots: CodedSlot[] = [
    { index: 1, unitId: "U_A", star: 3, items: ["I1", "I2", "I3"] },
    { index: 14, unitId: "U_B", star: 1, items: [] },
  ];

  assert.deepEqual(decodeBoard(encodeBoard(slots)), slots);
});

test("a positioned comp keeps its authored layout", () => {
  const board: UnitSlot[] = [
    { id: "U_A", star: 2, items: ["I1"] },
    { id: "U_B", star: 1, items: [] },
    { id: "U_C", star: 3, items: [] },
  ];
  const positioning: BoardPosition[] = [
    { unitId: "U_A", row: 0, col: 0 },
    { unitId: "U_B", row: 1, col: 1 },
    // Same hex as U_A: the later unit is displaced, not dropped.
    { unitId: "U_C", row: 0, col: 0 },
  ];

  // Encoded order is by hex, so the displaced unit lands between them.
  assert.equal(encodeCompBoard(board, positioning), "0:U_A:2:I1;1:U_C:3:;8:U_B:1:");
});

test("a comp without positioning fills the front line in board order", () => {
  const board: UnitSlot[] = [
    { id: "U_A", star: 1, items: [] },
    { id: "U_B", star: 2, items: ["I1"] },
  ];

  assert.equal(encodeCompBoard(board), "0:U_A:1:;1:U_B:2:I1");
});
