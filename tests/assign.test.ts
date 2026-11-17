import assert from "node:assert/strict";
import test from "node:test";

import { assignBoard, type CompSignature } from "../worker/assign";
import { config } from "../worker/config";

/**
 * Board → comp assignment is the label every number on the site hangs from, so
 * the threshold boundary and the tie-breaks are asserted exactly rather than via
 * a round-trip through the database.
 */

const THRESHOLD = 0.6;

function comp(overrides: Partial<CompSignature> & { slug: string }): CompSignature {
  return {
    compId: `id-${overrides.slug}`,
    setName: 18,
    coreUnits: ["u1", "u2", "u3", "u4", "u5"],
    definingTrait: null,
    ...overrides,
  };
}

test("the shipped assignment threshold is the methodology's 60%", () => {
  // A silent change here would relabel every crawled board. It is a published
  // number on the methodology page, not an implementation detail.
  assert.equal(config.assignThreshold, 0.6);
});

test("a board qualifies at exactly the threshold, not one unit below", () => {
  const candidate = comp({ slug: "exact" });

  const atThreshold = assignBoard({ units: ["u1", "u2", "u3"], traits: [], placement: 1 }, [candidate], THRESHOLD);
  assert.deepEqual(atThreshold, { compId: "id-exact", score: 0.6 });

  const below = assignBoard({ units: ["u1", "u2"], traits: [], placement: 1 }, [candidate], THRESHOLD);
  assert.deepEqual(below, { compId: null, reason: "below-threshold" });

  // The same board fails once the threshold moves above its score: the boundary
  // is the threshold, not a hidden epsilon.
  const raised = assignBoard(
    { units: ["u1", "u2", "u3"], traits: [], placement: 1 },
    [candidate],
    THRESHOLD + 0.01,
  );
  assert.deepEqual(raised, { compId: null, reason: "below-threshold" });
});

test("an active defining trait is required, and a missing one is reported as such", () => {
  const gated = comp({ slug: "gated", definingTrait: "Trait_Gate" });

  const missing = assignBoard({ units: ["u1", "u2", "u3"], traits: ["Trait_Other"], placement: 2 }, [gated], THRESHOLD);
  assert.deepEqual(missing, { compId: null, reason: "trait-missing" });

  const present = assignBoard({ units: ["u1", "u2", "u3"], traits: ["Trait_Gate"], placement: 2 }, [gated], THRESHOLD);
  assert.deepEqual(present, { compId: "id-gated", score: 0.6 });
});

test("a gate miss does not veto a different comp that does qualify", () => {
  const gated = comp({ slug: "gated", definingTrait: "Trait_Gate" });
  const open = comp({ slug: "open", coreUnits: ["u1", "u2"], definingTrait: null });

  const assignment = assignBoard({ units: ["u1", "u2"], traits: [], placement: 3 }, [gated, open], THRESHOLD);
  assert.deepEqual(assignment, { compId: "id-open", score: 1 });
});

test("equal scores go to the comp with more core units", () => {
  const loose = comp({ slug: "loose", coreUnits: ["u1"] });
  const specific = comp({ slug: "specific", coreUnits: ["u1", "u2"] });

  const assignment = assignBoard({ units: ["u1", "u2", "u9"], traits: [], placement: 1 }, [loose, specific], THRESHOLD);
  assert.deepEqual(assignment, { compId: "id-specific", score: 1 });
});

test("remaining ties break on slug, so the result is stable across runs", () => {
  const beta = comp({ slug: "beta", coreUnits: ["u1", "u2"] });
  const alpha = comp({ slug: "alpha", coreUnits: ["u2", "u1"] });

  // Both score 1 and have the same core size; declaration order must not decide.
  const assignment = assignBoard({ units: ["u1", "u2"], traits: [], placement: 1 }, [beta, alpha], THRESHOLD);
  assert.deepEqual(assignment, { compId: "id-alpha", score: 1 });
});

test("no comps and empty cores are reported, never guessed", () => {
  assert.deepEqual(
    assignBoard({ units: ["u1"], traits: [], placement: 1 }, [], THRESHOLD),
    { compId: null, reason: "no-comps" },
  );

  const empty = comp({ slug: "empty", coreUnits: [] });
  assert.deepEqual(
    assignBoard({ units: ["u1"], traits: [], placement: 1 }, [empty], THRESHOLD),
    { compId: null, reason: "below-threshold" },
  );
});
