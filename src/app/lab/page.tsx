import type { Metadata } from "next";
import Link from "next/link";

import { AssetImage } from "@/components/asset-image";
import { DataNote } from "@/components/data-note";
import { ItemIcon } from "@/components/item-icon";
import { site } from "@/content/site";
import { classNames, formatPercent, formatPlace } from "@/lib/format";
import {
  LAB_MAX_CORE,
  LAB_MIN_GAMES,
  loadLabReport,
  type LabCandidate,
  type LabUnit,
} from "@/lib/lab";

/**
 * Lab — the comp-discovery loop's read side.
 *
 * `crawl candidates` mines the boards; this page shows the same evidence scoped
 * to the current set's latest patch, plus the share of boards the published
 * comps could not classify. It is deliberately not a tier list: a shape placing
 * well is a reason for an editor to look at it, not a recommendation to play it.
 *
 * Forced dynamic for the same reason AInalyses is: every number is a database
 * aggregate that moves as the crawler runs, and a prerendered build would freeze
 * whatever the build machine saw. The scope is one patch, so the self-join stays
 * bounded; this page is not on the critical path.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lab",
  description: `Unit sets that recur on crawled Set ${site.setNumber} TFT boards, with sample sizes, placement against the ladder baseline, common items, active traits, and the share of boards the published comps could not name.`,
  alternates: { canonical: "/lab" },
};

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="card px-3 py-2.5" title={title}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="stat-value mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

/** Positive is a better finish, so the sign is shown rather than implied. */
function formatGain(value: number): string {
  if (value === 0) return "0.00";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;
}

function Tile({ unit, size = 26 }: { unit: LabUnit; size?: number }) {
  return (
    <span
      title={unit.name ?? `${unit.id} — not in the set catalogue`}
      style={{ width: size, height: size }}
      className="block shrink-0 overflow-hidden rounded border border-line bg-surface"
    >
      <AssetImage
        src={unit.imageUrl}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        fallback={
          <span
            style={{ width: size, height: size }}
            className="flex items-center justify-center text-[8px] text-muted"
          >
            {unit.id.slice(-3)}
          </span>
        }
      />
    </span>
  );
}

function UnitLine({ unit }: { unit: LabUnit }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <Tile unit={unit} />
      <span className="min-w-0">
        <span className="block truncate text-[13px]">
          {unit.name ?? <span className="font-mono text-[11px] text-muted/70">{unit.id}</span>}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted">
          <span className="stat-value">{unit.avgStar.toFixed(1)}★</span>
          {unit.items.length > 0 ? (
            <span className="flex items-center gap-0.5">
              {unit.items.map((item) => (
                <ItemIcon key={item.id} item={item} size={13} />
              ))}
            </span>
          ) : null}
        </span>
      </span>
    </li>
  );
}

function CandidateCard({ candidate, rank }: { candidate: LabCandidate; rank: number }) {
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted">{rank}</span>
        <h2 className="min-w-0 flex-1 text-sm font-semibold">
          {candidate.units
            .map((unit) => unit.name ?? unit.id)
            .join(" + ")}
        </h2>
        <span className="flex items-end gap-3">
          <span className="flex flex-col items-end leading-tight">
            <span className="stat-value text-sm font-semibold">
              {candidate.games.toLocaleString("en-GB")}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted">boards</span>
          </span>
          <span className="flex flex-col items-end leading-tight">
            <span className="stat-value text-sm font-semibold">
              {formatPlace(candidate.avgPlace)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted">avg place</span>
          </span>
          <span className="flex flex-col items-end leading-tight">
            <span
              className={classNames(
                "stat-value text-sm font-semibold",
                candidate.delta > 0
                  ? "text-good"
                  : candidate.delta < 0
                    ? "text-bad"
                    : "text-fg/80",
              )}
            >
              {formatGain(candidate.delta)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted">vs avg</span>
          </span>
          <span className="flex flex-col items-end leading-tight">
            <span className="stat-value text-sm font-semibold">
              {formatPercent(candidate.top4Rate, 0)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted">top 4</span>
          </span>
          <span className="flex flex-col items-end leading-tight">
            <span className="stat-value text-sm font-semibold">
              {formatPercent(candidate.winRate, 1)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted">win</span>
          </span>
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {candidate.units.map((unit) => (
          <UnitLine key={unit.id} unit={unit} />
        ))}
      </ul>

      {candidate.traits.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {candidate.traits.map((trait) => (
            <span key={trait.id} className="chip text-[10px]" title={trait.id}>
              {trait.name ?? trait.id}
              <span className="ml-1 text-muted">{formatPercent(trait.share, 0)}</span>
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function LabPage() {
  const report = await loadLabReport(site.setNumber);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">Lab</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Comp discovery · Set {site.setNumber}
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Lab</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          The unit sets the ladder actually plays, mined from crawled boards rather than
          written by hand. A shape here is evidence for the people who write the comps,
          not a recommendation: recurring and placing well is a reason to look at it, and
          the items and traits are what those boards shared, not a build order.
        </p>
        {report !== null && report.scope.patch !== null ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">set {report.scope.setNumber}</span>
            <span className="chip">patch {report.scope.patch}</span>
            <span className="chip">Master+</span>
            <span className="chip">cores up to {LAB_MAX_CORE} units</span>
            <span className="chip">min {LAB_MIN_GAMES} boards</span>
          </div>
        ) : null}
      </header>

      {report === null ? (
        <div className="mt-6">
          <DataNote>
            No crawl data is attached here. The Lab reads the crawler&apos;s Postgres to
            mine recurring shapes, and nothing is connected to it in this environment — so
            there is no evidence to show. Run the crawler against a database, or open this
            page where <code className="text-fg/70">DATABASE_URL</code> is set. Nothing is
            estimated in the meantime.
          </DataNote>
        </div>
      ) : report.tooManyBoards ? (
        <div className="mt-6">
          <DataNote>
            The database holds {report.boards.toLocaleString("en-GB")} Set {site.setNumber}{" "}
            boards, which is more than this page can mine inside one request. Mining every
            recurring unit set at this size is a scheduled job, not a page render, so the
            candidate list is not shown here yet. The CLI has the same evidence in the
            meantime: <code className="text-fg/70">npm run crawl -- candidates</code>. Nothing
            is estimated.
          </DataNote>
        </div>
      ) : report.boards === 0 ? (
        <div className="mt-6">
          <DataNote>
            The database is connected but has no crawled Set {site.setNumber} boards to mine
            yet. Shapes appear once <code className="text-fg/70">npm run crawl -- once</code>{" "}
            has stored matches for this set; a core needs {LAB_MIN_GAMES} boards before it is
            reported, and zeroes would read as measurements.
          </DataNote>
        </div>
      ) : (
        <>
          <section className="mt-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Boards mined" value={report.boards.toLocaleString("en-GB")} />
              <Stat label="Units seen" value={String(report.distinctUnits)} />
              <Stat
                label="Baseline avg place"
                value={formatPlace(report.baselineAvgPlace)}
                title="Average finish of every board in this scope; the vs-avg column is measured against it."
              />
              <Stat
                label="Unclassified"
                value={
                  report.unclassified === null
                    ? "no aggregate"
                    : `${formatPercent(report.unclassified.share, 1)}`
                }
                title="Share of boards in scope that the published comps could not name, from the latest aggregation."
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              {report.unclassified === null
                ? `No comp_stats aggregation exists for this patch yet, so the unclassified share is not claimed. Every mined board counts as unclassified until the published comps have been aggregated.`
                : `${(report.unclassified.boards - report.unclassified.classified).toLocaleString("en-GB")} of ${report.unclassified.boards.toLocaleString("en-GB")} boards were not claimed by any published comp, from the latest aggregation. Boards that match nothing are counted and shown, not hidden.`}
            </p>
          </section>

          <section className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">Candidate shapes</h2>
              <p className="text-[11px] text-muted">
                best placement first · redundant subsets removed
              </p>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
              A set is reported only when no larger set already explains 90% of its boards,
              so these are distinct shapes rather than every subset of a popular board. The
              core order is the miner&apos;s; &ldquo;vs avg&rdquo; is the shape&apos;s average
              finish against the whole sample, positive meaning better.
            </p>

            {report.candidates.length === 0 ? (
              <div className="mt-3">
                <DataNote>
                  No shape reaches {LAB_MIN_GAMES} boards on patch {report.scope.patch} yet.
                  That is a statement about the crawl, not about the ladder — the threshold
                  drops as more boards land, and a shape below it is not evidence yet.
                </DataNote>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {report.candidates.map((candidate, index) => (
                  <CandidateCard
                    key={candidate.units.map((unit) => unit.id).join("-")}
                    candidate={candidate}
                    rank={index + 1}
                  />
                ))}
              </div>
            )}
          </section>

          <p className="mt-8 text-[11px] leading-relaxed text-muted">
            How this is measured: every board is one player&apos;s final board in a crawled
            match from the Master+ ladder; units are the ids the client returned, and traits
            are only those that reached a breakpoint. A candidate&apos;s item shares are
            measured on boards containing the whole core, so they are not averaged over
            boards playing something else. Counts and finishes are the evidence; naming a
            comp, choosing its items and writing why-now is still editorial work in{" "}
            <code className="text-fg/70">src/content/comps.ts</code>. The scopes and
            thresholds match <code className="text-fg/70">npm run crawl -- candidates</code>.
          </p>
        </>
      )}
    </div>
  );
}
