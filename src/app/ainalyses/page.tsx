import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AssetImage } from "@/components/asset-image";
import { DataNote } from "@/components/data-note";
import { ItemIcon } from "@/components/item-icon";
import { site } from "@/content/site";
import {
  analyseBoards,
  type PatternSample,
  type ResolvedItem,
  type ResolvedUnit,
} from "@/lib/analysis";
import { classNames, formatDate, formatPercent, formatPlace } from "@/lib/format";

/**
 * AInalyses — what the crawled boards say, mined rather than guessed.
 *
 * Forced dynamic for the same reason the leaderboard is: every number is a
 * database aggregate whose answer changes as the crawler runs, and a prerendered
 * build would freeze whatever the build machine happened to see.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AInalyses",
  description: `Pattern mining over every crawled Set ${site.setNumber} TFT board: the units, items, item/unit pairings and traits that show up most, with how those boards placed.`,
  alternates: { canonical: "/ainalyses" },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-2.5">
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

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <span
        className={classNames(
          "stat-value text-xs font-semibold",
          tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-fg/80",
        )}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-muted">{label}</span>
    </span>
  );
}

/** A catalogue name, or the raw id — never an invented label. */
function Name({ value, id }: { value: string | null; id: string }) {
  if (value) return <>{value}</>;
  return <span className="font-mono text-[11px] text-muted/70">{id}</span>;
}

function Tile({ unit, size = 24 }: { unit: ResolvedUnit; size?: number }) {
  return (
    <span
      title={unit.name ?? `${unit.id} — not in the set catalogue`}
      style={{ width: size, height: size }}
      className="block overflow-hidden rounded border border-line bg-surface"
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

/**
 * One mined row. Every table on this page is the same five facts — what, how
 * many, average finish, finish against the sample average, top-4 share — so they
 * share one row rather than four nearly identical ones.
 */
function PatternRow({
  rank,
  leading,
  title,
  subtitle,
  pattern,
  sampleLabel,
}: {
  rank: number;
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  pattern: PatternSample;
  sampleLabel: string;
}) {
  return (
    <li className="card flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
      <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted">{rank}</span>
      <span className="flex shrink-0 items-center gap-1.5">{leading}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-end gap-3">
        <StatCell label={sampleLabel} value={pattern.sample.toLocaleString("en-GB")} />
        <StatCell label="avg" value={formatPlace(pattern.avgPlace)} />
        <StatCell
          label="vs avg"
          value={formatGain(pattern.placeGain)}
          tone={pattern.placeGain > 0 ? "good" : pattern.placeGain < 0 ? "bad" : undefined}
        />
        <StatCell label="top 4" value={formatPercent(pattern.top4Rate, 0)} />
      </span>
    </li>
  );
}

function Section({
  title,
  dek,
  children,
}: {
  title: string;
  dek: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">{dek}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function AInalysesPage() {
  const analysis = await analyseBoards(site.setNumber);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">AInalyses</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Pattern mining · Set {site.setNumber}
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">AInalyses</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Every final board the crawler stored for this set, grouped by what repeats: units,
          the pairs and trios of units that share a board, items, the item a specific unit
          actually held, and the traits boards reached. No model and no prediction — each row is
          a count with the finish that came with it, so the evidence is visible instead of
          asserted.
        </p>
        {analysis.kind === "ok" ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">set {analysis.summary.setNumber}</span>
            <span className="chip">
              {analysis.summary.patches.length > 0
                ? `patch ${analysis.summary.patches.join(", ")}`
                : "patch unknown"}
            </span>
            <span className="chip">{analysis.summary.matches.toLocaleString("en-GB")} matches</span>
            <span className="chip">
              {analysis.summary.boards.toLocaleString("en-GB")} boards
            </span>
            <span className="chip" title="When the crawler last mined this snapshot">
              snapshot {formatDate(analysis.summary.computedAt)}
            </span>
          </div>
        ) : null}
      </header>

      {analysis.kind === "unavailable" ? (
        <div className="mt-6">
          <DataNote>
            No crawl data is attached here. AInalyses reads the crawler&apos;s Postgres, and
            nothing is connected to it in this environment — so there are no boards to mine.
            Run the crawler against a database, or open this page where{" "}
            <code className="text-fg/70">DATABASE_URL</code> is set, and the patterns fill in.
            Nothing is estimated in the meantime.
          </DataNote>
        </div>
      ) : analysis.kind === "not-materialised" ? (
        <div className="mt-6">
          <DataNote>
            The database is connected but has never mined Set {site.setNumber}. AInalyses
            reads a snapshot the crawler materialises, not the raw boards — run{" "}
            <code className="text-fg/70">npm run crawl -- patterns</code>, or let the crawl
            loop reach its aggregation timer, and the patterns fill in. Nothing is estimated
            in the meantime.
          </DataNote>
        </div>
      ) : analysis.summary.boards === 0 ? (
        <div className="mt-6">
          <DataNote>
            The database is connected but has no crawled boards for Set {site.setNumber} yet.
            Patterns appear once <code className="text-fg/70">npm run crawl -- once</code> has
            fetched matches for this set; there is nothing to report before that, and zeroes
            would read as measurements.
          </DataNote>
        </div>
      ) : (
        <>
          <section className="mt-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat label="Boards" value={analysis.summary.boards.toLocaleString("en-GB")} />
              <Stat label="Matches" value={analysis.summary.matches.toLocaleString("en-GB")} />
              <Stat label="Avg place" value={formatPlace(analysis.summary.avgPlace)} />
              <Stat label="Top 4" value={formatPercent(analysis.summary.top4Rate, 0)} />
              <Stat
                label="Units / items"
                value={`${analysis.summary.unitsSeen} / ${analysis.summary.itemsSeen}`}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              The last row is the pool each pattern is drawn from: every unit id and item id seen
              in the sample, not just the ones that clear the threshold. The average placement and
              top-4 rate above are the baseline every &ldquo;vs avg&rdquo; column is measured against.
            </p>
          </section>

          <Section
            title="Units"
            dek={`Units on at least ${analysis.summary.minSample} boards, most-played first. A unit that places better than the sample average is being played on boards that win — which is a correlation, not proof the unit causes it. The items under each name are the two it held most often.`}
          >
            {analysis.units.length === 0 ? (
              <DataNote>
                No unit reaches {analysis.summary.minSample} boards in this sample, so there is no
                pattern worth reporting yet.
              </DataNote>
            ) : (
              <ul className="space-y-1.5">
                {analysis.units.map((unit, index) => (
                  <PatternRow
                    key={unit.id}
                    rank={index + 1}
                    leading={<Tile unit={unit} />}
                    title={<Name value={unit.name} id={unit.id} />}
                    subtitle={
                      <>
                        <span>{unit.cost !== null ? `${unit.cost}-cost` : "cost unknown"}</span>
                        <span aria-hidden>·</span>
                        <span className="stat-value">{unit.avgStar.toFixed(1)}★</span>
                        {unit.items.length > 0 ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="flex items-center gap-1">
                              {unit.items.map((item) => (
                                <ItemIcon key={item.id} item={item} size={14} />
                              ))}
                            </span>
                          </>
                        ) : null}
                      </>
                    }
                    pattern={unit}
                    sampleLabel="boards"
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Units together"
            dek={`Pairs drawn from the ${analysis.units.length} most-played units that shared at least ${analysis.summary.minSample} boards, strongest pairing first. The percentage is boards holding both out of boards holding either — a pair that is always played together reads high even if neither unit is everywhere, which a raw count would hide. “Vs solo” is the pair's average finish against the two units' own averages: positive means they finished better together than they do apart.`}
          >
            {analysis.unitPairs.length === 0 ? (
              <DataNote>
                No two of the most-played units share {analysis.summary.minSample} boards in this
                sample yet, so there is no pairing to report. A thin crawl answers this section
                last — the unit and item lists above fill in first.
              </DataNote>
            ) : (
              <ul className="space-y-1.5">
                {analysis.unitPairs.map((pair, index) => (
                  <PatternRow
                    key={`${pair.a.id}-${pair.b.id}`}
                    rank={index + 1}
                    leading={
                      <>
                        <Tile unit={pair.a} />
                        <span aria-hidden className="text-[10px] text-muted">
                          +
                        </span>
                        <Tile unit={pair.b} />
                      </>
                    }
                    title={
                      <>
                        <Name value={pair.a.name} id={pair.a.id} />
                        <span className="text-muted"> &amp; </span>
                        <Name value={pair.b.name} id={pair.b.id} />
                      </>
                    }
                    subtitle={
                      <>
                        <span className="stat-value text-fg/80">
                          {formatPercent(pair.overlap, 0)}
                        </span>
                        <span>of boards with either</span>
                        <span aria-hidden>·</span>
                        <span>vs solo</span>
                        <span
                          className={classNames(
                            "stat-value",
                            pair.togetherGain > 0
                              ? "text-good"
                              : pair.togetherGain < 0
                                ? "text-bad"
                                : "text-fg/80",
                          )}
                        >
                          {formatGain(pair.togetherGain)}
                        </span>
                      </>
                    }
                    pattern={pair}
                    sampleLabel="boards"
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Three-unit cores"
            dek={`Every three of the ${analysis.units.length} most-played units that shared at least ${analysis.summary.minSample} boards, ranked by how much of the boards playing any of the three the trio covers. This is the shell question: 80% means four in five boards that played at least one of them played all three, which is a core rather than three popular champions that happen to overlap. A trio can never cover more boards than its least-played member sits on, so the ceiling is set by that unit. “Vs solo” is the trio's average finish against the three units' own averages.`}
          >
            {analysis.unitTrios.length === 0 ? (
              <DataNote>
                No three of the most-played units share {analysis.summary.minSample} boards in
                this sample yet. Trios fill in last: a crawl needs several boards per match-up
                before three champions can be said to recur together.
              </DataNote>
            ) : (
              <ul className="space-y-1.5">
                {analysis.unitTrios.map((trio, index) => (
                  <PatternRow
                    key={trio.units.map((unit) => unit.id).join("-")}
                    rank={index + 1}
                    leading={
                      <>
                        {trio.units.map((unit, position) => (
                          <span key={unit.id} className="flex items-center gap-1.5">
                            {position > 0 ? (
                              <span aria-hidden className="text-[10px] text-muted">
                                +
                              </span>
                            ) : null}
                            <Tile unit={unit} />
                          </span>
                        ))}
                      </>
                    }
                    title={
                      <>
                        {trio.units.map((unit, position) => (
                          <span key={unit.id}>
                            {position > 0 ? (
                              <span className="text-muted">, </span>
                            ) : null}
                            <Name value={unit.name} id={unit.id} />
                          </span>
                        ))}
                      </>
                    }
                    subtitle={
                      <>
                        <span className="stat-value text-fg/80">
                          {formatPercent(trio.overlap, 0)}
                        </span>
                        <span>of boards with any of the three</span>
                        <span aria-hidden>·</span>
                        <span>vs solo</span>
                        <span
                          className={classNames(
                            "stat-value",
                            trio.togetherGain > 0
                              ? "text-good"
                              : trio.togetherGain < 0
                                ? "text-bad"
                                : "text-fg/80",
                          )}
                        >
                          {formatGain(trio.togetherGain)}
                        </span>
                      </>
                    }
                    pattern={trio}
                    sampleLabel="boards"
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Items"
            dek={`Every item on at least ${analysis.summary.minSample} slots, most-held first. Slots are counted per unit, so a board with the same item on two champions contributes two. The holder is the unit that had it most often among the mined units — the closest thing this data has to "this item belongs on that champion".`}
          >
            {analysis.items.length === 0 ? (
              <DataNote>
                No item reaches {analysis.summary.minSample} slots in this sample. That is a
                statement about the crawl, not about the set — check{" "}
                <code className="text-fg/70">npm run crawl -- stats</code> before reading anything
                into it.
              </DataNote>
            ) : (
              <ul className="space-y-1.5">
                {analysis.items.map((item, index) => {
                  const holder = item.holder;
                  return (
                    <PatternRow
                      key={item.id}
                      rank={index + 1}
                      leading={<ItemIcon item={item} size={24} />}
                      title={<Name value={item.name} id={item.id} />}
                      subtitle={
                        <>
                          <span>{item.kind ?? "kind unknown"}</span>
                          <span aria-hidden>·</span>
                          {holder ? (
                            <span className="flex min-w-0 items-center gap-1">
                              <span>held most by</span>
                              <Tile unit={holder} size={14} />
                              <span className="truncate text-fg/80">
                                <Name value={holder.name} id={holder.id} />
                              </span>
                              <span className="stat-value">{formatPercent(holder.share, 0)}</span>
                            </span>
                          ) : (
                            <span>held outside the mined units</span>
                          )}
                        </>
                      }
                      pattern={item}
                      sampleLabel="slots"
                    />
                  );
                })}
              </ul>
            )}
          </Section>

          <Section
            title="Popular unit × item"
            dek={`The item a specific unit actually held most often: every pair with at least ${analysis.summary.minPairSample} slots, most-held first — the build, not the item. The percentage is of that unit's own item slots, so 60% means most of this champion's items are that one. Ranked by how often it happens rather than how well it finished, because the most-built item is not automatically the best one; the section under this one asks that separate question.`}
          >
            {analysis.popularPairings.length === 0 ? (
              <DataNote>
                No unit/item pair reaches {analysis.summary.minPairSample} slots yet, so there is no
                build to show. The item totals above still stand on their own.
              </DataNote>
            ) : (
              <ul className="space-y-1.5">
                {analysis.popularPairings.map((pairing, index) => (
                  <PatternRow
                    key={`${pairing.unit.id}-${pairing.item.id}`}
                    rank={index + 1}
                    leading={
                      <>
                        <Tile unit={pairing.unit} />
                        <ItemIcon item={pairing.item} size={24} />
                      </>
                    }
                    title={
                      <>
                        <Name value={pairing.item.name} id={pairing.item.id} />
                        <span className="text-muted"> on </span>
                        <Name value={pairing.unit.name} id={pairing.unit.id} />
                      </>
                    }
                    subtitle={
                      <>
                        <span className="stat-value text-fg/80">
                          {formatPercent(pairing.share, 0)}
                        </span>
                        <span>of that unit&apos;s slots</span>
                        <span aria-hidden>·</span>
                        <span>{pairing.item.kind ?? "kind unknown"}</span>
                      </>
                    }
                    pattern={pairing}
                    sampleLabel="slots"
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Best-finishing item × unit"
            dek={`The pairings that finished better than the sample average, with at least ${analysis.summary.minPairSample} slots behind them, best first. Separate from the popularity list above on purpose: "Guinsoo's" being built most often says nothing about whether it is the item that wins, and "Guinsoo's on one specific carry" is the thing a board is built around. Sample size still decides how much of it to believe.`}
          >
            {analysis.pairings.length === 0 ? (
              <DataNote>
                No item/unit pairing clears {analysis.summary.minPairSample} slots while finishing
                above the sample average. With a thin crawl that is the expected answer; the pairs
                that exist are still in the two sections above.
              </DataNote>
            ) : (
              <ul className="space-y-1.5">
                {analysis.pairings.map((pairing, index) => (
                  <PatternRow
                    key={`${pairing.unit.id}-${pairing.item.id}`}
                    rank={index + 1}
                    leading={
                      <>
                        <Tile unit={pairing.unit} />
                        <span aria-hidden className="text-xs text-muted">
                          +
                        </span>
                        <ItemIcon item={pairing.item} size={24} />
                      </>
                    }
                    title={
                      <>
                        <Name value={pairing.item.name} id={pairing.item.id} />
                        <span className="text-muted"> on </span>
                        <Name value={pairing.unit.name} id={pairing.unit.id} />
                      </>
                    }
                    subtitle={
                      <>
                        <span>win rate</span>
                        <span className="stat-value text-fg/80">
                          {formatPercent(pairing.winRate, 1)}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{pairing.item.kind ?? "kind unknown"}</span>
                      </>
                    }
                    pattern={pairing}
                    sampleLabel="slots"
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Traits"
            dek={`Traits that actually reached a breakpoint, most-reached first. The average tier says how far into the trait boards usually got: 1 is the first breakpoint, 2 the second. A trait that was never active is not listed, because it is not something a board achieved.`}
          >
            {analysis.traits.length === 0 ? (
              <DataNote>
                No active trait reaches {analysis.summary.minSample} boards in this sample.
              </DataNote>
            ) : (
              <ul className="space-y-1.5">
                {analysis.traits.map((trait, index) => (
                  <PatternRow
                    key={trait.id}
                    rank={index + 1}
                    leading={
                      <span
                        title={trait.name ?? `${trait.id} — not in the trait catalogue`}
                        className="block h-6 w-6 overflow-hidden rounded border border-line bg-surface"
                      >
                        <AssetImage
                          src={trait.imageUrl}
                          width={24}
                          height={24}
                          className="h-6 w-6"
                          fallback={
                            <span className="flex h-6 w-6 items-center justify-center text-[8px] text-muted">
                              {trait.id.slice(-3)}
                            </span>
                          }
                        />
                      </span>
                    }
                    title={<Name value={trait.name} id={trait.id} />}
                    subtitle={
                      <>
                        <span>avg tier</span>
                        <span className="stat-value text-fg/80">{trait.avgTier.toFixed(1)}</span>
                      </>
                    }
                    pattern={trait}
                    sampleLabel="boards"
                  />
                ))}
              </ul>
            )}
          </Section>

          <p className="mt-10 text-[11px] leading-relaxed text-muted">
            What this is measured on: a snapshot the crawler mines from the boards it stored
            for Set{" "}
            {analysis.summary.setNumber}, one row per player per match — final boards only. There
            is no bench, no gold curve, no augment order and no positioning in the payload, so none
            of those are claimed here. A pair or a trio is units on the same board, and a pairing
            is one item on one unit — never two boards summed. Placement is the finish of the
            board that held the unit or
            item, and &ldquo;vs avg&rdquo; is that finish minus the sample&apos;s average finish
            (positive is better). A pattern below {analysis.summary.minSample} boards —{" "}
            {analysis.summary.minPairSample} slots for a pairing — is not reported at all. Rank
            describes which ladder the crawl was seeded from, not each player&apos;s rank in that
            game. Ids the set catalogue does not know keep their raw Riot name rather than a
            guessed one.
          </p>
        </>
      )}
    </div>
  );
}
