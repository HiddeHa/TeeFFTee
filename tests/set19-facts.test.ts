import assert from "node:assert/strict";
import test from "node:test";

import {
  set19CostCurve,
  set19PrismaticTraits,
  set19Traits,
  set19UniqueTraits,
  set19UnlockQuests,
  set19Units,
  set19Unlocks,
} from "../src/content/set-19";
import { set19FactProblems, type Set19Facts } from "../src/lib/set19-invariants";

function realFacts(): Set19Facts {
  return {
    units: set19Units,
    costCurve: set19CostCurve,
    traits: set19Traits,
    uniqueTraits: set19UniqueTraits,
    prismaticTraits: set19PrismaticTraits,
    quests: set19UnlockQuests,
    cards: set19Unlocks,
  };
}

/** A minimal facts object that passes, so each test can break one thing. */
function validFacts(): Set19Facts {
  const units = Array.from({ length: 94 }, (_, index) => ({
    name: `Unit ${index}`,
    cost: 1,
    traits: ["Trait 1"],
  }));
  // Every unit carries Trait 1, so its champion string has to list them all —
  // the trait string and the roster are compared in both directions.
  const traitOneChampions = units.map((unit) => `${unit.name} ${unit.cost}`).join(", ");

  return {
    units,
    costCurve: [{ cost: "1-cost", count: 94 }],
    traits: [
      { name: "Trait 1", champions: traitOneChampions, prismatic: true },
      ...Array.from({ length: 3 }, (_, index) => ({
        name: `Trait ${index + 2}`,
        champions: "",
      })),
      ...Array.from({ length: 23 }, (_, index) => ({
        name: `Regular ${index}`,
        champions: "",
      })),
    ],
    uniqueTraits: Array.from({ length: 20 }, (_, index) => ({
      name: `Unique ${index}`,
      champions: "",
      prismatic: index < 4,
    })),
    prismaticTraits: ["Trait 1", "Unique 0", "Unique 1", "Unique 2", "Unique 3"].map((name) => ({
      name,
    })),
    quests: [{ champion: "Unit 0" }],
    cards: [{ champion: "Unit 1" }],
  };
}

test("the shipped Set 19 facts are internally consistent", () => {
  assert.deepEqual(set19FactProblems(realFacts()), []);
});

test("the test fixture is valid before anything is broken", () => {
  assert.deepEqual(set19FactProblems(validFacts()), []);
});

test("a roster that loses a champion is reported", () => {
  const facts = validFacts();
  facts.units = facts.units.slice(0, 93);

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes("93 champions")));
  assert.ok(problems.some((problem) => problem.includes("covers 94 champions but the roster holds 93")));
});

test("a cost bucket that no longer matches its units is reported", () => {
  const facts = validFacts();
  facts.costCurve = [{ cost: "1-cost", count: 95 }];

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes("sums to 95 champions")));
  assert.ok(problems.some((problem) => problem.includes("bucket says 95 champions, roster holds 94")));
});

test("a unit with no cost bucket is reported", () => {
  const facts = validFacts();
  facts.units = [...facts.units, { name: "Stray", cost: 9, traits: [] }];

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes("Stray costs 9")));
});

test("the wrong number of regular or unique traits is reported", () => {
  const facts = validFacts();
  facts.traits = facts.traits.slice(0, 26);
  facts.uniqueTraits = facts.uniqueTraits.slice(0, 19);

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes("26 regular traits")));
  assert.ok(problems.some((problem) => problem.includes("19 unique traits")));
});

test("a Prismatic flag removed from a trait is reported", () => {
  const facts = validFacts();
  facts.traits = facts.traits.map((trait) => ({ ...trait, prismatic: false }));

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes("flags 4 traits as Prismatic")));
  assert.ok(problems.some((problem) => problem.includes("does not match the flagged traits")));
});

test("a quest naming a champion outside the roster is reported", () => {
  const facts = validFacts();
  facts.quests = [{ champion: "Nobody" }];

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes('unlock quest names "Nobody"')));
});

test("a card naming a champion outside the roster is reported", () => {
  const facts = validFacts();
  facts.cards = [{ champion: "Nobody" }];

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes('unlock card names "Nobody"')));
});

test('a bare "Akali" card matches the variant roster entries', () => {
  const facts = validFacts();
  facts.units = facts.units.map((unit, index) =>
    index === 0 ? { ...unit, name: "Akali (K|DA)" } : unit,
  );
  facts.traits = facts.traits.map((trait, index) =>
    index === 0
      ? { ...trait, champions: trait.champions.replace("Unit 0 1", "Akali (K|DA) 1") }
      : trait,
  );
  facts.quests = [{ champion: "Akali" }];
  facts.cards = [{ champion: "Akali" }];

  assert.deepEqual(set19FactProblems(facts), []);
});

test("two champion names that collapse to one page slug are reported", () => {
  const facts = validFacts();
  facts.units = facts.units.map((unit, index) =>
    index === 1 ? { ...unit, name: "Unit-0" } : unit,
  );

  const problems = set19FactProblems(facts);
  assert.ok(
    problems.some((problem) =>
      problem.includes('share the slug "unit-0"'),
    ),
  );
});

test("a trait string that omits a champion the roster gives it is reported", () => {
  const facts = validFacts();
  facts.traits = facts.traits.map((trait, index) =>
    index === 0
      ? { ...trait, champions: trait.champions.replace("Unit 0 1, ", "") }
      : trait,
  );

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes('does not list Unit 0')));
});

test("a trait string naming a champion outside the roster is reported", () => {
  const facts = validFacts();
  facts.traits = facts.traits.map((trait, index) =>
    index === 0 ? { ...trait, champions: `${trait.champions}, Ghost 1` } : trait,
  );

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes('names "Ghost"')));
});

test("a trait string that puts a champion at the wrong cost is reported", () => {
  const facts = validFacts();
  facts.traits = facts.traits.map((trait, index) =>
    index === 0
      ? { ...trait, champions: trait.champions.replace("Unit 1 1,", "Unit 1 2,") }
      : trait,
  );

  const problems = set19FactProblems(facts);
  assert.ok(
    problems.some(
      (problem) => problem.includes("lists Unit 1 at 2-cost") && problem.includes("roster says 1"),
    ),
  );
});

test("a trait string that lists the same champion twice is reported", () => {
  const facts = validFacts();
  facts.traits = facts.traits.map((trait, index) =>
    index === 0 ? { ...trait, champions: `${trait.champions}, Unit 0 1` } : trait,
  );

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes("lists Unit 0 twice")));
});

test("a unit carrying a trait that is not listed is reported", () => {
  const facts = validFacts();
  facts.units = facts.units.map((unit, index) =>
    index === 0 ? { ...unit, traits: ["Ghost Trait"] } : unit,
  );

  const problems = set19FactProblems(facts);
  assert.ok(problems.some((problem) => problem.includes('carries "Ghost Trait"')));
});
