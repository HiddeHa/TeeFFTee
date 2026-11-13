import type { Metadata } from "next";

import { TierListMaker } from "@/components/tier-list-maker";
import { site } from "@/content/site";
import { loadAugmentCatalogue, type AugmentIndex } from "@/lib/augments";
import { COST_BORDER } from "@/lib/costs";
import { loadItemCatalogue, type ItemIndex } from "@/lib/items";
import type { CatalogueOption, TierListKind } from "@/lib/tier-lists";
import { loadUnitCatalogue, type UnitIndex } from "@/lib/units";

export const metadata: Metadata = {
  title: "Tier list maker",
  description:
    "Build your own Teamfight Tactics tier lists for augments, units and items. Saved in your browser, no account needed.",
  alternates: { canonical: "/tier-lists" },
};

/** Item kinds that are real, pickable items — not "1 gold" or "12 radiant items". */
const ITEM_KINDS = ["completed", "emblem", "component", "craftable"];
const ITEM_KIND_LABELS: Record<string, string> = {
  completed: "Completed",
  emblem: "Emblem",
  component: "Component",
  craftable: "Craftable",
};

/** Prismatic first, then Gold, then Silver; unknown rarities land at the end. */
const RARITY_ORDER: Record<string, number> = { Prismatic: 0, Gold: 1, Silver: 2 };

/** Tile border: champion cost, augment rarity and item kind each get their own colour. */
const AUGMENT_TONE: Record<string, string> = {
  Prismatic: "border-fuchsia-400",
  Gold: "border-amber-400",
  Silver: "border-slate-300",
};
const ITEM_TONE: Record<string, string> = {
  completed: "border-sky-400",
  emblem: "border-violet-400",
  component: "border-emerald-400",
  craftable: "border-slate-400",
};

/** Filter chips, in the order the game itself uses. */
const UNIT_FACETS = ["1c", "2c", "3c", "4c", "5c"];
const AUGMENT_FACETS = ["Prismatic", "Gold", "Silver"];
const ITEM_FACETS = ["Completed", "Emblem", "Component", "Craftable"];

/**
 * Units, deduped by display name.
 *
 * The catalogue carries variants that share a name (the many Lux forms, TFT and DA
 * copies of the same item) and non-champion entries (anvils, chests). A tier list
 * wants one card per thing a player recognises, so cost 1–5 is kept and a duplicate
 * name prefers the higher-cost entry — the playable champion.
 */
function buildUnits(index: UnitIndex | null): CatalogueOption[] {
  if (!index) return [];

  const best = new Map<
    string,
    { id: string; name: string; cost: number; imageUrl: string | null }
  >();
  for (const [id, entry] of index) {
    if (entry.cost < 1 || entry.cost > 5) continue;
    const key = entry.name.toLowerCase();
    const existing = best.get(key);
    if (!existing || entry.cost > existing.cost) {
      best.set(key, { id, name: entry.name, cost: entry.cost, imageUrl: entry.imageUrl });
    }
  }

  return [...best.values()]
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      imageUrl: entry.imageUrl,
      meta: `${entry.cost}c`,
      tone: COST_BORDER[entry.cost] ?? "border-line",
    }));
}

/** Items, deduped by name, preferring the most "real" kind when both exist. */
function buildItems(index: ItemIndex | null): CatalogueOption[] {
  if (!index) return [];

  const best = new Map<
    string,
    { id: string; name: string; kind: string; imageUrl: string | null }
  >();
  for (const [id, entry] of index) {
    if (!ITEM_KINDS.includes(entry.kind)) continue;
    const key = entry.name.toLowerCase();
    const existing = best.get(key);
    if (!existing || ITEM_KINDS.indexOf(entry.kind) < ITEM_KINDS.indexOf(existing.kind)) {
      best.set(key, { id, name: entry.name, kind: entry.kind, imageUrl: entry.imageUrl });
    }
  }

  return [...best.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      imageUrl: entry.imageUrl,
      meta: ITEM_KIND_LABELS[entry.kind] ?? entry.kind,
      tone: ITEM_TONE[entry.kind] ?? "border-line",
    }));
}

/** Augments, deduped by name, grouped by rarity then alphabetically. */
function buildAugments(index: AugmentIndex | null): CatalogueOption[] {
  if (!index) return [];

  const best = new Map<
    string,
    { id: string; name: string; tier: string; imageUrl: string | null }
  >();
  for (const [id, entry] of index) {
    const key = entry.name.toLowerCase();
    const existing = best.get(key);
    if (!existing || (RARITY_ORDER[entry.tier] ?? 9) < (RARITY_ORDER[existing.tier] ?? 9)) {
      best.set(key, { id, name: entry.name, tier: entry.tier, imageUrl: entry.imageUrl });
    }
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        (RARITY_ORDER[a.tier] ?? 9) - (RARITY_ORDER[b.tier] ?? 9) ||
        a.name.localeCompare(b.name),
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      imageUrl: entry.imageUrl,
      meta: entry.tier,
      tone: AUGMENT_TONE[entry.tier] ?? "border-line",
    }));
}

export default async function TierListsPage() {
  const setNumber = site.setNumber;
  const [units, items, augments] = await Promise.all([
    loadUnitCatalogue(setNumber),
    loadItemCatalogue(setNumber),
    loadAugmentCatalogue(setNumber),
  ]);

  const pools: Record<TierListKind, CatalogueOption[]> = {
    augments: buildAugments(augments),
    units: buildUnits(units),
    items: buildItems(items),
  };

  const present = (kind: TierListKind, values: string[]) =>
    values.filter((value) => pools[kind].some((option) => option.meta === value));

  const facets: Record<TierListKind, string[]> = {
    augments: present("augments", AUGMENT_FACETS),
    units: present("units", UNIT_FACETS),
    items: present("items", ITEM_FACETS),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {setNumber} · Your lists
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Tier list maker</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Rank augments, units and items the way you actually play them. Switch between
          the three types, drag cards from the pool into S through D, and keep as many
          lists as you want — they stay saved in this browser.
        </p>
      </header>

      <TierListMaker setNumber={setNumber} pools={pools} facets={facets} />

      <p className="mb-12 mt-10 max-w-3xl text-xs leading-relaxed text-muted">
        Cards come from the Set {setNumber} catalogue, so names, costs, rarities and
        icons are the game&apos;s own — this page never invents a unit or an item. Lists
        are yours alone: there is no account and no upload, which also means clearing
        your browser data clears them.
      </p>
    </div>
  );
}
