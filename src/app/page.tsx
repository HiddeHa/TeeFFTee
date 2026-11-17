import Link from "next/link";

import { CoachingCTA } from "@/components/coaching-cta";
import { DataNote } from "@/components/data-note";
import { Set19LaunchBand } from "@/components/set-19-launch-band";
import { TierBadge } from "@/components/tier-badge";
import { site } from "@/content/site";
import { getCurrentPatch, getRankedComps, listComps, totalGames } from "@/lib/data";
import { formatDate, formatGames, formatPercent, formatPlace } from "@/lib/format";

// The homepage leads with comp stats, which change as the crawler runs.
export const revalidate = 300;

export default async function HomePage() {
  const patch = await getCurrentPatch();
  const [ranked, masterPlus] = await Promise.all([
    getRankedComps(5),
    listComps({ patch: site.currentPatch, rank: "master+" }),
  ]);

  const games = totalGames(masterPlus);
  const compCount = masterPlus.length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <Set19LaunchBand />

      {/* Hero */}
      <section className="py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {site.setNumber} · {site.setCodename} · patch {site.currentPatch}
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
          High-elo TFT stats, read by someone who plays there.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Comps and numbers from Master, Grandmaster and Challenger games on{" "}
          {site.regions.join(" and ")} — with the reasoning attached. Built by a{" "}
          {site.author.peakRank} player who wants to know what the data says, not just
          what the tier list says.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/meta" className="btn btn-primary">
            See the meta
          </Link>
          <Link href={`/patch/${site.currentPatch}`} className="btn btn-ghost">
            Patch {site.currentPatch} read
          </Link>
        </div>

        <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Games sampled</dt>
            <dd className="stat-value mt-1 text-xl font-semibold">{formatGames(games)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Comps tracked</dt>
            <dd className="stat-value mt-1 text-xl font-semibold">{compCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Regions</dt>
            <dd className="stat-value mt-1 text-xl font-semibold">
              {site.regions.join(" · ")}
            </dd>
          </div>
        </dl>
      </section>

      {/* Top of the meta */}
      <section className="pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Top of the meta</h2>
          <Link href="/meta" className="text-sm text-muted hover:text-accent">
            Full meta →
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted">
          Ranked by the lower bound of their top-4 rate, so small samples cannot top the
          list.
        </p>

        <div className="mt-5 space-y-2">
          {ranked.length === 0 ? (
            <DataNote>
              {compCount === 0
                ? `No Set ${site.setNumber} comps are published yet. The meta is open and will fill once the crawler has boards to classify — Set 18 comps are not carried over as if they described this set.`
                : `No comp has a sample yet for patch ${site.currentPatch}. The crawler fills this in within a few hours of a patch going live.`}
            </DataNote>
          ) : (
            ranked.map((comp) => {
              const stats = comp.visibleStats;
              return (
                <Link
                  key={comp.slug}
                  href={`/meta/${comp.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent/40 hover:bg-raised"
                >
                  <TierBadge tier={comp.tier} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold group-hover:text-accent">
                      {comp.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {comp.playstyle} · {comp.difficulty}
                    </p>
                  </div>
                  {stats ? (
                    <div className="hidden items-center gap-6 text-right sm:flex">
                      <div>
                        <p className="stat-value text-sm font-semibold">
                          {formatPercent(stats.top4Rate)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted">
                          Top 4
                        </p>
                      </div>
                      <div>
                        <p className="stat-value text-sm font-semibold">
                          {formatPlace(stats.avgPlace)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted">
                          Avg place
                        </p>
                      </div>
                      <div className="w-14">
                        <p className="stat-value text-sm font-semibold">
                          {formatGames(stats.games)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted">
                          Games
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="chip shrink-0">Collecting data</span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Patch + method */}
      <section className="grid gap-4 py-10 md:grid-cols-5">
        {patch ? (
          <article className="card p-6 md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Patch {patch.patch} · {formatDate(patch.releasedAt)}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{patch.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{patch.summary}</p>
            <p className="mt-4 text-sm leading-relaxed text-fg/80">
              {patch.metaRead.paragraphs[0]}
            </p>
            <Link
              href={`/patch/${patch.patch}`}
              className="mt-5 inline-block text-sm font-semibold text-accent hover:underline"
            >
              Read the full patch read →
            </Link>
          </article>
        ) : null}

        <aside className="card p-6 md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            How the numbers work
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-fg/80">
            <li>High-elo ladders only — no Emerald noise in the averages.</li>
            <li>Every stat carries its sample size.</li>
            <li>Ranked by confidence, not by whichever comp had a lucky week.</li>
            <li>No player names, no match histories, aggregates only.</li>
          </ul>
          <Link
            href="/about"
            className="mt-5 inline-block text-sm font-semibold text-accent hover:underline"
          >
            Full methodology →
          </Link>
        </aside>
      </section>

      <section className="pb-6">
        <CoachingCTA variant="band" placement="home_band" />
      </section>
    </div>
  );
}
