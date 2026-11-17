import { comps } from "@/content/comps";
import { patches } from "@/content/patches";
import { site } from "@/content/site";
import type {
  BoardPosition,
  BoardUnit,
  Comp,
  CompStats,
  ItemPriority,
  Patch,
  PositionedUnit,
  RankBucket,
  Region,
  ResolvedItem,
  ResolvedPriority,
  Tier,
  UnitSlot,
} from "@/content/types";

import { loadItemCatalogue, type ItemIndex } from "./items";
import { loadCompStats } from "./stats-source";
import { loadUnitCatalogue, type UnitIndex } from "./units";

/**
 * THE DATA SEAM
 *
 * Two sources, one shape:
 *  - EDITORIAL (names, boards, notes, tiers) comes from src/content — typed,
 *    reviewed in git, editable without a database.
 *  - NUMBERS come from Postgres `comp_stats`, which the crawler materialises.
 *
 * Fallback rules, deliberately different from each other:
 *  - No DATABASE_URL, or Postgres unreachable → serve the curated snapshot in the
 *    content file. The site must always render.
 *  - Postgres answers but has no sample for a comp → `visibleStats: null`, which
 *    the UI renders as "collecting data". That is data, not an outage: falling
 *    back to content numbers there would present placeholder figures as measured.
 */

export const TIER_ORDER: Tier[] = ["S", "A", "B", "C"];

const DEFAULT_RANK: RankBucket = "master+";

export type CompFilters = {
  patch?: string;
  /** undefined = combine every region */
  region?: Region;
  /** undefined = the default bucket (Master+) */
  rank?: RankBucket;
};

export type CompListItem = Comp & {
  /**
   * The stats for the active scope, or null when there is no sample. Null must
   * render as "collecting data".
   */
  visibleStats: CompStats | null;
  /**
   * The board with names, costs and icons from the set catalogue. Slots whose id
   * the catalogue does not know keep a null name — never a made-up one — and so
   * do slots carrying an item id the item catalogue does not know.
   */
  visibleBoard: BoardUnit[];
  /** Positioning resolved to names and icons; null when the comp has none authored. */
  visiblePositioning: PositionedUnit[] | null;
  /** Item priority chains resolved to names and icons. */
  visibleItemPriority: ResolvedPriority[];
};

function resolveItem(id: string, index: ItemIndex | null): ResolvedItem {
  const item = index?.get(id) ?? null;
  return { id, name: item?.name ?? null, imageUrl: item?.imageUrl ?? null };
}

/** Attach catalogue data to every slot; unresolved ids stay explicitly null. */
function resolveBoard(
  board: UnitSlot[],
  unitIndex: UnitIndex | null,
  itemIndex: ItemIndex | null,
): BoardUnit[] {
  return board.map((slot) => {
    const unit = unitIndex?.get(slot.id) ?? null;
    return {
      ...slot,
      name: unit?.name ?? null,
      cost: unit?.cost ?? null,
      imageUrl: unit?.imageUrl ?? null,
      resolvedItems: slot.items.map((id) => resolveItem(id, itemIndex)),
    };
  });
}

/**
 * Positioning carries only unit ids and coordinates in content; name, icon, cost
 * and star are looked up here, so a positioning entry can never disagree with the
 * board it belongs to.
 */
function resolvePositioning(
  positions: BoardPosition[] | undefined,
  board: UnitSlot[],
  unitIndex: UnitIndex | null,
): PositionedUnit[] | null {
  if (!positions || positions.length === 0) return null;

  return positions.map((position) => {
    const unit = unitIndex?.get(position.unitId) ?? null;
    const slot = board.find((entry) => entry.id === position.unitId) ?? null;
    return {
      ...position,
      name: unit?.name ?? null,
      imageUrl: unit?.imageUrl ?? null,
      cost: unit?.cost ?? null,
      star: slot?.star ?? null,
    };
  });
}

function resolvePriorities(
  priorities: ItemPriority[],
  board: UnitSlot[],
  unitIndex: UnitIndex | null,
  itemIndex: ItemIndex | null,
): ResolvedPriority[] {
  return priorities.map((entry) => {
    const unit = unitIndex?.get(entry.unitId) ?? null;
    const slot = board.find((candidate) => candidate.id === entry.unitId) ?? null;

    return {
      unitId: entry.unitId,
      unitName: unit?.name ?? slot?.id ?? null,
      chain: entry.chain.map((id) => resolveItem(id, itemIndex)),
    };
  });
}

/** A consistent scope for the database — every column of the stats key needs one. */
function resolveScope(filters: CompFilters) {
  return {
    patch: filters.patch ?? site.currentPatch,
    rank: filters.rank ?? DEFAULT_RANK,
    region: filters.region,
  };
}

/** Content-file fallback: pick the seeded snapshot that survives the filters. */
function pickStats(stats: CompStats | null, filters: CompFilters): CompStats | null {
  if (!stats) return null;
  if (filters.patch && stats.patch !== filters.patch) return null;
  if (filters.region && stats.region !== filters.region) return null;
  if (filters.rank && stats.rankBucket !== filters.rank) return null;
  return stats;
}

/**
 * The tier list's ordering, exported so a change to it fails a test rather than
 * silently reshuffling every list page: editorial tier first, then the Wilson
 * lower bound (never the raw top-4 rate), then name for a stable order.
 */
export function sortByTierThenConfidence(a: CompListItem, b: CompListItem): number {
  const tierDelta = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
  if (tierDelta !== 0) return tierDelta;

  // Sort on the Wilson lower bound, never the raw top-4 rate: a 12-game comp
  // must not outrank a 5,000-game comp.
  const aScore = a.visibleStats?.top4CiLow ?? -1;
  const bScore = b.visibleStats?.top4CiLow ?? -1;
  if (aScore !== bScore) return bScore - aScore;

  return a.name.localeCompare(b.name);
}

export async function listComps(filters: CompFilters = {}): Promise<CompListItem[]> {
  const fromDatabase = await loadCompStats(resolveScope(filters));
  // The public surface belongs to the current set. Set 18 comps remain in
  // content as an archive, but they must not appear under a Set 19 header or
  // answer a Set 19 tier-list URL.
  const published = comps.filter(
    (comp) => comp.published && comp.setNumber === site.setNumber,
  );

  // One catalogue read per set, not per comp: boards and item chains are the only
  // consumers, and a list page renders every comp on it.
  const unitsPerSet = new Map<number, UnitIndex | null>();
  const itemsPerSet = new Map<number, ItemIndex | null>();
  for (const setNumber of new Set(published.map((comp) => comp.setNumber))) {
    unitsPerSet.set(setNumber, await loadUnitCatalogue(setNumber));
    itemsPerSet.set(setNumber, await loadItemCatalogue(setNumber));
  }

  return published
    .map((comp) => {
      const unitIndex = unitsPerSet.get(comp.setNumber) ?? null;
      const itemIndex = itemsPerSet.get(comp.setNumber) ?? null;

      return {
        ...comp,
        visibleStats: fromDatabase
          ? (fromDatabase.get(comp.slug) ?? null)
          : pickStats(comp.stats, filters),
        visibleBoard: resolveBoard(comp.board, unitIndex, itemIndex),
        visiblePositioning: resolvePositioning(comp.positioning, comp.board, unitIndex),
        visibleItemPriority: resolvePriorities(
          comp.itemPriority,
          comp.board,
          unitIndex,
          itemIndex,
        ),
      };
    })
    .sort(sortByTierThenConfidence);
}

export async function getComp(
  slug: string,
  filters: CompFilters = {},
): Promise<CompListItem | null> {
  const all = await listComps(filters);
  return all.find((comp) => comp.slug === slug) ?? null;
}

export async function getRelatedComps(slug: string, limit = 3): Promise<CompListItem[]> {
  const all = await listComps();
  return all.filter((comp) => comp.slug !== slug).slice(0, limit);
}

/** Comps that actually have numbers — used for "top of the meta" blocks. */
export async function getRankedComps(limit = 5): Promise<CompListItem[]> {
  const all = await listComps({ patch: site.currentPatch });
  return all.filter((comp) => comp.visibleStats !== null).slice(0, limit);
}

export async function listPatches(): Promise<Patch[]> {
  return [...patches].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}

export async function getPatch(patch: string): Promise<Patch | null> {
  return patches.find((candidate) => candidate.patch === patch) ?? null;
}

export async function getCurrentPatch(): Promise<Patch | null> {
  const sorted = await listPatches();
  return sorted[0] ?? null;
}

/** Total crawled games represented by the given comps — a data-health signal. */
export function totalGames(items: CompListItem[]): number {
  return items.reduce((sum, comp) => sum + (comp.visibleStats?.games ?? 0), 0);
}
