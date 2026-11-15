import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { CoachingCTA } from "@/components/coaching-cta";
import { CompBoard } from "@/components/comp-board";
import { DataNote } from "@/components/data-note";
import { ItemPriority } from "@/components/item-priority";
import { PositioningBoard } from "@/components/positioning-board";
import { StagePlan } from "@/components/stage-plan";
import { TierBadge } from "@/components/tier-badge";
import { comps } from "@/content/comps";
import { guides } from "@/content/guides";
import { METHODOLOGY, site } from "@/content/site";
import { encodeCompBoard } from "@/lib/board-codec";
import { getComp, getRelatedComps } from "@/lib/data";
import { formatDate, formatGames, formatPercent, formatPlace } from "@/lib/format";

// Stats are materialised by the crawler; revalidate so a fresh aggregation shows
// up without a redeploy.
export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return comps.filter((comp) => comp.published).map((comp) => ({ slug: comp.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const comp = await getComp(slug);
  if (!comp) return { title: "Comp not found" };

  return {
    title: `${comp.name} — tier ${comp.tier}`,
    description: comp.summary,
    alternates: { canonical: `/meta/${comp.slug}` },
    openGraph: {
      title: `${comp.name} — tier ${comp.tier}`,
      description: comp.summary,
      url: `/meta/${comp.slug}`,
    },
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="stat-value mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Section({
  title,
  kicker,
  hint,
  children,
}: {
  title: string;
  kicker?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      {kicker ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          {kicker}
        </p>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      <div className="prose-block mt-3 text-sm">{children}</div>
    </section>
  );
}

export default async function CompPage({ params }: { params: Params }) {
  const { slug } = await params;
  const comp = await getComp(slug);
  if (!comp) notFound();

  const related = await getRelatedComps(slug, 3);
  const relatedGuides = guides
    .filter((guide) => guide.compSlugs.includes(comp.slug))
    .slice(0, 3);
  const stats = comp.visibleStats;
  const builderHref = `/teambuilder?b=${encodeCompBoard(comp.board, comp.positioning)}`;
  const core = comp.visibleBoard.filter((unit) => comp.coreUnits.includes(unit.id));
  const flex = comp.visibleBoard.filter((unit) => !comp.coreUnits.includes(unit.id));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/meta" className="hover:text-accent">
          Meta
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">{comp.name}</span>
      </nav>

      <header className="mt-4 flex items-start gap-4">
        <TierBadge tier={comp.tier} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">{comp.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {comp.summary}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">Patch {comp.patch}</span>
            <span className="chip">{comp.playstyle}</span>
            <span className="chip">{comp.difficulty}</span>
            <span className="chip">Tier {comp.tier}</span>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="mt-6">
        {stats ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat label="Avg place" value={formatPlace(stats.avgPlace)} />
              <Stat label="Top 4" value={formatPercent(stats.top4Rate)} />
              <Stat label="Win" value={formatPercent(stats.winRate)} />
              <Stat label="Pick" value={formatPercent(stats.pickRate)} />
              <Stat label="Games" value={formatGames(stats.games)} />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {stats.region === "all" ? "All regions" : stats.region} · {stats.rankBucket} ·
              top-4 confidence floor{" "}
              {formatPercent(stats.top4CiLow)} · computed {formatDate(stats.computedAt)}
            </p>
            <p className="mt-1 text-[11px] text-muted/80">
              These five figures use this site&apos;s assignment rule — a board counts
              when it shares 60% of the core. The notes below sometimes quote a narrower
              signature (named units, named sample), which is a different and equally
              measured question.
            </p>
          </>
        ) : (
          <DataNote>
            No sample for this comp on the current filter. The stats strip fills in once
            the crawler has enough games for {site.currentPatch} — until then this page
            shows the comp without numbers rather than a guessed one.
          </DataNote>
        )}
      </section>

      {/* The six answers the guide standard requires up front: play it if, leave
          when, and the one case where the guide is wrong. Above the fold because
          they decide whether the rest of the page is worth reading. */}
      <section className="mt-8 grid gap-3 md:grid-cols-3">
        <div className="card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Only play it if
          </h2>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-fg/80">
            {comp.preconditions.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Leave it when
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg/80">{comp.abandon.when}</p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-accent">
            Play instead
          </p>
          <p className="mt-1 text-sm leading-relaxed text-fg/80">{comp.abandon.instead}</p>
        </div>

        <div className="card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-bad">
            Where this guide is wrong
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg/80">{comp.counterCase}</p>
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="text-xl font-semibold">The board</h2>
          <p className="mt-1 text-xs text-muted">
            Names, costs and icons come from the Set {comp.setNumber} catalogue. Border
            colour is champion cost; stars are the target star level.
          </p>
          <div className="mt-3">
            <CompBoard board={comp.visibleBoard} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link href={builderHref} className="btn btn-ghost btn-sm">
              Open in the teambuilder
            </Link>
            <span className="text-[11px] text-muted">
              The same champions, stars and items on a hex board you can rearrange.
            </span>
          </div>

          {comp.visiblePositioning ? (
            <Section
              kicker="Positioning"
              title="Starting layout"
              hint="Hand-placed for this comp — the match payload has no board coordinates, so this is a default to adjust, not a measured one."
            >
              <PositioningBoard units={comp.visiblePositioning} />
            </Section>
          ) : null}

          <Section
            kicker="Items"
            title="Item priority"
            hint="Best in slot first, then the components to settle for."
          >
            <ItemPriority entries={comp.visibleItemPriority} />
          </Section>

          <Section
            kicker="Plan"
            title="What to do each stage"
            hint="The leveling plan above, broken at the points where the decision changes."
          >
            <StagePlan stages={comp.stages} />
          </Section>

          <Section kicker="Read" title={`Why it is rated ${comp.tier} right now`}>
            <p>{comp.notes.whyNow}</p>
          </Section>

          <Section kicker="Execute" title="How to play it">
            <p>{comp.notes.howToPlay}</p>
          </Section>

          <Section kicker="Avoid" title="What goes wrong">
            <p>{comp.notes.mistakes}</p>
          </Section>

          {relatedGuides.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                The method behind this page
              </h2>
              <ul className="mt-3 space-y-2">
                {relatedGuides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="card group flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 p-4 transition-colors hover:border-accent/40 hover:bg-raised"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold group-hover:text-accent">
                          {guide.title}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted">
                          {guide.dek}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {guide.readingMinutes} min read
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                <Link href="/guides" className="text-accent hover:underline">
                  All guides
                </Link>{" "}
                — the method, and the fundamentals underneath it.
              </p>
            </section>
          ) : null}

          <div className="mt-10">
            <CoachingCTA variant="inline" placement={`comp_detail_${comp.slug}`} />
          </div>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Why tier {comp.tier}
            </h2>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="stat-value text-2xl font-semibold">
                {comp.consensus.score.toFixed(2)}
              </p>
              <p className="text-[11px] text-muted">
                average of {comp.consensus.sources.length} published tier lists
              </p>
            </div>
            <ul className="mt-3 space-y-1.5 text-[11px]">
              {comp.consensus.sources.map((source) => (
                <li
                  key={`${comp.slug}-${source.source}`}
                  className="flex items-baseline justify-between gap-2 border-b border-line/50 pb-1 last:border-0"
                >
                  <span className="min-w-0 truncate text-muted">{source.source}</span>
                  <span className="shrink-0 font-semibold text-fg/90">{source.tier}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted/80">
              S and S+ count as 4, A as 3, B as 2, C as 1, D as 0. Bands: S ≥ 3.5, A ≥
              2.5, B ≥ 1.5. The letters are how the meta sites rate this board — the
              sample numbers are ours.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Leveling
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg/80">{comp.leveling}</p>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Augment priority
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {comp.augmentPriority.map((category, index) => (
                <Fragment key={category}>
                  {index > 0 ? (
                    <span aria-hidden className="text-xs text-muted/60">
                      →
                    </span>
                  ) : null}
                  <span className="chip">{category}</span>
                </Fragment>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted/80">
              Ordered by category, not scored per augment: the corpus has no augment rows
              for this set yet, so a per-augment ranking would be invented.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Recommended augments
            </h2>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-fg/80">
              {comp.augments.map((augment) => (
                <li key={augment} className="flex gap-2">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span>{augment}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Core and flex
            </h2>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Core
                </p>
                <p className="mt-1 text-fg/80">{core.map((unit) => unit.name ?? unit.id).join(" · ")}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Flex
                </p>
                <p className="mt-1 text-fg/80">{flex.map((unit) => unit.name ?? unit.id).join(" · ")}</p>
              </div>
            </div>
          </div>

          {comp.matchups ? (
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Matchups
              </h2>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-good">
                    Beats
                  </p>
                  <ul className="mt-1 space-y-1 text-fg/80">
                    {comp.matchups.beats.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-bad">
                    Loses to
                  </p>
                  <ul className="mt-1 space-y-1 text-fg/80">
                    {comp.matchups.losesTo.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Other comps
            </h2>
            <ul className="mt-3 space-y-2">
              {related.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/meta/${entry.slug}`}
                    className="flex items-center gap-2 text-sm hover:text-accent"
                  >
                    <TierBadge tier={entry.tier} size="sm" />
                    <span className="truncate">{entry.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="mt-12 space-y-3">
        <DataNote>{METHODOLOGY.assignment}</DataNote>
        <p className="text-xs text-muted">
          Last reviewed {formatDate(comp.updatedAt)}. Comps are re-checked every patch —
          see the{" "}
          <Link href={`/patch/${comp.patch}`} className="text-accent hover:underline">
            {comp.patch} patch read
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
