import {
  set19PrismaticTraits,
  set19Traits,
  set19UniqueTraits,
  set19Units,
} from "@/content/set-19";

import type { AugmentIndex } from "./augments";
import { loadAugmentCatalogue } from "./augments";
import { loadItemCatalogue, type ItemIndex } from "./items";
import { unitSlug } from "./set19-anchors";
import { loadTraitCatalogue, type TraitIndex } from "./traits";
import { loadUnitCatalogue, type UnitIndex } from "./units";

/**
 * Set 19 catalogue read side, ahead of the client catalogue.
 *
 * Community Dragon still does not ship Set 19: `load-assets --set 19` has
 * nothing to load, so the database and the committed snapshot both resolve zero
 * Set 19 rows. The reveal roster and trait list are the only real Set 19
 * identity data that exists, and they are enough for the two tools that ask
 * "which champions and traits are in this set?".
 *
 * Rules:
 *  - A real catalogue wins the moment it exists. Synthetic ids are a fallback,
 *    never a replacement for Riot's ids.
 *  - Trait names in the roster resolve through this file's id map, so a unit's
 *    trait chips light up correctly in the teambuilder.
 *  - Icons are absent rather than borrowed. The UI's initials/empty state is
 *    honest about a catalogue that has not shipped.
 *  - Items fall back to the shared item list, because components and completed
 *    items carry across sets; Set 19-only items and augments wait for 19.1.
 */

function set19Id(name: string): string {
  return `SET19_${unitSlug(name)}`;
}

/** "3 / 5 + Prismatic", "3 / 5 · A-Side..." and "3 / 5 / 7, plus..." all parse. */
function breakpointsFromTiers(tiers: string): number[] {
  const values = tiers.match(/\d+/g) ?? [];
  return [...new Set(values.map(Number))].sort((a, b) => a - b);
}

const traitNames = new Map<string, string>();
for (const trait of [...set19Traits, ...set19UniqueTraits]) {
  traitNames.set(trait.name, set19Id(trait.name));
}

const contentUnits: UnitIndex = new Map(
  set19Units.map((unit) => [
    set19Id(unit.name),
    {
      name: unit.name,
      cost: unit.cost,
      imageUrl: null,
      traits: unit.traits.map((name) => traitNames.get(name) ?? set19Id(name)),
    },
  ]),
);

const contentTraits: TraitIndex = new Map();
for (const trait of [...set19Traits, ...set19UniqueTraits]) {
  contentTraits.set(set19Id(trait.name), {
    name: trait.name,
    breakpoints: breakpointsFromTiers(trait.breakpoints),
    imageUrl: null,
  });
}
for (const trait of set19PrismaticTraits) {
  const id = set19Id(trait.name);
  if (contentTraits.has(id)) continue;
  contentTraits.set(id, {
    name: trait.name,
    breakpoints: breakpointsFromTiers(trait.tiers),
    imageUrl: null,
  });
}

export async function loadSet19UnitCatalogue(): Promise<UnitIndex> {
  const loaded = await loadUnitCatalogue(19);
  return loaded && loaded.size > 0 ? loaded : contentUnits;
}

export async function loadSet19TraitCatalogue(): Promise<TraitIndex> {
  const loaded = await loadTraitCatalogue(19);
  return loaded && loaded.size > 0 ? loaded : contentTraits;
}

export type Set19ItemCatalogue = {
  index: ItemIndex | null;
  /** True when the palette is the shared item list rather than a Set 19 load. */
  provisional: boolean;
};

export async function loadSet19ItemCatalogue(): Promise<Set19ItemCatalogue> {
  const loaded = await loadItemCatalogue(19);
  if (loaded && loaded.size > 0) return { index: loaded, provisional: false };

  const shared = await loadItemCatalogue(18);
  if (!shared) return { index: null, provisional: true };

  // Emblems are set-specific; components and completed items are not. Keep the
  // provisional palette to the shared equipment rather than offer a Set 18
  // emblem that cannot exist in Set 19.
  const index: ItemIndex = new Map(
    [...shared].filter(([, item]) => item.kind === "completed" || item.kind === "component"),
  );
  return { index, provisional: true };
}

export type Set19AugmentCatalogue = {
  index: AugmentIndex | null;
  provisional: boolean;
};

export async function loadSet19AugmentCatalogue(): Promise<Set19AugmentCatalogue> {
  const loaded = await loadAugmentCatalogue(19);
  if (loaded && loaded.size > 0) return { index: loaded, provisional: false };
  return { index: null, provisional: true };
}
