/**
 * Wilson score interval, lower bound.
 *
 * Sorting a tier list by raw top-4 rate lets a 12-game comp outrank a 5,000-game
 * comp. Sorting by the lower bound makes small samples sink on their own, which
 * is why the tier list orders by this (blueprint §7).
 *
 * Shared by the site and the worker: it lives here so there is one definition of
 * the number the methodology page promises.
 */
export function wilsonLowerBound(successes: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const bounded = Math.min(Math.max(successes, 0), total);
  const p = bounded / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));
  return Math.max(0, (centre - margin) / denominator);
}
