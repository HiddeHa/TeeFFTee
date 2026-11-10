/**
 * Board → comp assignment.
 *
 * Pure functions only: no database, no I/O. Stage 1 of the algorithm in
 * docs/blueprint.md §8 — the curated comps supply the labels, this decides which
 * label a crawled board earns.
 */

export type CompSignature = {
  compId: string;
  slug: string;
  setName: number;
  /** Units that define the comp. Also the matching signature. */
  coreUnits: string[];
  /** When set, the board must have this trait active to qualify. */
  definingTrait: string | null;
};

export type Board = {
  units: string[];
  /** Only active traits should be passed in (tier_current > 0). */
  traits: string[];
  placement: number;
};

export type Assignment =
  | { compId: string; score: number }
  | { compId: null; reason: "no-comps" | "below-threshold" | "trait-missing" };

/**
 * Assign a board to the best matching comp.
 *
 * Scoring is core-unit overlap: `|board ∩ core| / |core|`. A board qualifies at
 * or above `threshold` AND with the comp's defining trait active, if it has one.
 *
 * Ties go to the comp with more core units — the more specific definition wins
 * over a loose one that happens to be a subset. Remaining ties break on slug so
 * the result is deterministic across runs.
 */
export function assignBoard(
  board: Board,
  comps: CompSignature[],
  threshold: number,
): Assignment {
  if (comps.length === 0) return { compId: null, reason: "no-comps" };

  const unitSet = new Set(board.units);
  const traitSet = new Set(board.traits);

  let best: { comp: CompSignature; score: number } | null = null;
  let sawTraitMiss = false;

  for (const comp of comps) {
    if (comp.coreUnits.length === 0) continue;

    let hits = 0;
    for (const unit of comp.coreUnits) {
      if (unitSet.has(unit)) hits += 1;
    }

    const score = hits / comp.coreUnits.length;
    if (score < threshold) continue;

    if (comp.definingTrait !== null && !traitSet.has(comp.definingTrait)) {
      sawTraitMiss = true;
      continue;
    }

    if (
      best === null ||
      score > best.score ||
      (score === best.score && comp.coreUnits.length > best.comp.coreUnits.length) ||
      (score === best.score &&
        comp.coreUnits.length === best.comp.coreUnits.length &&
        comp.slug < best.comp.slug)
    ) {
      best = { comp, score };
    }
  }

  if (best !== null) return { compId: best.comp.compId, score: best.score };
  return { compId: null, reason: sawTraitMiss ? "trait-missing" : "below-threshold" };
}


