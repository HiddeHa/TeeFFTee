import assert from "node:assert/strict";
import test from "node:test";

import { wilsonLowerBound } from "../src/lib/confidence";

/**
 * The tier list sorts on this number, so it is pinned to reference values from
 * the Wilson formula at z = 1.96. Changing the z, the clamping or the algebra
 * moves every ordering on the site and fails here.
 */

const CASES: [successes: number, total: number, expected: number][] = [
  [120, 200, 0.530835],
  [60, 100, 0.502001],
  [5, 5, 0.565509],
  [12, 20, 0.386578],
  [3, 10, 0.107789],
  [500, 1000, 0.469069],
  [50, 50, 0.92865],
  [0, 50, 0],
];

for (const [successes, total, expected] of CASES) {
  test(`wilson lower bound of ${successes}/${total} is ${expected}`, () => {
    assert.ok(Math.abs(wilsonLowerBound(successes, total) - expected) < 5e-6);
  });
}

test("a tiny sample has a lower bound far below its raw rate", () => {
  // 1 win in 1,000 is a 0.1% raw rate, but the bound rightly says "unproven".
  assert.ok(wilsonLowerBound(1, 1000) < 0.001);
});

test("with the rate fixed, more games means a higher bound", () => {
  const small = wilsonLowerBound(50, 100);
  const medium = wilsonLowerBound(500, 1000);
  const large = wilsonLowerBound(5000, 10000);

  assert.ok(small < medium, `${small} should be below ${medium}`);
  assert.ok(medium < large, `${medium} should be below ${large}`);
});

test("empty, negative and impossible samples are clamped, not extrapolated", () => {
  assert.equal(wilsonLowerBound(0, 0), 0);
  assert.equal(wilsonLowerBound(10, 0), 0);
  assert.equal(wilsonLowerBound(-5, 50), 0);
  // More successes than games cannot produce a bound above the honest 100% case.
  assert.equal(wilsonLowerBound(200, 100), wilsonLowerBound(100, 100));
});

test("the bound is a probability and a wider z widens the interval", () => {
  for (const [successes, total] of CASES) {
    const value = wilsonLowerBound(successes, total);
    assert.ok(value >= 0 && value <= 1, `${successes}/${total} gave ${value}`);
  }

  assert.ok(wilsonLowerBound(60, 100, 2.58) < wilsonLowerBound(60, 100, 1.0));
});
