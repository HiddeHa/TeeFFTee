import { comps } from "@/content/comps";
import { patches } from "@/content/patches";
import type {
  BoardUnit,
  Comp,
  CompStats,
  Patch,
  RankBucket,
  Region,
  Tier,
  UnitSlot,
} from "@/content/types";

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
   * the catalogue does not know keep a null name — never a made-up one.
   */
  visibleBoard: BoardUnit[];
};

/** Attach catalogue data to every slot; unresolved ids stay explicitly null. */
function resolveBoard(board: UnitSlot[], index: UnitIndex | null): BoardUnit[] {
  return board.map((slot) => {
    const unit = index?.get(slot.id) ?? null;
    return {
      ...slot,
      name: unit?.name ?? null,
      cost: unit?.cost ?? null,
      imageUrl: unit?.imageUrl ?? null,
    };
  });
}

/** A consistent scope for the database — every column of the stats key needs one. */
function resolveScope(filters: CompFilters) {
  return {
    patch: filters.patch ?? patches[0]?.patch ?? "unknown",
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

function sortByTierThenConfidence(a: CompListItem, b: CompListItem): number {
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
  const published = comps.filter((comp) => comp.published);

  // One catalogue read per set, not per comp: boards are the only consumer, and a
  // list page renders every comp on it.
  const catalogues = new Map<number, UnitIndex | null>();
  for (const setNumber of new Set(published.map((comp) => comp.setNumber))) {
    catalogues.set(setNumber, await loadUnitCatalogue(setNumber));
  }

  return published
    .map((comp) => ({
      ...comp,
      visibleStats: fromDatabase
        ? (fromDatabase.get(comp.slug) ?? null)
        : pickStats(comp.stats, filters),
      visibleBoard: resolveBoard(comp.board, catalogues.get(comp.setNumber) ?? null),
    }))
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
  const all = await listComps({ patch: patches[0]?.patch });
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
