import type { Metadata } from "next";
import Link from "next/link";

import { CompStatsTable } from "@/components/comp-stats-table";
import { CompViewTabs } from "@/components/comp-view-tabs";
import { site } from "@/content/site";
import { listComps } from "@/lib/data";
import { loadTraitCatalogue } from "@/lib/traits";

export const metadata: Metadata = {
  title: "Comp stats",
  description:
    "Every figure measured for each Teamfight Tactics comp: games, average placement, top-4, win and pick rates, board cost, core units and the consensus letters behind the tier list.",
  alternates: { canonical: "/comps/stats" },
};

export const revalidate = 300;

export default async function CompStatsPage() {
  const comps = await listComps();
  // Trait ids become names here; an id the catalogue cannot resolve keeps its raw
  // form and says so, exactly as it does on a comp page.
  const traits = await loadTraitCatalogue(site.setNumber);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {site.setNumber} · patch {site.currentPatch}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Stats</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Every column this site can fill for all {comps.length} comps: the consensus
          letters behind the tier list, the authored board read against the set
          catalogue, and the crawl sample — games, average placement, top-4, win, pick
          and the confidence floor the ranking uses.
        </p>
      </header>

      <CompViewTabs active="stats" />

      <CompStatsTable comps={comps} traits={traits} />

      <p className="mt-6 text-sm text-muted">
        Prefer the bands?{" "}
        <Link href="/comps" className="font-semibold text-accent hover:underline">
          Back to the tier list
        </Link>
        .
      </p>
    </div>
  );
}
