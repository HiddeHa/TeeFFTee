import type { Metadata } from "next";
import Link from "next/link";

import { AssetImage } from "@/components/asset-image";
import { CompViewTabs } from "@/components/comp-view-tabs";
import { DataAsOf } from "@/components/data-as-of";
import { DataNote } from "@/components/data-note";
import { Set19LaunchBand } from "@/components/set-19-launch-band";
import { METHODOLOGY, site } from "@/content/site";
import type { BoardUnit, Tier } from "@/content/types";
import { COST_BORDER } from "@/lib/costs";
import { TIER_ORDER, listComps, type CompListItem } from "@/lib/data";
import { classNames, formatGames, formatPercent, formatPlace } from "@/lib/format";

export const metadata: Metadata = {
  title: "Meta",
  description:
    "A Teamfight Tactics tier list built from the average of nine published tier lists, with every source's letter shown so the consensus can be checked.",
  alternates: { canonical: "/meta" },
};

export const revalidate = 300;

const BAND: Record<Tier, string> = {
  S: "bg-tier-s text-[#241a04]",
  A: "bg-tier-a text-[#04241a]",
  B: "bg-tier-b text-[#041a2c]",
  C: "bg-tier-c text-[#12161d]",
};

/**
 * Tier bands are cuts on the consensus score, not opinions of their own:
 * S ≥ 3.5, A ≥ 2.5, B ≥ 1.5, C below that. Written down here because a band with
 * an unstated threshold is just a vibe with a colour.
 */
const BAND_LABEL: Record<Tier, string> = {
  S: "3.5 and up",
  A: "2.5 – 3.49",
  B: "1.5 – 2.49",
  C: "below 1.5",
};

function UnitPortrait({ unit }: { unit: BoardUnit }) {
  return (
    <div
      className="flex w-[44px] shrink-0 flex-col items-center gap-1"
      title={`${unit.name ?? unit.id} · ${unit.cost === null ? "unknown cost" : `${unit.cost}c`}`}
    >
      <AssetImage
        src={unit.imageUrl}
        width={40}
        height={40}
        className={classNames(
          "h-10 w-10 rounded-md border-2 bg-surface object-cover",
          COST_BORDER[unit.cost ?? 0] ?? "border-line",
        )}
        fallback={
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-dashed border-line bg-surface text-[9px] text-muted"
          >
            {unit.name === null ? "?" : unit.name.slice(0, 2).toUpperCase()}
          </span>
        }
      />
      <span
        className={classNames(
          "w-full truncate text-center leading-tight",
          unit.name === null ? "font-mono text-[8px] text-muted/70" : "text-[9px] text-muted",
        )}
      >
        {unit.name ?? unit.id}
      </span>
    </div>
  );
}

function ConsensusCard({ comp }: { comp: CompListItem }) {
  const stats = comp.visibleStats;
  const sourceCount = comp.consensus.sources.length;

  return (
    <article className="flex flex-col rounded-lg border border-line bg-raised/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/meta/${comp.slug}`}
            className="block truncate font-semibold hover:text-accent"
          >
            {comp.name}
          </Link>
          <p className="mt-0.5 text-[11px] text-muted">
            {comp.playstyle} · {comp.difficulty}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="stat-value text-lg font-semibold leading-none">
            {comp.consensus.score.toFixed(2)}
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-wider text-muted">
            {sourceCount} sources
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {comp.visibleBoard.slice(0, 8).map((unit) => (
          <UnitPortrait key={unit.id} unit={unit} />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-1">
        {comp.consensus.sources.map((source) => (
          <li key={`${comp.slug}-${source.source}`} className="chip text-[10px]">
            <span className="text-muted">{source.source}</span>
            <span className="ml-1 font-semibold text-fg">{source.tier}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/60 pt-2 text-[11px] text-muted">
        {stats ? (
          <>
            <span>
              Top 4 <span className="stat-value text-fg/90">{formatPercent(stats.top4Rate)}</span>
            </span>
            <span>
              Avg <span className="stat-value text-fg/90">{formatPlace(stats.avgPlace)}</span>
            </span>
            <span className="ml-auto">{formatGames(stats.games)} games</span>
          </>
        ) : (
          <span className="text-muted/80">
            Our crawl has no sample for this board yet — the letter is consensus only.
          </span>
        )}
      </div>
    </article>
  );
}

function BoardView({ comps }: { comps: CompListItem[] }) {
  const byTier = (tier: Tier) =>
    comps
      .filter((comp) => comp.tier === tier)
      .sort((a, b) => b.consensus.score - a.consensus.score);

  return (
    <>
      <div className="card mt-4 space-y-3 p-4 text-sm">
        <p className="font-semibold">How the letters are made</p>
        <p className="text-muted">
          Each source&apos;s letter becomes a number — S and S+ = 4, A = 3, B = 2, C = 1,
          D = 0 — and the comp&apos;s score is the mean across every list that mentions
          it. A comp needs at least two sources to be rated at all. Bands are cuts on
          that score: S ≥ 3.5, A ≥ 2.5, B ≥ 1.5, C below.
        </p>
        <p className="text-muted">
          Sources averaged: TFT Academy, TFTactics, EmblemComp, MetaTFT, SeeMeta, Blitz,
          tft.ninja, MID.GG, Mobalytics and TFT Flow. Where two sites publish the same
          board under different names, the letters are pooled under the board, and the
          published name travels with the letter.
        </p>
        <p className="text-muted">
          Entries whose boards cannot be mapped to a unit list with confidence are left
          out rather than guessed at. With no comps published for this set yet, these are
          the rules that will apply when the first boards arrive.
        </p>
      </div>

      {TIER_ORDER.map((tier) => {
        const entries = byTier(tier);
        if (entries.length === 0) return null;

        return (
          <section key={tier} className="mt-4 overflow-hidden rounded-xl border border-line">
            <div className="flex">
              <div
                className={classNames(
                  "flex w-16 shrink-0 flex-col items-center justify-center gap-1 sm:w-24",
                  BAND[tier],
                )}
              >
                <span className="text-2xl font-black leading-none sm:text-4xl">{tier}</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] opacity-70">
                  {BAND_LABEL[tier]}
                </span>
              </div>
              <div className="grid flex-1 gap-2 bg-surface p-2.5 sm:grid-cols-2">
                {entries.map((comp) => (
                  <ConsensusCard key={comp.slug} comp={comp} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {comps.length === 0 ? (
        <div className="mt-6">
          <DataNote>
            No Set {site.setNumber} comps are published yet. The meta stays open: comps
            appear here once the crawler has Set 19 boards to classify, and the Set 19
            roster is on the{" "}
            <Link href="/set-19" className="text-accent hover:underline">
              reference pages
            </Link>
            . Nothing is copied over from Set 18.
          </DataNote>
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        <DataNote>{METHODOLOGY.assignment}</DataNote>
        <DataNote>{METHODOLOGY.confidence}</DataNote>
        <DataNote>
          The tier is consensus, but the numbers under each card are ours: they come from
          boards in our own crawl once a comp has enough of them, and a comp without a
          sample says so instead of borrowing someone else&apos;s figure.
        </DataNote>
      </div>
    </>
  );
}

export default async function CompsPage() {
  const comps = await listComps();

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
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Meta</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {comps.length === 0
            ? `No Set ${site.setNumber} comps are published yet. The tier list is open and will fill once the crawler has boards to classify — it is not being seeded with Set 18 boards.`
            : `${comps.length} comps, each lettered by the average of the published tier lists that cover it. Every site's verdict is printed next to the score, because an average you cannot audit is just an opinion with decimals.`}
        </p>
      </header>

      <CompViewTabs active="board" />

      <BoardView comps={comps} />

      {comps.length > 0 ? (
        <p className="mt-6 text-sm text-muted">
          Every comp here has a full guide — preconditions, the leave signal, and where the
          guide is wrong.{" "}
          <Link
            href={`/meta/${comps[0]?.slug ?? ""}`}
            className="font-semibold text-accent hover:underline"
          >
            Start with the top one
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
