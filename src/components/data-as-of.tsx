import type { CompStats } from "@/content/types";
import { formatDate } from "@/lib/format";

/**
 * "Data as of …" — when the aggregate behind a page's numbers was computed.
 *
 * Every measured figure comes from one `aggregate` run, so a single chip describes
 * the whole page. It renders nothing when there is no sample: a date would be a
 * claim about data that does not exist.
 */

type DatedStats = Pick<CompStats, "computedAt">;

/** The newest `computedAt` across a page's rows; null when none is readable. */
export function latestComputedAt(
  stats: ReadonlyArray<DatedStats | null | undefined>,
): string | null {
  let newest: { iso: string; at: number } | null = null;

  for (const entry of stats) {
    const iso = entry?.computedAt;
    if (!iso) continue;

    const at = new Date(iso).getTime();
    if (Number.isNaN(at)) continue;

    if (newest === null || at > newest.at) newest = { iso, at };
  }

  return newest?.iso ?? null;
}

export function DataAsOf({ stats }: { stats: ReadonlyArray<DatedStats | null | undefined> }) {
  const computedAt = latestComputedAt(stats);
  if (!computedAt) return null;

  return (
    <span className="chip" title={`Aggregate computed ${computedAt}`}>
      Data as of {formatDate(computedAt)}
    </span>
  );
}
