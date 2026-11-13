import type { Tier } from "@/content/types";
import type { CompListItem } from "@/lib/data";
import { classNames, formatDate, formatGames, formatPercent, formatPlace } from "@/lib/format";
import type { TraitIndex } from "@/lib/traits";

/**
 * The comp stats table.
 *
 * One row per comp, every column this site can actually measure or read from the
 * set catalogue — consensus letters, the authored board (unit count, total gold,
 * three-star targets, core/flex, defining trait, items and augments) and the crawl
 * sample (patch, region, rank, games, average placement, top-4, win, pick and the
 * Wilson lower bound).
 *
 * Two rules carry over from the rest of the site:
 *  - A missing sample is a dash, never a zero. The stats columns come from
 *    `comp_stats`; a comp with no rows there is "no sample", not "0%".
 *  - Nothing player-identifying is ever shown. Every figure is an aggregate over
 *    full 8-player games; names and PUUIDs stay in the crawler.
 */

const TIER_TEXT: Record<Tier, string> = {
  S: "text-tier-s",
  A: "text-tier-a",
  B: "text-tier-b",
  C: "text-tier-c",
};

const NO_SAMPLE = "—";

const RANK_LABELS: Record<string, string> = {
  "master+": "Master+",
  "diamond+": "Diamond+",
  all: "All ranks",
};

/** Columns whose values are right-aligned; their headers follow. */
const NUMERIC = new Set([
  "Score",
  "Sources",
  "Units",
  "Cost",
  "3★",
  "Core",
  "Flex",
  "Items",
  "Augments",
  "Games",
  "Avg",
  "Top 4",
  "Win",
  "Pick",
  "Top-4 floor",
  "Computed",
]);

/** Head cells: one per column, grouped so the source of each number is obvious. */
const GROUPS = [
  { label: "Consensus", columns: ["Score", "Sources"] },
  {
    label: "Board (from the set catalogue)",
    columns: ["Style", "Difficulty", "Units", "Cost", "3★", "Core", "Flex", "Trait", "Items", "Augments"],
  },
  {
    label: "Our crawl",
    columns: ["Patch", "Region", "Rank", "Games", "Avg", "Top 4", "Win", "Pick", "Top-4 floor", "Computed"],
  },
] as const;

function sampleTitle(comp: CompListItem): string {
  return comp.visibleStats
    ? `Measured on ${formatGames(comp.visibleStats.games)} of our crawled boards`
    : "Our crawl has no sample for this comp in this scope";
}

export function CompStatsTable({
  comps,
  traits,
}: {
  comps: CompListItem[];
  traits: TraitIndex | null;
}) {
  if (comps.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2 text-xs leading-relaxed text-muted">
        No comps to tabulate yet. Add them in{" "}
        <code className="font-mono text-[11px]">src/content/comps.ts</code>.
      </p>
    );
  }

  const ordered = [...comps].sort((a, b) => {
    const tierDelta = ["S", "A", "B", "C"].indexOf(a.tier) - ["S", "A", "B", "C"].indexOf(b.tier);
    if (tierDelta !== 0) return tierDelta;
    return b.consensus.score - a.consensus.score;
  });

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
      <p className="border-b border-line px-3 py-2 text-[11px] leading-relaxed text-muted">
        A dash means our crawl has no sample for that comp in this scope — it is never a
        zero. Columns are grouped by where the number comes from.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1480px] border-collapse text-[11px]">
          <thead className="bg-ink/40 text-[9px] uppercase tracking-wider text-muted">
            <tr className="border-b border-line/70">
              <th
                rowSpan={2}
                scope="col"
                className="sticky left-0 z-20 border-r border-line bg-surface px-2 py-2 text-left font-semibold"
              >
                Comp
              </th>
              {GROUPS.map((group) => (
                <th
                  key={group.label}
                  colSpan={group.columns.length}
                  scope="colgroup"
                  className="whitespace-nowrap border-l border-line/70 px-2 py-2 text-left font-semibold"
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-line/70">
              {GROUPS.flatMap((group) =>
                group.columns.map((column, index) => (
                  <th
                    key={`${group.label}-${column}`}
                    scope="col"
                    className={classNames(
                      "whitespace-nowrap px-2 py-1.5 font-medium",
                      index === 0 && "border-l border-line/70",
                      NUMERIC.has(column) && "text-right",
                    )}
                  >
                    {column}
                  </th>
                )),
              )}
            </tr>
          </thead>

          <tbody>
            {ordered.map((comp) => {
              const stats = comp.visibleStats;
              const board = comp.visibleBoard;
              const costs = board
                .map((unit) => unit.cost)
                .filter((cost): cost is number => cost !== null);
              const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
              const threeStars = board.filter((unit) => unit.star === 3).length;
              const items = board.reduce((sum, unit) => sum + unit.items.length, 0);
              const trait = comp.definingTrait
                ? (traits?.get(comp.definingTrait)?.name ?? comp.definingTrait)
                : null;
              const traitResolved = comp.definingTrait
                ? (traits?.get(comp.definingTrait)?.name ?? null) !== null
                : false;
              const title = sampleTitle(comp);

              return (
                <tr
                  key={comp.slug}
                  className="group border-b border-line/50 last:border-b-0 hover:bg-raised/60"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-line bg-surface px-2 py-1.5 text-left font-normal group-hover:bg-raised"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={classNames(
                          "w-3.5 text-center text-xs font-black leading-none",
                          TIER_TEXT[comp.tier],
                        )}
                        title={`Tier ${comp.tier}`}
                      >
                        {comp.tier}
                      </span>
                      <a
                        href={`/comps/${comp.slug}`}
                        className="whitespace-nowrap font-semibold hover:text-accent"
                      >
                        {comp.name}
                      </a>
                    </span>
                  </th>

                  {/* Consensus */}
                  <td className="px-2 py-1.5 text-right" title="Mean of the published tier letters">
                    <span className="stat-value">{comp.consensus.score.toFixed(2)}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right" title="Published lists that cover this comp">
                    {comp.consensus.sources.length}
                  </td>

                  {/* Board */}
                  <td className="whitespace-nowrap border-l border-line/70 px-2 py-1.5">
                    {comp.playstyle}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{comp.difficulty}</td>
                  <td className="px-2 py-1.5 text-right">{board.length}</td>
                  <td
                    className="px-2 py-1.5 text-right"
                    title="Total gold cost of the authored board"
                  >
                    {board.length > 0 && costs.length === board.length ? `${totalCost}g` : NO_SAMPLE}
                  </td>
                  <td className="px-2 py-1.5 text-right" title="Units targeted at three stars">
                    {threeStars}
                  </td>
                  <td className="px-2 py-1.5 text-right" title="Units in the assignment signature">
                    {comp.coreUnits.length}
                  </td>
                  <td className="px-2 py-1.5 text-right">{comp.flexUnits.length}</td>
                  <td
                    className={classNames(
                      "max-w-[9rem] truncate px-2 py-1.5",
                      traitResolved ? "" : "font-mono text-[10px] text-muted/70",
                    )}
                    title={
                      trait
                        ? traitResolved
                          ? trait
                          : `${trait} — not in the Set ${comp.setNumber} catalogue`
                        : "No defining trait: the core units identify this comp"
                    }
                  >
                    {trait ?? NO_SAMPLE}
                  </td>
                  <td className="px-2 py-1.5 text-right" title="Item slots filled across the board">
                    {items}
                  </td>
                  <td className="px-2 py-1.5 text-right" title="Recommended augments listed for this comp">
                    {comp.augments.length}
                  </td>

                  {/* Crawl sample */}
                  <td className="whitespace-nowrap border-l border-line/70 px-2 py-1.5">
                    {stats?.patch ?? comp.patch}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {stats ? (stats.region === "all" ? "All regions" : stats.region) : NO_SAMPLE}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {stats ? (RANK_LABELS[stats.rankBucket] ?? stats.rankBucket) : NO_SAMPLE}
                  </td>
                  <td className="px-2 py-1.5 text-right" title={title}>
                    {stats ? formatGames(stats.games) : NO_SAMPLE}
                  </td>
                  <td className="stat-value px-2 py-1.5 text-right" title={title}>
                    {stats ? formatPlace(stats.avgPlace) : NO_SAMPLE}
                  </td>
                  <td className="stat-value px-2 py-1.5 text-right" title={title}>
                    {stats ? formatPercent(stats.top4Rate) : NO_SAMPLE}
                  </td>
                  <td className="stat-value px-2 py-1.5 text-right" title={title}>
                    {stats ? formatPercent(stats.winRate) : NO_SAMPLE}
                  </td>
                  <td
                    className="stat-value px-2 py-1.5 text-right"
                    title={`${title}. Pick rate is the share of every crawled board in this scope that played this comp.`}
                  >
                    {stats ? formatPercent(stats.pickRate) : NO_SAMPLE}
                  </td>
                  <td
                    className="stat-value px-2 py-1.5 text-right"
                    title="Wilson 95% lower bound on the top-4 rate"
                  >
                    {stats ? formatPercent(stats.top4CiLow) : NO_SAMPLE}
                  </td>
                  <td
                    className="whitespace-nowrap px-2 py-1.5 text-right"
                    title="When the crawler last materialised this row"
                  >
                    {stats ? formatDate(stats.computedAt) : NO_SAMPLE}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 border-t border-line p-3 text-[11px] leading-relaxed text-muted sm:grid-cols-2">
        <p className="rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2">
          <span className="font-semibold text-fg/80">Crawl columns</span> come from full
          8-player matches on the seeded ladders. Games, average placement, top-4, win
          rate and pick rate are computed from those rows; <em>Top-4 floor</em> is the
          Wilson 95% lower bound, which is what the tier list sorts on.
        </p>
        <p className="rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2">
          <span className="font-semibold text-fg/80">Board columns</span> are derived from
          the set catalogue and the authored guide: units on the board, their total gold,
          three-star targets, core and flex counts, the defining trait, filled item slots
          and listed augments.
        </p>
        <p className="rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2">
          <span className="font-semibold text-fg/80">Consensus</span> is the mean of the
          published letters (S/S+ = 4, A = 3, B = 2, C = 1, D = 0); <em>Sources</em> is
          how many lists that mean covers. Each letter is printed on the card in the
          Board view, so the average can be checked.
        </p>
        <p className="rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2">
          <span className="font-semibold text-fg/80">Privacy</span>: only aggregates are
          published. Player names, PUUIDs and match histories never enter this table —
          Riot&apos;s API terms and this site&apos;s methodology both require it.
        </p>
      </div>
    </section>
  );
}
