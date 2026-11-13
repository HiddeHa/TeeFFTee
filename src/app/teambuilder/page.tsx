import type { Metadata } from "next";

import {
  TeamBuilder,
  type BuilderItem,
  type BuilderTrait,
  type BuilderUnit,
} from "@/components/team-builder";
import { site } from "@/content/site";
import { BOARD_HEXES, decodeBoard } from "@/lib/board-codec";
import { loadItemCatalogue } from "@/lib/items";
import { loadTraitCatalogue } from "@/lib/traits";
import { loadUnitCatalogue } from "@/lib/units";

export const metadata: Metadata = {
  title: "Teambuilder",
  description: `Plan a Set ${site.setNumber} TFT board: every champion on the set's hex board, with the set's items to put on them.`,
  alternates: { canonical: "/teambuilder" },
};

/**
 * Items a player can actually put on a champion. The catalogue's `special` bucket
 * is a grab bag of anvils, augment rewards and mode-only entries, so it is left
 * out — an item palette that offers "1 gold" is not a teambuilder.
 */
const EQUIPPABLE_KINDS = ["completed", "component", "emblem"];

type SearchParams = Promise<{ b?: string | string[] }>;

export default async function TeamBuilderPage({ searchParams }: { searchParams: SearchParams }) {
  // A shared link carries the board; anything the codec rejects is dropped, so a
  // truncated or hand-edited link renders what it can rather than erroring.
  const { b } = await searchParams;
  const initialBoard = decodeBoard(b, BOARD_HEXES);

  const [unitIndex, itemIndex, traitIndex] = await Promise.all([
    loadUnitCatalogue(site.setNumber),
    loadItemCatalogue(site.setNumber),
    loadTraitCatalogue(site.setNumber),
  ]);

  // One entry per catalogue row, keyed by Riot id. The catalogue lists the same
  // item name under several ids (base plus mode variants); the palette shows a
  // name once, so the same tile cannot appear twice.
  const seenItems = new Set<string>();
  const items: BuilderItem[] = Array.from(itemIndex ?? [])
    .map(([id, item]) => ({ id, name: item.name, kind: item.kind, imageUrl: item.imageUrl }))
    .filter((item) => EQUIPPABLE_KINDS.includes(item.kind) && item.name.length > 0)
    .filter((item) => {
      const key = `${item.kind}:${item.name.toLowerCase()}`;
      if (seenItems.has(key)) return false;
      seenItems.add(key);
      return true;
    })
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

  const units: BuilderUnit[] = Array.from(unitIndex ?? [])
    .map(([id, unit]) => ({
      id,
      name: unit.name,
      cost: unit.cost,
      imageUrl: unit.imageUrl,
      traits: unit.traits,
    }))
    .filter((unit) => unit.cost >= 1 && unit.cost <= 5)
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  const traits: BuilderTrait[] = Array.from(traitIndex ?? [])
    .map(([id, trait]) => ({
      id,
      name: trait.name,
      breakpoints: trait.breakpoints,
      imageUrl: trait.imageUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {site.setNumber} · {site.setCodename} · patch {site.currentPatch}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Teambuilder</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Every champion in the set, the set's item list, and the full 4×7 half-board to
          lay them out on. Three items per champion — the same rules the game enforces.
        </p>
      </header>

      <TeamBuilder
        units={units}
        items={items}
        traits={traits}
        initialBoard={initialBoard}
        setNumber={site.setNumber}
        patch={site.currentPatch}
      />
    </div>
  );
}
