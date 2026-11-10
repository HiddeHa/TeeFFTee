import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CoachingCTA } from "@/components/coaching-cta";
import { CompBoard } from "@/components/comp-board";
import { DataNote } from "@/components/data-note";
import { TierBadge } from "@/components/tier-badge";
import { comps } from "@/content/comps";
import { METHODOLOGY, site } from "@/content/site";
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
    alternates: { canonical: `/comps/${comp.slug}` },
    openGraph: {
      title: `${comp.name} — tier ${comp.tier}`,
      description: comp.summary,
      url: `/comps/${comp.slug}`,
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
  children,
}: {
  title: string;
  kicker?: string;
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
      <div className="prose-block mt-3 text-sm">{children}</div>
    </section>
  );
}

export default async function CompPage({ params }: { params: Params }) {
  const { slug } = await params;
  const comp = await getComp(slug);
  if (!comp) notFound();

  const related = await getRelatedComps(slug, 3);
  const stats = comp.visibleStats;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/comps" className="hover:text-accent">
          Tier list
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
          </>
        ) : (
          <DataNote>
            No sample for this comp on the current filter. The stats strip fills in once
            the crawler has enough games for {site.currentPatch} — until then this page
            shows the comp without numbers rather than a guessed one.
          </DataNote>
        )}
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

          <Section kicker="Read" title={`Why it is rated ${comp.tier} right now`}>
            <p>{comp.notes.whyNow}</p>
          </Section>

          <Section kicker="Execute" title="How to play it">
            <p>{comp.notes.howToPlay}</p>
          </Section>

          <Section kicker="Avoid" title="What goes wrong">
            <p>{comp.notes.mistakes}</p>
          </Section>

          <div className="mt-10">
            <CoachingCTA variant="inline" placement={`comp_detail_${comp.slug}`} />
          </div>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Leveling
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg/80">{comp.leveling}</p>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Augments
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
                    href={`/comps/${entry.slug}`}
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
