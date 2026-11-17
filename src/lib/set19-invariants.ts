/**
 * Arithmetic and cross-reference checks for the Set 19 facts.
 *
 * The set's roster, traits and unlock conditions are transcribed from Riot's Dev
 * Drop as read through third-party reveal pages (see src/content/set-19.ts). A
 * transcription slip — a cost bucket that no longer adds up, a Prismatic trait
 * that lost its flag, a quest naming a champion that does not exist — renders
 * perfectly and reads as sourced fact. These checks turn those slips into
 * problems that `npm run check:content` (and therefore `prebuild`) fails on.
 *
 * Content is passed in rather than imported so the rules can be tested against
 * mutated copies.
 */

import { unitSlug } from "./set19-anchors";

export type Set19Facts = {
  units: ReadonlyArray<{ name: string; cost: number; traits: string[] }>;
  costCurve: ReadonlyArray<{ cost: string; count: number }>;
  traits: ReadonlyArray<{ name: string; champions: string; prismatic?: boolean }>;
  uniqueTraits: ReadonlyArray<{ name: string; champions: string; prismatic?: boolean }>;
  prismaticTraits: ReadonlyArray<{ name: string }>;
  quests: ReadonlyArray<{ champion: string }>;
  cards: ReadonlyArray<{ champion: string }>;
};

/**
 * "Ziggs 1, Zoe 1" → name and cost. A trailing parenthetical is commentary on
 * the reveal ("Sona 7 (inspires others)") and is not part of the name or cost.
 */
function parseChampions(champions: string): { name: string; cost: number }[] {
  return champions
    .split(/,\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const match = part.match(/^(.*?)\s+(\d+)(?:\s*\(.*\))?$/);
      return { name: match?.[1]?.trim() ?? part, cost: match ? Number(match[2]) : Number.NaN };
    });
}

const ROSTER_SIZE = 94;
const REGULAR_TRAITS = 27;
const UNIQUE_TRAITS = 20;
const PRISMATIC_TRAITS = 5;

/**
 * A card may name a champion without its variant suffix ("Akali" for both
 * "Akali (K|DA)" and "Akali (True Damage)"), so a prefix match counts.
 */
function rosterHas(units: Set19Facts["units"], champion: string): boolean {
  return units.some((unit) => unit.name === champion || unit.name.startsWith(`${champion} (`));
}

export function set19FactProblems(facts: Set19Facts): string[] {
  const problems: string[] = [];
  const { units, costCurve, traits, uniqueTraits, prismaticTraits, quests, cards } = facts;

  // The headline number every page quotes, and the one the cost curve is built on.
  if (units.length !== ROSTER_SIZE) {
    problems.push(
      `set 19 roster holds ${units.length} champions, but the Dev Drop listed ${ROSTER_SIZE}`,
    );
  }

  const curveTotal = costCurve.reduce((sum, bucket) => sum + bucket.count, 0);
  if (curveTotal !== ROSTER_SIZE) {
    problems.push(
      `set 19 cost curve sums to ${curveTotal} champions, not ${ROSTER_SIZE} ` +
        `(${costCurve.map((bucket) => `${bucket.cost} ${bucket.count}`).join(", ")})`,
    );
  }
  if (curveTotal !== units.length) {
    problems.push(
      `set 19 cost curve covers ${curveTotal} champions but the roster holds ${units.length}`,
    );
  }

  for (const bucket of costCurve) {
    const cost = Number(bucket.cost.replace(/-cost$/, ""));
    if (!Number.isFinite(cost)) {
      problems.push(`set 19 cost bucket "${bucket.cost}" is not a number-cost label`);
      continue;
    }
    const actual = units.filter((unit) => unit.cost === cost).length;
    if (actual !== bucket.count) {
      problems.push(
        `set 19 ${bucket.cost} bucket says ${bucket.count} champions, roster holds ${actual}`,
      );
    }
  }
  for (const unit of units) {
    const label = `${unit.cost}-cost`;
    if (!costCurve.some((bucket) => bucket.cost === label)) {
      problems.push(`set 19 ${unit.name} costs ${unit.cost}, which no cost bucket covers`);
    }
  }

  // 27 regular + 20 unique = the 47 traits the pages state.
  if (traits.length !== REGULAR_TRAITS) {
    problems.push(`set 19 lists ${traits.length} regular traits, expected ${REGULAR_TRAITS}`);
  }
  if (uniqueTraits.length !== UNIQUE_TRAITS) {
    problems.push(`set 19 lists ${uniqueTraits.length} unique traits, expected ${UNIQUE_TRAITS}`);
  }

  // The five Prismatic traits and their flags have to agree, in both directions:
  // a missing flag hides a tier, an extra one invents it.
  const flagged = [...traits, ...uniqueTraits]
    .filter((trait) => trait.prismatic)
    .map((trait) => trait.name)
    .sort();
  const declared = prismaticTraits.map((trait) => trait.name).sort();
  if (flagged.length !== PRISMATIC_TRAITS) {
    problems.push(
      `set 19 flags ${flagged.length} traits as Prismatic, expected ${PRISMATIC_TRAITS}` +
        (flagged.length > 0 ? ` (${flagged.join(", ")})` : ""),
    );
  }
  if (declared.join("|") !== flagged.join("|")) {
    problems.push(
      `set 19 Prismatic list (${declared.join(", ")}) does not match the flagged traits ` +
        `(${flagged.join(", ")})`,
    );
  }

  // Every champion a published quest or card names must be in the roster, or the
  // unlockables page points at a unit that does not exist.
  for (const quest of quests) {
    if (!rosterHas(units, quest.champion)) {
      problems.push(`set 19 unlock quest names "${quest.champion}", which is not in the roster`);
    }
  }
  for (const card of cards) {
    if (!rosterHas(units, card.champion)) {
      problems.push(`set 19 unlock card names "${card.champion}", which is not in the roster`);
    }
  }

  // Every unit gets an anchor and a /set-19/units/<slug> page, so two names that
  // collapse to one slug would silently give one champion the other's address.
  const bySlug = new Map<string, string[]>();
  for (const unit of units) {
    const slug = unitSlug(unit.name);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), unit.name]);
  }
  for (const [slug, names] of bySlug) {
    if (names.length > 1) {
      problems.push(`set 19 units ${names.join(" and ")} share the slug "${slug}"`);
    }
  }

  // The roster's trait lists and the trait pages are two copies of one fact; a
  // rename on one side must not leave the other pointing at a trait that is gone.
  const traitNames = new Set([...traits, ...uniqueTraits].map((trait) => trait.name));
  for (const unit of units) {
    for (const trait of unit.traits) {
      if (!traitNames.has(trait)) {
        problems.push(`set 19 ${unit.name} carries "${trait}", which is not a listed trait`);
      }
    }
  }

  // Each trait's champion string and the roster are the same fact written twice:
  // the string drives the traits page, the roster drives the units page and every
  // /set-19/units/<champion> page. Compare them both ways, name and cost, so a
  // typo in either copy fails instead of quietly disagreeing on a page.
  const unitsByName = new Map(units.map((unit) => [unit.name, unit]));
  for (const trait of [...traits, ...uniqueTraits]) {
    const listedNames = new Set<string>();

    for (const entry of parseChampions(trait.champions)) {
      if (!Number.isFinite(entry.cost)) {
        problems.push(
          `set 19 trait "${trait.name}" has a champion without a readable cost: "${entry.name}"`,
        );
        continue;
      }
      const unit = unitsByName.get(entry.name);
      if (!unit) {
        problems.push(
          `set 19 trait "${trait.name}" names "${entry.name}", which is not in the roster`,
        );
        continue;
      }
      if (listedNames.has(entry.name)) {
        problems.push(`set 19 trait "${trait.name}" lists ${entry.name} twice`);
      }
      listedNames.add(entry.name);
      if (unit.cost !== entry.cost) {
        problems.push(
          `set 19 trait "${trait.name}" lists ${entry.name} at ${entry.cost}-cost, ` +
            `the roster says ${unit.cost}`,
        );
      }
      if (!unit.traits.includes(trait.name)) {
        problems.push(
          `set 19 trait "${trait.name}" lists ${entry.name}, but the roster does not give it ` +
            "that trait",
        );
      }
    }

    for (const unit of units) {
      if (unit.traits.includes(trait.name) && !listedNames.has(unit.name)) {
        problems.push(
          `set 19 trait "${trait.name}" does not list ${unit.name}, but the roster says it ` +
            "carries the trait",
        );
      }
    }
  }

  return problems;
}
