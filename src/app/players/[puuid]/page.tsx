import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetImage } from "@/components/asset-image";
import { DataNote } from "@/components/data-note";
import { site } from "@/content/site";
import { formatDate, formatPercent, formatPlace } from "@/lib/format";
import { getPlayerPage, type PlayerMatch } from "@/lib/players";

// Rows are crawled, so a fresh match should appear without a redeploy.
export const revalidate = 300;

type Params = Promise<{ puuid: string }>;

/**
 * Ladder entries are written by `crawl -- seed`, so the tier and LP here are a
 * snapshot of when that last ran — never presented as live.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { puuid } = await params;
  const page = await getPlayerPage(puuid, 1);
  const label = page.kind === "ok" ? `${page.player.region} ${page.player.tier}` : "Player";

  return {
    title: `${label} — ${shortPuuid(puuid)}`,
    description: `Crawled ranked TFT matches and placements for one tracked player on ${site.name}.`,
    alternates: { canonical: `/players/${puuid}` },
    // A PUUID is a Riot identifier, not something anyone searches for. Keep these
    // out of the index; the aggregate pages are what should rank.
    robots: { index: false, follow: true },
  };
}

function shortPuuid(puuid: string): string {
  return puuid.length > 16 ? `${puuid.slice(0, 8)}…${puuid.slice(-4)}` : puuid;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="stat-value mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function placementClass(placement: number): string {
  if (placement <= 4) return "text-accent";
  if (placement <= 6) return "text-fg/70";
  return "text-bad";
}

function MatchRow({ match }: { match: PlayerMatch }) {
  return (
    <li className="card p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`stat-value text-base font-semibold ${placementClass(match.placement)}`}>
          #{match.placement}
        </span>
        <span className="text-xs text-muted">
          {match.playedAt ? formatDate(match.playedAt) : "date unknown"}
        </span>
        <span className="chip">Patch {match.patch}</span>
        {match.level !== null ? <span className="text-xs text-muted">level {match.level}</span> : null}
        {match.lastRound !== null ? (
          <span className="text-xs text-muted">round {match.lastRound}</span>
        ) : null}
        {match.goldLeft !== null ? (
          <span className="text-xs text-muted">{match.goldLeft} gold left</span>
        ) : null}
        <span className="ml-auto text-[11px] text-muted/80">{match.region}</span>
      </div>

      {match.units.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {match.units.map((unit) => (
            <li
              key={`${match.matchId}-${unit.id}`}
              title={unit.name ?? unit.id}
              className="relative h-7 w-7 overflow-hidden rounded border border-line bg-surface"
            >
              <AssetImage
                src={unit.imageUrl}
                width={28}
                height={28}
                className="h-7 w-7"
                fallback={
                  <span className="flex h-7 w-7 items-center justify-center text-[9px] text-muted">
                    {unit.id.slice(-4)}
                  </span>
                }
              />
              {unit.star > 1 ? (
                <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-0.5 text-[9px] leading-tight text-white">
                  {unit.star}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          No board stored for this match (the normaliser keeps units only when the payload
          carries them).
        </p>
      )}
    </li>
  );
}

export default async function PlayerPage({ params }: { params: Params }) {
  const { puuid } = await params;
  const page = await getPlayerPage(puuid);

  if (page.kind === "missing") notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">Player</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Player</p>
        <h1 className="mt-2 break-all font-mono text-lg font-semibold sm:text-xl">
          {shortPuuid(puuid)}
        </h1>
        <p className="mt-1 text-[11px] text-muted">
          <span className="text-fg/70">PUUID</span> {puuid}
        </p>

        {page.kind === "ok" ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">{page.player.region}</span>
            <span className="chip">{page.player.tier}</span>
            <span className="chip">{page.player.lp} LP</span>
            {page.player.lastSeenAt ? (
              <span className="chip">seen {formatDate(page.player.lastSeenAt)}</span>
            ) : null}
          </div>
        ) : null}
      </header>

      {page.kind === "unavailable" ? (
        <div className="mt-6">
          <DataNote>
            No crawl data is attached here. This page reads the crawler&apos;s Postgres, and
            nothing is connected to it in this environment — so there are no matches to show.
            Run the crawler against a database, or open this page where{" "}
            <code className="text-fg/70">DATABASE_URL</code> is set, and the placements below
            fill in. Nothing is guessed in the meantime.
          </DataNote>
        </div>
      ) : (
        <>
          <section className="mt-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat label="Games" value={String(page.summary.games)} />
              <Stat label="Avg place" value={formatPlace(page.summary.avgPlace)} />
              <Stat label="Top 4" value={formatPercent(page.summary.top4Rate, 0)} />
              <Stat label="Wins" value={String(page.summary.wins)} />
              <Stat label="Best" value={`#${page.summary.bestPlace}`} />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Over every crawled match this PUUID appears in, not just the ones listed.
              Region and tier come from the last ladder seed, so they are a snapshot, not live.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">Recent matches</h2>
            <p className="mt-1 text-xs text-muted">
              Newest first. Placement is what the match payload recorded; the board is the one
              that player finished on, with star level from the same payload.
            </p>

            {page.matches.length === 0 ? (
              <div className="mt-3">
                <DataNote>
                  This player is on a ladder we track but has no crawled matches yet. The next
                  discovery pass will queue their recent games.
                </DataNote>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {page.matches.map((match) => (
                  <MatchRow key={match.matchId} match={match} />
                ))}
              </ul>
            )}
          </section>

          <p className="mt-8 text-[11px] leading-relaxed text-muted">
            Matches are discovered from this player&apos;s own match history and fetched once
            each — every board in a lobby comes from the same payload, which is why this page
            can show what the other seven players did without a second request.
          </p>
        </>
      )}
    </div>
  );
}
