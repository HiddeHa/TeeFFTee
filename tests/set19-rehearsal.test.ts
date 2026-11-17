import assert from "node:assert/strict";
import test from "node:test";

import { resolveComps } from "../worker/rehearsal/resolve";
import type { RehearsalComp } from "../worker/rehearsal/set19-comps";

const comps: RehearsalComp[] = [
  {
    slug: "rehearsal-a",
    name: "Rehearsal A",
    core: ["Ahri", "Akali (K|DA)"],
    trait: "K|DA",
    why: "test",
  },
];

const units = [
  { id: "DA_19_Ahri", name: "Ahri" },
  { id: "DA_19_AkaliKDA", name: "Akali (K|DA)" },
];
const traits = [{ id: "DA_19_KDA", name: "K|DA" }];

test("a rehearsal comp resolves champion and trait names to catalogue ids", () => {
  const { resolved, missing, duplicateSlugs } = resolveComps(comps, units, traits);

  assert.deepEqual(missing, []);
  assert.deepEqual(duplicateSlugs, []);
  assert.equal(resolved.length, 1);
  assert.deepEqual(resolved[0]?.coreIds, ["DA_19_Ahri", "DA_19_AkaliKDA"]);
  assert.equal(resolved[0]?.traitId, "DA_19_KDA");
});

test("an unknown champion is reported with its comp, not silently dropped", () => {
  const unknown: RehearsalComp[] = [
    { ...comps[0]!, core: ["Ahri", "Not A Champion"] },
  ];

  const { missing, resolved } = resolveComps(unknown, units, traits);

  assert.ok(missing.some((line) => line.includes('champion "Not A Champion"')));
  assert.deepEqual(resolved[0]?.coreIds, ["DA_19_Ahri"]);
});

test("an unknown trait is reported separately from the champions", () => {
  const unknown: RehearsalComp[] = [{ ...comps[0]!, trait: "Not A Trait" }];

  const { missing, resolved } = resolveComps(unknown, units, traits);

  assert.ok(missing.some((line) => line.includes('trait "Not A Trait"')));
  assert.equal(resolved[0]?.traitId, null);
});

test("duplicate rehearsal slugs are reported", () => {
  const duplicated = [comps[0]!, comps[0]!];

  const { duplicateSlugs } = resolveComps(duplicated, units, traits);

  assert.deepEqual(duplicateSlugs, ["rehearsal-a"]);
});
