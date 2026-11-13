import { comps } from "@/content/comps";
import type { RankBucket, Region } from "@/content/types";

import { listStatsPatches, loadCompStats, type CompStatsMap } from "./stats-source";

/**
 * Patch-over-patch movers, derived from `comp_stats`.
 *
 * The editorial layer used to carry these by hand, which meant a patch page
 * could show a delta nobody measured. Now the page asks this module: it compares
 * the current patch's stats with the previous patch that actually has rows, and
 * returns nothing until both windows exist.
 *
 * Ranking is on top-4 rate, the same number the tier list sorts on. A comp must
 * clear `MOVER_MIN_GAMES` in *both* patches, because a 12-game swing is noise —
 * and the sample sizes travel with each entry so the page can show them.
 */

/** Games required in each patch before a comp is eligible to move. */
export const MOVER_MIN_GAMES = 50;

/** How many entries each side of the section shows. */
const MOVER_LIMIT = 3;

/** Same default scope as the tier list. */
const DEFAULT_RANK: RankBucket = "master+";

export type CompMover = {
  compSlug: string;
  label: string;
  /** Second patch minus first, as a fraction of top-4 rate (0.042 = +4.2pp). */
  delta: number;
  previousGames: number;
  games: number;
};

export type PatchMovers = {
  patch: string;
  previousPatch: string;
  rankBucket: RankBucket;
  /** Undefined region on the stats query means every crawled region. */
  region: Region | "all";
  minGames: number;
  risers: CompMover[];
  fallers: CompMover[];
};

const NAMES = new Map(
  comps.filter((comp) => comp.published).map((comp) => [comp.slug, comp.name]),
);

/**
 * Pure core of the feature: two stats maps in, ranked movers out. Exported so it
 * can be exercised without a database.
 */
export function buildMovers(input: {
  patch: string;
  previousPatch: string;
  current: CompStatsMap;
  previous: CompStatsMap;
  names?: Map<string, string>;
  minGames?: number;
  limit?: number;
  rankBucket?: RankBucket;
}): PatchMovers {
  const names = input.names ?? NAMES;
  const minGames = input.minGames ?? MOVER_MIN_GAMES;
  const limit = input.limit ?? MOVER_LIMIT;

  const movers: CompMover[] = [];

  for (const [slug, current] of input.current) {
    const previous = input.previous.get(slug);
    const label = names.get(slug);
    if (!previous || !label) continue;
    if (current.games < minGames || previous.games < minGames) continue;

    const delta = current.top4Rate - previous.top4Rate;
    if (delta === 0) continue;

    movers.push({
      compSlug: slug,
      label,
      delta,
      previousGames: previous.games,
      games: current.games,
    });
  }

  const byDelta = [...movers].sort(
    (a, b) => b.delta - a.delta || a.compSlug.localeCompare(b.compSlug),
  );

  return {
    patch: input.patch,
    previousPatch: input.previousPatch,
    rankBucket: input.rankBucket ?? DEFAULT_RANK,
    region: "all",
    minGames,
    risers: byDelta.filter((entry) => entry.delta > 0).slice(0, limit),
    fallers: byDelta
      .filter((entry) => entry.delta < 0)
      .sort((a, b) => a.delta - b.delta || a.compSlug.localeCompare(b.compSlug))
      .slice(0, limit),
  };
}

/**
 * Null means "not enough patch windows": no database, no current stats, or no
 * earlier patch with rows. The page renders an honest empty state, never a zero.
 */
export async function getPatchMovers(patch: string): Promise<PatchMovers | null> {
  const patches = await listStatsPatches();
  const index = patches.indexOf(patch);
  if (index < 1) return null;

  const previousPatch = patches[index - 1];
  if (!previousPatch) return null;

  const [current, previous] = await Promise.all([
    loadCompStats({ patch, rank: DEFAULT_RANK }),
    loadCompStats({ patch: previousPatch, rank: DEFAULT_RANK }),
  ]);

  if (!current || !previous) return null;

  return buildMovers({ patch, previousPatch, current, previous });
}
