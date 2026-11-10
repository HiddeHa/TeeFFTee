import type { Metadata } from "next";
import Link from "next/link";

import { DataNote } from "@/components/data-note";
import { FilterRow } from "@/components/filter-row";
import { TierBadge } from "@/components/tier-badge";
import { METHODOLOGY, site } from "@/content/site";
import type { RankBucket, Region } from "@/content/types";
import { listComps, listPatches, totalGames } from "@/lib/data";
import { formatGames, formatPercent, formatPlace } from "@/lib/format";

export const metadata: Metadata = {
  title: "Tier list",
  description:
    "The current Teamfight Tactics comp tier list, built from Master, Grandmaster and Challenger games on EUW and KR, with sample sizes shown.",
  alternates: { canonical: "/comps" },
};

type SearchParams = Promise<{
  patch?: string;
  region?: string;
  rank?: string;
}>;

function parseRegion(value: string | undefined): Region | undefined {
  return site.regions.find((region) => region === value);
}

function parseRank(value: string | undefined): RankBucket | undefined {
  return site.rankBuckets.find((bucket) => bucket === value);
}

const RANK_LABELS: Record<RankBucket, string> = {
  "master+": "Master+",
  "diamond+": "Diamond+",
  all: "All ranks",
};

export default async function CompsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const patches = await listPatches();
  const patch = params.patch ?? site.currentPatch;
  const region = parseRegion(params.region);
  const rank = parseRank(params.rank) ?? "master+";

  const comps = await listComps({ patch, region, rank });
  const games = totalGames(comps);

  const current = {
    patch,
    region: params.region,
    rank: params.rank ?? "master+",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {site.setNumber} · patch {patch}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Tier list</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Ordered by the Wilson 95% lower bound of each comp's top-4 rate — a comp with
          5,000 games beats a comp with 40, even if the small sample looks better.
        </p>
      </header>

      <div className="card space-y-3 p-4">
        <FilterRow
          label="Patch"
          paramName="patch"
          basePath="/comps"
          current={current}
          activeValue={patch}
          options={patches.map((entry) => ({ label: entry.patch, value: entry.patch }))}
        />
        <FilterRow
          label="Region"
          paramName="region"
          basePath="/comps"
          current={current}
          activeValue={region ?? ""}
          options={[
            { label: "All regions", value: "" },
            ...site.regions.map((entry) => ({ label: entry, value: entry })),
          ]}
        />
        <FilterRow
          label="Rank"
          paramName="rank"
          basePath="/comps"
          current={current}
          activeValue={rank}
          options={site.rankBuckets.map((bucket) => ({
            label: RANK_LABELS[bucket],
            value: bucket,
          }))}
        />
      </div>

      <p className="mt-4 text-xs text-muted">
        {comps.length} comps · {formatGames(games)} games in this sample
        {region ? ` · ${region}` : ` · ${site.regions.join(" + ")}`} · {RANK_LABELS[rank]}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="py-2 pr-3 font-medium">Tier</th>
              <th className="py-2 pr-3 font-medium">Comp</th>
              <th className="py-2 pr-3 text-right font-medium">Avg place</th>
              <th className="py-2 pr-3 text-right font-medium">Top 4</th>
              <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Win</th>
              <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Pick</th>
              <th className="py-2 text-right font-medium">Games</th>
            </tr>
          </thead>
          <tbody>
            {comps.map((comp) => {
              const stats = comp.visibleStats;
              return (
                <tr
                  key={comp.slug}
                  className="border-b border-line/60 transition-colors hover:bg-raised"
                >
                  <td className="py-3 pr-3 align-top">
                    <TierBadge tier={comp.tier} />
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <Link
                      href={`/comps/${comp.slug}`}
                      className="font-semibold hover:text-accent"
                    >
                      {comp.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {comp.playstyle} · {comp.difficulty}
                    </p>
                    {stats ? null : (
                      <p className="mt-1 text-[11px] text-muted/80">
                        Collecting data for this filter
                      </p>
                    )}
                  </td>
                  <td className="stat-value py-3 pr-3 text-right align-top">
                    {stats ? formatPlace(stats.avgPlace) : "—"}
                  </td>
                  <td className="stat-value py-3 pr-3 text-right align-top">
                    {stats ? formatPercent(stats.top4Rate) : "—"}
                  </td>
                  <td className="stat-value hidden py-3 pr-3 text-right align-top sm:table-cell">
                    {stats ? formatPercent(stats.winRate) : "—"}
                  </td>
                  <td className="stat-value hidden py-3 pr-3 text-right align-top sm:table-cell">
                    {stats ? formatPercent(stats.pickRate) : "—"}
                  </td>
                  <td className="stat-value py-3 text-right align-top">
                    {stats ? formatGames(stats.games) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {comps.length === 0 ? (
        <div className="mt-6">
          <DataNote>
            No published comps yet for this patch. Add them in{" "}
            <code className="font-mono text-[11px]">src/content/comps.ts</code>.
          </DataNote>
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        <DataNote>{METHODOLOGY.bucket}</DataNote>
        <DataNote>{METHODOLOGY.confidence}</DataNote>
      </div>

      <p className="mt-6 text-sm text-muted">
        Want the reasoning behind a tier?{" "}
        <Link href="/coaching" className="font-semibold text-accent hover:underline">
          Coaching
        </Link>{" "}
        is where it gets specific to your games.
      </p>
    </div>
  );
}
