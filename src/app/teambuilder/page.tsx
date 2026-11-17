import type { Metadata } from "next";

import {
  TeamBuilder,
  type BuilderItem,
  type BuilderTrait,
  type BuilderUnit,
} from "@/components/team-builder";
import { DataNote } from "@/components/data-note";
import { site } from "@/content/site";
import { BOARD_HEXES, decodeBoard } from "@/lib/board-codec";
import {
  loadSet19ItemCatalogue,
  loadSet19TraitCatalogue,
  loadSet19UnitCatalogue,
} from "@/lib/set19-catalogue";
import { isPrismaticTrait, unlockForUnit } from "@/lib/set19-unlocks";

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

  const [unitIndex, itemCatalogue, traitIndex] = await Promise.all([
    loadSet19UnitCatalogue(),
    loadSet19ItemCatalogue(),
    loadSet19TraitCatalogue(),
  ]);
  const itemIndex = itemCatalogue.index;

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
    .map(([id, unit]) => {
      // Unlock data comes from the reveal, not the catalogue, so it is keyed by
      // name: a real 19.1 catalogue row carries Riot's id but the same name.
      const unlock = unlockForUnit(unit.name);
      return {
        id,
        name: unit.name,
        cost: unit.cost,
        imageUrl: unit.imageUrl,
        traits: unit.traits,
        unlock: unlock
          ? { quest: unlock.quest?.quest ?? null, shown: unlock.card?.shown ?? null }
          : null,
      };
    })
    .filter((unit) => unit.cost >= 1 && unit.cost <= 7)
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  const traits: BuilderTrait[] = Array.from(traitIndex ?? [])
    .map(([id, trait]) => ({
      id,
      name: trait.name,
      breakpoints: trait.breakpoints,
      imageUrl: trait.imageUrl,
      prismatic: isPrismaticTrait(trait.name),
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
        {itemCatalogue.provisional ? (
          <div className="mt-4 max-w-2xl">
            <DataNote>
              Champions, costs and traits are the Set 19 reveal roster, and the portraits are
              the set's own unit art from the 19.0 files. The item palette is the shared
              completed/component list from 18.6 until Riot ships the 19.1 catalogue; Set
              19-only items and emblems appear once that load exists. Nothing is invented to
              fill the gap.
            </DataNote>
          </div>
        ) : null}
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
