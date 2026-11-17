import type { Metadata } from "next";
import Link from "next/link";

import { CompStatsTable } from "@/components/comp-stats-table";
import { CompViewTabs } from "@/components/comp-view-tabs";
import { DataAsOf } from "@/components/data-as-of";
import { Set19LaunchBand } from "@/components/set-19-launch-band";
import { site } from "@/content/site";
import { listComps } from "@/lib/data";
import { formatGames, formatPercent } from "@/lib/format";
import {
  aggregationAgeMinutes,
  isStaleAge,
  loadDataHealth,
  type DataHealth,
} from "@/lib/data-health";
import { loadTraitCatalogue } from "@/lib/traits";

export const metadata: Metadata = {
  title: "Comp stats",
  description:
    "Every figure measured for each Teamfight Tactics comp: games, average placement, top-4, win and pick rates, board cost, core units and the consensus letters behind the tier list.",
  alternates: { canonical: "/meta/stats" },
};

export const revalidate = 300;

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

function HealthValue({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="stat-value mt-0.5 text-sm font-semibold">{value}</p>
      <p className="text-[10px] leading-tight text-muted">{note}</p>
    </div>
  );
}

function DataHealthBlock({ health }: { health: DataHealth | null }) {
  if (health === null) {
    return (
      <div className="mt-2 text-xs leading-relaxed text-muted">
        No crawler database is attached here, so there is no aggregation to report. A number
        that would have come from the crawl is absent rather than shown as zero.
      </div>
    );
  }

  const age = health.aggregation ? aggregationAgeMinutes(health.aggregation.at) : null;
  const stale = isStaleAge(age);

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <HealthValue
          label="Corpus"
          value={`${formatGames(health.matches)} matches`}
          note={`${health.boards.toLocaleString("en-GB")} Master+ boards`}
        />
        <HealthValue
          label="Aggregated"
          value={health.aggregation ? formatStamp(health.aggregation.at) : "not yet"}
          note={age === null ? "run npm run crawl -- aggregate" : formatAge(age)}
        />
        <HealthValue
          label="Unclassified"
          value={
            health.aggregation ? formatPercent(health.aggregation.share, 1) : "no aggregate"
          }
          note={
            health.aggregation
              ? `${(
                  health.aggregation.boards - health.aggregation.classified
                ).toLocaleString("en-GB")} of ${health.aggregation.boards.toLocaleString("en-GB")} boards`
              : "nothing to classify yet"
          }
        />
      </div>

      {stale ? (
        <p className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-[11px] leading-relaxed text-bad">
          The last aggregation is {age === null ? "unreadable" : formatAge(age)} old. The crawl
          loop re-aggregates every 30 minutes, so this usually means the crawler stopped or its
          Riot key expired — the numbers below are from that older snapshot.
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        {health.matches === 0
          ? `No crawled matches for patch ${health.patch} yet, so the table below is the curated snapshot.`
          : `Boards that no published comp claims are counted rather than hidden: the share above is the remainder after every comp's games are subtracted from the aggregation's board total. A rising rate means the comps have stopped describing what the ladder plays.`}
      </p>
    </>
  );
}

export default async function CompStatsPage() {
  const comps = await listComps();
  // Trait ids become names here; an id the catalogue cannot resolve keeps its raw
  // form and says so, exactly as it does on a comp page.
  const traits = await loadTraitCatalogue(site.setNumber);
  // The crawler's own numbers, not a derived stat: this is what shows a broken
  // crawl before a reader notices the table stopped moving.
  const health = await loadDataHealth(site.setNumber, site.currentPatch);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <Set19LaunchBand />

      <header className="py-10">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Set {site.setNumber} · patch {site.currentPatch}
          </p>
          <DataAsOf stats={comps.map((comp) => comp.visibleStats)} />
        </div>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Stats</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {comps.length === 0
            ? `No Set ${site.setNumber} comps are published yet, so this table is empty. The data-health block above still reports the crawler, and the table fills once comps exist for this set.`
            : `Every column this site can fill for all ${comps.length} comps: the consensus letters behind the tier list, the authored board read against the set catalogue, and the crawl sample — games, average placement, top-4, win, pick and the confidence floor the ranking uses.`}
        </p>
      </header>

      <section className="card mb-4 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Data health</h2>
          <span className="chip">patch {site.currentPatch}</span>
        </div>
        <DataHealthBlock health={health} />
      </section>

      <CompViewTabs active="stats" />

      <CompStatsTable comps={comps} traits={traits} />

      <p className="mt-6 text-sm text-muted">
        Prefer the bands?{" "}
        <Link href="/meta" className="font-semibold text-accent hover:underline">
          Back to the meta
        </Link>
        .
      </p>
    </div>
  );
}
